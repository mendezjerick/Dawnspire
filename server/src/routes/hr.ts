import type { FastifyPluginAsync } from 'fastify';
import { audit, requireRole } from '../auth.ts';
import type { Ctx } from '../app.ts';
import { grid } from '../time/service.ts';
import { manilaDate, manilaTime } from '../time/rules.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const iso = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);

// HR: correct attendance (every change is logged), export it, and read the inbox.
export const hrRoutes = ({ db, now }: Ctx): FastifyPluginAsync => async app => {
  app.addHook('preHandler', requireRole('hr'));

  // Add a missing bar for a member.
  app.post<{ Body: { userId?: unknown; kind?: unknown; startAt?: unknown; endAt?: unknown } }>('/entries', async (req, reply) => {
    const userId = Number(req.body?.userId);
    const kind = req.body?.kind === 'overtime' ? 'overtime' : req.body?.kind === 'regular' ? 'regular' : null;
    const start = iso(req.body?.startAt), end = iso(req.body?.endAt);
    if (!userId || !kind || !start || !end || end <= start) return reply.code(400).send({ error: 'Choose a member, a type, and a start before the end.' });
    if (end.getTime() > manilaTime(manilaDate(start), 24).getTime()) return reply.code(400).send({ error: 'A bar must start and end on the same Manila day.' });
    const r = await db.insertInto('time_entries').values({ user_id: userId, kind, start_at: start.toISOString(), end_at: end.toISOString(), ended_by: 'hr', manila_date: manilaDate(start) }).returning('id').executeTakeFirstOrThrow();
    await audit(db, req.user!.id, 'time.entry-added', String(userId), { id: r.id, kind, start: start.toISOString(), end: end.toISOString() });
    return reply.code(201).send({ id: r.id });
  });

  // Correct a bar's start or end.
  app.patch<{ Params: { id: string }; Body: { startAt?: unknown; endAt?: unknown } }>('/entries/:id', async (req, reply) => {
    const row = await db.selectFrom('time_entries').selectAll().where('id', '=', Number(req.params.id)).executeTakeFirst();
    if (!row) return reply.code(404).send({ error: 'Entry not found.' });
    const start = req.body?.startAt !== undefined ? iso(req.body.startAt) : new Date(row.start_at);
    const end = req.body?.endAt !== undefined ? iso(req.body.endAt) : row.end_at ? new Date(row.end_at) : null;
    if (!start || (req.body?.endAt !== undefined && !end) || (end && end <= start)) return reply.code(400).send({ error: 'The start must be before the end.' });
    if (manilaDate(start) !== row.manila_date) return reply.code(400).send({ error: 'Keep the bar on its original day.' });
    await db.updateTable('time_entries').set({ start_at: start.toISOString(), end_at: end?.toISOString() ?? null, ended_by: end ? 'hr' : row.ended_by }).where('id', '=', row.id).execute();
    await audit(db, req.user!.id, 'time.entry-corrected', String(row.user_id), { id: row.id, from: { start: row.start_at, end: row.end_at }, to: { start: start.toISOString(), end: end?.toISOString() ?? null } });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/entries/:id', async (req, reply) => {
    const row = await db.selectFrom('time_entries').selectAll().where('id', '=', Number(req.params.id)).executeTakeFirst();
    if (!row) return reply.code(404).send({ error: 'Entry not found.' });
    await db.deleteFrom('time_entries').where('id', '=', row.id).execute();
    await audit(db, req.user!.id, 'time.entry-removed', String(row.user_id), row);
    return { ok: true };
  });

  // Set or clear a member's whole-day status for any date.
  app.put<{ Body: { userId?: unknown; date?: unknown; status?: unknown } }>('/status', async (req, reply) => {
    const userId = Number(req.body?.userId);
    const date = typeof req.body?.date === 'string' && DATE.test(req.body.date) ? req.body.date : null;
    const status = req.body?.status;
    if (!userId || !date || (status !== null && status !== 'unavailable' && status !== 'sick')) return reply.code(400).send({ error: 'Choose a member, a date, and a status.' });
    if (status === null) await db.deleteFrom('day_statuses').where('user_id', '=', userId).where('manila_date', '=', date).execute();
    else await db.insertInto('day_statuses').values({ user_id: userId, manila_date: date, status, set_at: new Date().toISOString() })
      .onConflict(oc => oc.columns(['user_id', 'manila_date']).doUpdateSet({ status })).execute();
    await audit(db, req.user!.id, 'time.status-set', String(userId), { date, status });
    return { ok: true };
  });

  // CSV export of a date range: one row per member per day.
  app.get<{ Querystring: { from?: string; to?: string } }>('/export.csv', async (req, reply) => {
    const { from, to } = req.query;
    if (!from || !to || !DATE.test(from) || !DATE.test(to) || from > to) return reply.code(400).send({ error: 'Give from and to as YYYY-MM-DD.' });
    const g = await grid(db, now(), from, to, () => true);
    const h = (ms: number) => (ms / 3_600_000).toFixed(2);
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines = ['member,date,status,regular_hours,overtime_hours,flags'];
    for (const p of g.people) for (const d of p.days) lines.push([esc(p.name), d.date, d.status ?? '', h(d.regularMs), h(d.overtimeMs), d.flags.join(' ')].join(','));
    reply.header('Content-Disposition', `attachment; filename="attendance-${from}-to-${to}.csv"`).type('text/csv; charset=utf-8');
    return lines.join('\n') + '\n';
  });

  // Inbox: exists now; nothing feeds it yet (the public contact form still opens the visitor's email app).
  app.get('/inbox', async () => {
    const rows = await db.selectFrom('inquiries').selectAll().orderBy('received_at', 'desc').limit(200).execute();
    return { inquiries: rows, connected: false };
  });

  app.get('/log', async () => {
    const rows = await db.selectFrom('audit_log').leftJoin('users', 'users.id', 'audit_log.actor_id')
      .select(['audit_log.id', 'audit_log.action', 'audit_log.target', 'audit_log.detail', 'audit_log.at', 'users.display_name as actor'])
      .where('audit_log.action', 'like', 'time.%').orderBy('audit_log.at', 'desc').limit(200).execute();
    return { entries: rows };
  });
};
