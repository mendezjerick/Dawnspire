import type { FastifyPluginAsync } from 'fastify';
import {
  SESSION_COOKIE, audit, checkPassword, clearLoginFailures, createSession, destroySession, hashPassword,
  loginBlockedFor, normalizeUsername, recordLoginFailure, setSessionCookie, validatePassword,
} from '../auth.ts';
import type { Ctx } from '../app.ts';

export const authRoutes = ({ db }: Ctx): FastifyPluginAsync => async app => {
  app.post<{ Body: { username?: unknown; password?: unknown } }>('/login', async (req, reply) => {
    const username = normalizeUsername(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const keys = [`u:${username ?? ''}`, `ip:${req.ip}`];
    const wait = loginBlockedFor(keys);
    if (wait > 0) return reply.code(429).send({ error: `Too many attempts. Try again in ${Math.ceil(wait / 1000)} seconds.`, retryAfterMs: wait });
    const user = username ? await db.selectFrom('users').selectAll().where('username', '=', username).executeTakeFirst() : undefined;
    const ok = !!user && user.active === 1 && (await checkPassword(password, user.password_hash));
    if (!ok) {
      recordLoginFailure(keys);
      return reply.code(401).send({ error: 'Username or password is incorrect.' });
    }
    clearLoginFailures(keys);
    const { token, expires } = await createSession(db, user!.id);
    setSessionCookie(reply, token, expires);
    await audit(db, user!.id, 'auth.login', null);
    return { user: { id: user!.id, username: user!.username, displayName: user!.display_name, role: user!.role, mustChangePassword: !!user!.must_change_password } };
  });

  app.post('/logout', async (req, reply) => {
    await destroySession(db, req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/me', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Not signed in.' });
    return { user: req.user };
  });

  // Every signed-in account changes its own password here, including the first change after a temporary one.
  app.post<{ Body: { current?: unknown; next?: unknown } }>('/password', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Sign in to continue.' });
    const problem = validatePassword(req.body?.next);
    if (problem) return reply.code(400).send({ error: problem });
    const row = await db.selectFrom('users').select('password_hash').where('id', '=', req.user.id).executeTakeFirstOrThrow();
    if (!(await checkPassword(String(req.body?.current ?? ''), row.password_hash))) return reply.code(400).send({ error: 'Current password is incorrect.' });
    if (req.body!.current === req.body!.next) return reply.code(400).send({ error: 'Choose a password different from the current one.' });
    await db.updateTable('users').set({ password_hash: await hashPassword(String(req.body!.next)), must_change_password: 0 }).where('id', '=', req.user.id).execute();
    // Sign out other devices; keep this session.
    const keep = req.cookies[SESSION_COOKIE];
    const all = await db.selectFrom('sessions').select('token_hash').where('user_id', '=', req.user.id).execute();
    const { createHash } = await import('node:crypto');
    const keepHash = keep ? createHash('sha256').update(keep).digest('hex') : '';
    for (const s of all) if (s.token_hash !== keepHash) await db.deleteFrom('sessions').where('token_hash', '=', s.token_hash).execute();
    await audit(db, req.user.id, 'auth.password-changed', null);
    return { ok: true };
  });
};
