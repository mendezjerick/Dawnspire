import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { requireRole } from '../auth.ts';
import type { Ctx } from '../app.ts';
import { ActionError, board, grid, myToday, setStatus, timeIn, timeOut } from '../time/service.ts';
import { addDays, manilaDate, weekStart } from '../time/rules.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

// Members and HR use Time. The admin account does not.
export const timeRoutes = ({ db, now }: Ctx): FastifyPluginAsync => async app => {
  app.addHook('preHandler', requireRole('member', 'hr'));

  // Run a time action; refused actions return 409 with the reason, success returns the fresh overview state.
  async function run(userId: number, reply: FastifyReply, action: () => Promise<void>) {
    try { await action(); } catch (e) {
      if (e instanceof ActionError) return reply.code(409).send({ error: e.message });
      throw e;
    }
    return myToday(db, userId, now());
  }

  app.get('/today', async req => myToday(db, req.user!.id, now()));
  app.post('/in', (req, reply) => run(req.user!.id, reply, () => timeIn(db, req.user!.id, now(), 'regular')));
  app.post('/overtime', (req, reply) => run(req.user!.id, reply, () => timeIn(db, req.user!.id, now(), 'overtime')));
  app.post('/out', (req, reply) => run(req.user!.id, reply, () => timeOut(db, req.user!.id, now())));
  app.post<{ Body: { status?: unknown } }>('/status', (req, reply) => {
    const s = req.body?.status;
    if (s !== null && s !== 'unavailable' && s !== 'sick') return reply.code(400).send({ error: 'Unknown status.' });
    return run(req.user!.id, reply, () => setStatus(db, req.user!.id, now(), s));
  });

  app.get('/board', async () => ({ now: now().toISOString(), people: await board(db, now()) }));

  // Everyone sees everyone's day status and totals; only your own detailed bars (HR sees all).
  app.get<{ Querystring: { start?: string; month?: string } }>('/grid', async (req, reply) => {
    const today = manilaDate(now());
    let from: string, to: string;
    if (req.query.month) {
      if (!MONTH.test(req.query.month)) return reply.code(400).send({ error: 'Month must be YYYY-MM.' });
      from = `${req.query.month}-01`;
      const [y, m] = req.query.month.split('-').map(Number);
      to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    } else {
      const start = req.query.start && DATE.test(req.query.start) ? weekStart(req.query.start) : weekStart(today);
      from = start; to = addDays(start, 6);
    }
    const me = req.user!;
    return { today, from, to, ...(await grid(db, now(), from, to, id => me.role === 'hr' || id === me.id)) };
  });
};
