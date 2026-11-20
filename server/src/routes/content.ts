import type { FastifyPluginAsync } from 'fastify';
import { audit, requireRole } from '../auth.ts';
import type { Ctx } from '../app.ts';
import { config } from '../config.ts';

export const SECTIONS = ['projects', 'media', 'timeline', 'personnel'] as const;
export type Section = (typeof SECTIONS)[number];
const isSection = (s: string): s is Section => (SECTIONS as readonly string[]).includes(s);
const MAX_JSON = 400_000;

// Admin edits drafts and publishes them; the public site reads only what is published.
export const contentRoutes = ({ db }: Ctx): FastifyPluginAsync => async app => {
  app.get('/public/content', async (req, reply) => {
    const origin = req.headers.origin;
    if (origin && config.publicOrigins.includes(origin)) reply.header('Access-Control-Allow-Origin', origin).header('Vary', 'Origin');
    reply.header('Cache-Control', 'public, max-age=30');
    const rows = await db.selectFrom('content').select(['section', 'published', 'published_at']).where('published_at', 'is not', null).execute();
    return { sections: Object.fromEntries(rows.map(r => [r.section, JSON.parse(r.published)])) };
  });

  app.get('/admin/content', { preHandler: requireRole('admin') }, async () => {
    const rows = await db.selectFrom('content').selectAll().execute();
    return {
      sections: Object.fromEntries(rows.map(r => [r.section, {
        draft: JSON.parse(r.draft), published: JSON.parse(r.published),
        draftUpdatedAt: r.draft_updated_at, publishedAt: r.published_at, hasUnpublished: r.draft !== r.published,
      }])),
    };
  });

  app.put<{ Params: { section: string }; Body: { data?: unknown } }>('/admin/content/:section', { preHandler: requireRole('admin') }, async (req, reply) => {
    const { section } = req.params;
    if (!isSection(section)) return reply.code(404).send({ error: 'Unknown section.' });
    if (!Array.isArray(req.body?.data)) return reply.code(400).send({ error: 'Section data must be a list.' });
    const json = JSON.stringify(req.body.data);
    if (json.length > MAX_JSON) return reply.code(413).send({ error: 'This section is too large to save.' });
    const at = new Date().toISOString();
    await db.insertInto('content').values({ section, draft: json, published: '[]', draft_updated_at: at, published_at: null, updated_by: req.user!.id })
      .onConflict(oc => oc.column('section').doUpdateSet({ draft: json, draft_updated_at: at, updated_by: req.user!.id })).execute();
    return { ok: true, draftUpdatedAt: at };
  });

  app.post<{ Params: { section: string } }>('/admin/content/:section/publish', { preHandler: requireRole('admin') }, async (req, reply) => {
    const { section } = req.params;
    const row = isSection(section) ? await db.selectFrom('content').selectAll().where('section', '=', section).executeTakeFirst() : undefined;
    if (!row) return reply.code(404).send({ error: 'Nothing to publish.' });
    const at = new Date().toISOString();
    await db.updateTable('content').set({ published: row.draft, published_at: at }).where('section', '=', section).execute();
    await audit(db, req.user!.id, 'content.published', section);
    return { ok: true, publishedAt: at };
  });

  app.post<{ Params: { section: string } }>('/admin/content/:section/discard', { preHandler: requireRole('admin') }, async (req, reply) => {
    const { section } = req.params;
    const row = isSection(section) ? await db.selectFrom('content').selectAll().where('section', '=', section).executeTakeFirst() : undefined;
    if (!row) return reply.code(404).send({ error: 'Nothing to discard.' });
    await db.updateTable('content').set({ draft: row.published, draft_updated_at: new Date().toISOString() }).where('section', '=', section).execute();
    return { ok: true };
  });
};
