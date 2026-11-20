import type { FastifyPluginAsync } from 'fastify';
import { audit, hashPassword, normalizeUsername, requireRole, validatePassword } from '../auth.ts';
import type { Ctx } from '../app.ts';
import type { Role } from '../db/index.ts';

type CreateBody = { username?: unknown; displayName?: unknown; password?: unknown };
type PatchBody = { displayName?: unknown; active?: unknown; password?: unknown };

const cleanName = (v: unknown) => (typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 80 ? v.trim() : null);

// Admin manages HR accounts; HR manages member accounts. Same rules, different role.
export const peopleRoutes = ({ db }: Ctx): FastifyPluginAsync => async app => {
  const scopes: Array<{ path: string; manager: Role; role: Role; noun: string }> = [
    { path: '/admin/hr', manager: 'admin', role: 'hr', noun: 'HR account' },
    { path: '/hr/members', manager: 'hr', role: 'member', noun: 'Member' },
  ];

  for (const { path, manager, role, noun } of scopes) {
    app.get(path, { preHandler: requireRole(manager) }, async () => {
      const rows = await db.selectFrom('users')
        .select(['id', 'username', 'display_name', 'active', 'must_change_password', 'created_at'])
        .where('role', '=', role).orderBy('active', 'desc').orderBy('display_name').execute();
      return { people: rows.map(r => ({ id: r.id, username: r.username, displayName: r.display_name, active: !!r.active, mustChangePassword: !!r.must_change_password, createdAt: r.created_at })) };
    });

    app.post<{ Body: CreateBody }>(path, { preHandler: requireRole(manager) }, async (req, reply) => {
      const username = normalizeUsername(req.body?.username);
      if (!username) return reply.code(400).send({ error: 'Username must be 3–32 characters: letters, numbers, dot, dash or underscore.' });
      const displayName = cleanName(req.body?.displayName);
      if (!displayName) return reply.code(400).send({ error: 'Enter a name (2–80 characters).' });
      const problem = validatePassword(req.body?.password);
      if (problem) return reply.code(400).send({ error: problem });
      const taken = await db.selectFrom('users').select('id').where('username', '=', username).executeTakeFirst();
      if (taken) return reply.code(409).send({ error: `The username “${username}” is already taken.` });
      const created = await db.insertInto('users').values({
        username, display_name: displayName, role, password_hash: await hashPassword(String(req.body!.password)),
        must_change_password: 1, active: 1, created_at: new Date().toISOString(), created_by: req.user!.id,
      }).returning('id').executeTakeFirstOrThrow();
      await audit(db, req.user!.id, `${role}.created`, username);
      return reply.code(201).send({ id: created.id, message: `${noun} created. Share the username and temporary password; they'll choose a new password on first sign-in.` });
    });

    app.patch<{ Params: { id: string }; Body: PatchBody }>(`${path}/:id`, { preHandler: requireRole(manager) }, async (req, reply) => {
      const id = Number(req.params.id);
      const target = await db.selectFrom('users').select(['id', 'username', 'role']).where('id', '=', id).executeTakeFirst();
      if (!target || target.role !== role) return reply.code(404).send({ error: `${noun} not found.` });
      const changes: Record<string, unknown> = {};
      if (req.body?.displayName !== undefined) {
        const n = cleanName(req.body.displayName);
        if (!n) return reply.code(400).send({ error: 'Enter a name (2–80 characters).' });
        changes.display_name = n;
      }
      if (req.body?.active !== undefined) changes.active = req.body.active ? 1 : 0;
      if (req.body?.password !== undefined) {
        const problem = validatePassword(req.body.password);
        if (problem) return reply.code(400).send({ error: problem });
        changes.password_hash = await hashPassword(String(req.body.password));
        changes.must_change_password = 1;
      }
      if (!Object.keys(changes).length) return reply.code(400).send({ error: 'Nothing to change.' });
      await db.updateTable('users').set(changes).where('id', '=', id).execute();
      // A reset password or deactivation signs the account out everywhere.
      if ('password_hash' in changes || changes.active === 0) await db.deleteFrom('sessions').where('user_id', '=', id).execute();
      await audit(db, req.user!.id, `${role}.updated`, target.username, { fields: Object.keys(changes).filter(k => k !== 'password_hash').concat('password_hash' in changes ? ['password-reset'] : []) });
      return { ok: true };
    });
  }
};
