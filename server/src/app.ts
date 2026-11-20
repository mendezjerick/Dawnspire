import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import type { Kysely } from 'kysely';
import { SESSION_COOKIE, loadSessionUser } from './auth.ts';
import type { DB } from './db/index.ts';
import { authRoutes } from './routes/auth.ts';
import { timeRoutes } from './routes/time.ts';
import { peopleRoutes } from './routes/people.ts';
import { hrRoutes } from './routes/hr.ts';
import { contentRoutes } from './routes/content.ts';
import { uploadRoutes } from './routes/uploads.ts';

export type AppOptions = { db: Kysely<DB>; now?: () => Date; logger?: boolean };
export type Ctx = { db: Kysely<DB>; now: () => Date };

export async function buildApp({ db, now = () => new Date(), logger = false }: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger, bodyLimit: 1_000_000, trustProxy: true });
  await app.register(cookie);
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req, reply) => {
    req.user = await loadSessionUser(db, req.cookies[SESSION_COOKIE]);
    reply.header('X-Robots-Tag', 'noindex, nofollow'); // Base is never indexed
    if (!req.url.startsWith('/uploads/')) reply.header('Cache-Control', 'no-store');
  });
  app.get('/robots.txt', async (_req, reply) => reply.type('text/plain').send('User-agent: *\nDisallow: /\n'));
  const ctx: Ctx = { db, now };
  await app.register(authRoutes(ctx), { prefix: '/api/auth' });
  await app.register(timeRoutes(ctx), { prefix: '/api/time' });
  await app.register(peopleRoutes(ctx), { prefix: '/api' });
  await app.register(hrRoutes(ctx), { prefix: '/api/hr' });
  await app.register(contentRoutes(ctx), { prefix: '/api' });
  await app.register(uploadRoutes(ctx));
  app.setErrorHandler((err: { statusCode?: number; message?: string }, _req, reply) => {
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 500) app.log.error(err);
    reply.code(status).send({ error: status === 500 ? 'Something went wrong. Try again.' : err.message });
  });
  return app;
}
