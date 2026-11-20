// Attendance rules for Base. Pure functions: no database, no clock reads.
//
// All rules run on Manila wall time (Asia/Manila, UTC+8, no daylight saving).
// Regular hours: Monday to Friday, 08:00-12:00 and 13:00-17:00 (8 hours).
// A regular bar ends at 17:00 at the latest. Overtime can only start at or after
// 17:00 on a weekday (any time on Saturday/Sunday) and ends at midnight at the latest.

export const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type EntryKind = 'regular' | 'overtime';
export type DayStatus = 'unavailable' | 'sick';

/** Manila calendar date (YYYY-MM-DD) for an instant. */
export function manilaDate(at: Date): string {
  return new Date(at.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant of Manila midnight that starts the given Manila date. */
export function manilaDayStart(date: string): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) - MANILA_OFFSET_MS);
}

/** UTC instant for HH:MM Manila time on a Manila date. Hour 24 means the following midnight. */
export function manilaTime(date: string, hour: number, minute = 0): Date {
  return new Date(manilaDayStart(date).getTime() + hour * HOUR + minute * 60_000);
}

/** 0 = Sunday ... 6 = Saturday, for a Manila date. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isWorkday(date: string): boolean {
  const d = weekday(date);
  return d >= 1 && d <= 5;
}

/** Minutes since Manila midnight for an instant. */
export function manilaMinutes(at: Date): number {
  return Math.floor(((at.getTime() + MANILA_OFFSET_MS) % DAY) / 60_000);
}

/** Monday (Manila date) of the week containing the date. */
export function weekStart(date: string): string {
  const d = weekday(date);
  const back = d === 0 ? 6 : d - 1;
  return addDays(date, -back);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/** Latest instant a bar of this kind, started on this Manila date, may run to. */
export function cutoff(kind: EntryKind, date: string): Date {
  return kind === 'regular' ? manilaTime(date, 17) : manilaTime(date, 24);
}

/** Paid windows for a kind on a Manila date, as [start, end] instants. */
export function paidWindows(kind: EntryKind, date: string): Array<[Date, Date]> {
  if (kind === 'regular') {
    if (!isWorkday(date)) return [];
    return [
      [manilaTime(date, 8), manilaTime(date, 12)],
      [manilaTime(date, 13), manilaTime(date, 17)],
    ];
  }
  return isWorkday(date) ? [[manilaTime(date, 17), manilaTime(date, 24)]] : [[manilaTime(date, 0), manilaTime(date, 24)]];
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/** The instant a bar effectively ends: its recorded end, else its automatic cutoff, else now. */
export function effectiveEnd(entry: { kind: EntryKind; startAt: Date; endAt: Date | null }, now: Date): Date {
  const date = manilaDate(entry.startAt);
  const limit = cutoff(entry.kind, date).getTime();
  const end = entry.endAt ? entry.endAt.getTime() : Math.min(now.getTime(), limit);
  return new Date(Math.min(end, limit));
}

/** Counted milliseconds for one bar, clipped to its paid windows (lunch never counts). */
export function countedMs(entry: { kind: EntryKind; startAt: Date; endAt: Date | null }, now: Date): number {
  const date = manilaDate(entry.startAt);
  const s = entry.startAt.getTime();
  const e = effectiveEnd(entry, now).getTime();
  if (e <= s) return 0;
  return paidWindows(entry.kind, date).reduce((sum, [w0, w1]) => sum + overlap(s, e, w0.getTime(), w1.getTime()), 0);
}

/** Whether a bar has passed its automatic cutoff without a recorded end. */
export function isAutoClosed(entry: { kind: EntryKind; startAt: Date; endAt: Date | null }, now: Date): boolean {
  return entry.endAt === null && now.getTime() >= cutoff(entry.kind, manilaDate(entry.startAt)).getTime();
}

export type ActionCheck = { ok: true } | { ok: false; reason: string };

/** Can a member start a regular bar right now? */
export function canTimeIn(now: Date, ctx: { hasOpenBar: boolean; status: DayStatus | null }): ActionCheck {
  const date = manilaDate(now);
  if (ctx.status) return { ok: false, reason: `You're marked ${ctx.status} today.` };
  if (ctx.hasOpenBar) return { ok: false, reason: "You're already timed in." };
  if (!isWorkday(date)) return { ok: false, reason: 'Regular hours are Monday to Friday. Use Overtime on weekends.' };
  if (now.getTime() >= manilaTime(date, 17).getTime()) return { ok: false, reason: 'Regular hours end at 5:00 PM. Use Overtime.' };
  return { ok: true };
}

/** Can a member start an overtime bar right now? Only from 5:00 PM on weekdays; any time on weekends. */
export function canStartOvertime(now: Date, ctx: { hasOpenBar: boolean; status: DayStatus | null }): ActionCheck {
  const date = manilaDate(now);
  if (ctx.status) return { ok: false, reason: `You're marked ${ctx.status} today.` };
  if (ctx.hasOpenBar) return { ok: false, reason: "You're already timed in." };
  if (isWorkday(date) && now.getTime() < manilaTime(date, 17).getTime()) return { ok: false, reason: 'Overtime is available from 5:00 PM.' };
  return { ok: true };
}

/** Whether the overtime button should be enabled at this instant (ignores open bars). */
export function overtimeOpen(now: Date): boolean {
  const date = manilaDate(now);
  return !isWorkday(date) || now.getTime() >= manilaTime(date, 17).getTime();
}

export type DaySummary = { date: string; regularMs: number; overtimeMs: number; status: DayStatus | null; flags: string[] };

/** Totals for one member on one Manila date. */
export function summarizeDay(
  date: string,
  entries: Array<{ kind: EntryKind; startAt: Date; endAt: Date | null; endedBy?: string | null }>,
  status: DayStatus | null,
  now: Date,
): DaySummary {
  let regularMs = 0;
  let overtimeMs = 0;
  const flags: string[] = [];
  for (const e of entries) {
    if (manilaDate(e.startAt) !== date) continue;
    const ms = countedMs(e, now);
    if (e.kind === 'regular') regularMs += ms;
    else overtimeMs += ms;
    // Flag forgotten overtime whether it is still open past midnight or was already closed automatically.
    if (e.kind === 'overtime' && (isAutoClosed(e, now) || e.endedBy === 'auto')) flags.push('overtime-no-time-out');
  }
  return { date, regularMs, overtimeMs, status, flags: [...new Set(flags)] };
}
