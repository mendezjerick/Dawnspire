import type { Kysely, Selectable } from 'kysely';
import type { DB, TimeEntriesTable } from '../db/index.ts';
import {
  addDays, canStartOvertime, canTimeIn, cutoff, manilaDate, overtimeOpen, summarizeDay, weekStart,
  type DayStatus, type EntryKind,
} from './rules.ts';

type Entry = { id: number; userId: number; kind: EntryKind; startAt: Date; endAt: Date | null; endedBy: string | null; date: string };

const toEntry = (r: Selectable<TimeEntriesTable>): Entry => ({
  id: r.id, userId: r.user_id, kind: r.kind, startAt: new Date(r.start_at), endAt: r.end_at ? new Date(r.end_at) : null, endedBy: r.ended_by, date: r.manila_date,
});

/** Persist automatic cutoffs: any open bar past 5:00 PM (regular) or midnight (overtime) is closed at that cutoff. */
export async function closeExpiredBars(db: Kysely<DB>, now: Date) {
  const open = await db.selectFrom('time_entries').selectAll().where('end_at', 'is', null).execute();
  for (const r of open) {
    const limit = cutoff(r.kind, r.manila_date);
    if (now.getTime() >= limit.getTime()) {
      await db.updateTable('time_entries').set({ end_at: limit.toISOString(), ended_by: 'auto' }).where('id', '=', r.id).execute();
    }
  }
}

async function openBar(db: Kysely<DB>, userId: number) {
  const r = await db.selectFrom('time_entries').selectAll().where('user_id', '=', userId).where('end_at', 'is', null).executeTakeFirst();
  return r ? toEntry(r) : null;
}

async function statusOn(db: Kysely<DB>, userId: number, date: string): Promise<DayStatus | null> {
  const r = await db.selectFrom('day_statuses').select('status').where('user_id', '=', userId).where('manila_date', '=', date).executeTakeFirst();
  return (r?.status as DayStatus | undefined) ?? null;
}

export type LiveState = 'in' | 'overtime' | 'out' | 'unavailable' | 'sick' | 'not-in';

/** Everything the overview needs for one member, right now. */
export async function myToday(db: Kysely<DB>, userId: number, now: Date) {
  await closeExpiredBars(db, now);
  const date = manilaDate(now);
  const bar = await openBar(db, userId);
  const status = await statusOn(db, userId, date);
  const rows = await db.selectFrom('time_entries').selectAll().where('user_id', '=', userId).where('manila_date', '=', date).orderBy('start_at').execute();
  const entries = rows.map(toEntry);
  const summary = summarizeDay(date, entries, status, now);
  const ctx = { hasOpenBar: !!bar, status };
  const timeIn = canTimeIn(now, ctx);
  const overtime = canStartOvertime(now, ctx);
  const weekRows = await db.selectFrom('time_entries').selectAll().where('user_id', '=', userId)
    .where('manila_date', '>=', weekStart(date)).where('manila_date', '<=', date).execute();
  const weekMs = weekRows.map(toEntry).reduce((s, e) => {
    const d = summarizeDay(e.date, [e], null, now);
    return { regular: s.regular + d.regularMs, overtime: s.overtime + d.overtimeMs };
  }, { regular: 0, overtime: 0 });
  return {
    now: now.toISOString(),
    date,
    status,
    openBar: bar ? { kind: bar.kind, startAt: bar.startAt.toISOString() } : null,
    entries: entries.map(e => ({ id: e.id, kind: e.kind, startAt: e.startAt.toISOString(), endAt: e.endAt?.toISOString() ?? null, endedBy: e.endedBy })),
    totals: { regularMs: summary.regularMs, overtimeMs: summary.overtimeMs, weekRegularMs: weekMs.regular, weekOvertimeMs: weekMs.overtime },
    actions: {
      timeIn: timeIn.ok ? { enabled: true } : { enabled: false, reason: timeIn.reason },
      timeOut: bar ? { enabled: true } : { enabled: false, reason: "You're not timed in." },
      overtime: overtime.ok ? { enabled: true } : { enabled: false, reason: overtime.reason },
      overtimeOpen: overtimeOpen(now),
    },
  };
}

export class ActionError extends Error {}

export async function timeIn(db: Kysely<DB>, userId: number, now: Date, kind: EntryKind) {
  await closeExpiredBars(db, now);
  const date = manilaDate(now);
  const ctx = { hasOpenBar: !!(await openBar(db, userId)), status: await statusOn(db, userId, date) };
  const check = kind === 'regular' ? canTimeIn(now, ctx) : canStartOvertime(now, ctx);
  if (!check.ok) throw new ActionError(check.reason);
  await db.insertInto('time_entries').values({ user_id: userId, kind, start_at: now.toISOString(), end_at: null, ended_by: null, manila_date: date }).execute();
}

export async function timeOut(db: Kysely<DB>, userId: number, now: Date) {
  await closeExpiredBars(db, now);
  const bar = await openBar(db, userId);
  if (!bar) throw new ActionError("You're not timed in.");
  await db.updateTable('time_entries').set({ end_at: now.toISOString(), ended_by: 'member' }).where('id', '=', bar.id).execute();
}

/** Set or clear today's whole-day status. Setting one closes any open bar. */
export async function setStatus(db: Kysely<DB>, userId: number, now: Date, status: DayStatus | null) {
  await closeExpiredBars(db, now);
  const date = manilaDate(now);
  if (status === null) {
    await db.deleteFrom('day_statuses').where('user_id', '=', userId).where('manila_date', '=', date).execute();
    return;
  }
  const bar = await openBar(db, userId);
  if (bar) await db.updateTable('time_entries').set({ end_at: now.toISOString(), ended_by: 'status' }).where('id', '=', bar.id).execute();
  await db.insertInto('day_statuses').values({ user_id: userId, manila_date: date, status, set_at: now.toISOString() })
    .onConflict(oc => oc.columns(['user_id', 'manila_date']).doUpdateSet({ status, set_at: now.toISOString() })).execute();
}

/** Live board: everyone's state right now. Visible to every signed-in member and HR. */
export async function board(db: Kysely<DB>, now: Date) {
  await closeExpiredBars(db, now);
  const date = manilaDate(now);
  const people = await db.selectFrom('users').select(['id', 'display_name', 'role']).where('active', '=', 1).where('role', 'in', ['member', 'hr']).orderBy('display_name').execute();
  const open = await db.selectFrom('time_entries').selectAll().where('end_at', 'is', null).execute();
  const statuses = await db.selectFrom('day_statuses').selectAll().where('manila_date', '=', date).execute();
  const lastToday = await db.selectFrom('time_entries').selectAll().where('manila_date', '=', date).orderBy('start_at', 'desc').execute();
  return people.map(p => {
    const bar = open.find(o => o.user_id === p.id);
    const st = statuses.find(s => s.user_id === p.id);
    const last = lastToday.find(e => e.user_id === p.id);
    let state: LiveState = 'not-in';
    let since: string | null = null;
    if (st) state = st.status;
    else if (bar) { state = bar.kind === 'overtime' ? 'overtime' : 'in'; since = bar.start_at; }
    else if (last) { state = 'out'; since = last.end_at; }
    return { id: p.id, name: p.display_name, role: p.role, state, since };
  });
}

/** Grid of days for a range: everyone's status and totals; detailed bars only where `detailFor` allows. */
export async function grid(db: Kysely<DB>, now: Date, from: string, to: string, detailFor: (userId: number) => boolean) {
  await closeExpiredBars(db, now);
  const people = await db.selectFrom('users').select(['id', 'display_name', 'role']).where('active', '=', 1).where('role', 'in', ['member', 'hr']).orderBy('display_name').execute();
  const rows = (await db.selectFrom('time_entries').selectAll().where('manila_date', '>=', from).where('manila_date', '<=', to).orderBy('start_at').execute()).map(toEntry);
  const statuses = await db.selectFrom('day_statuses').selectAll().where('manila_date', '>=', from).where('manila_date', '<=', to).execute();
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return {
    days,
    people: people.map(p => ({
      id: p.id,
      name: p.display_name,
      days: days.map(date => {
        const mine = rows.filter(e => e.userId === p.id && e.date === date);
        const status = (statuses.find(s => s.user_id === p.id && s.manila_date === date)?.status as DayStatus | undefined) ?? null;
        const s = summarizeDay(date, mine, status, now);
        return {
          date, status, regularMs: s.regularMs, overtimeMs: s.overtimeMs, flags: s.flags,
          worked: mine.length > 0,
          entries: detailFor(p.id) ? mine.map(e => ({ id: e.id, kind: e.kind, startAt: e.startAt.toISOString(), endAt: e.endAt?.toISOString() ?? null, endedBy: e.endedBy })) : undefined,
        };
      }),
    })),
  };
}
