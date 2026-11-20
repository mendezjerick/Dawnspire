import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Kysely } from 'kysely';
import { config } from './config.ts';
import type { DB, Role } from './db/index.ts';

export const SESSION_COOKIE = 'base_session';
const BCRYPT_COST = 12;

export type SessionUser = { id: number; username: string; displayName: string; role: Role; mustChangePassword: boolean };

declare module 'fastify' {
  interface FastifyRequest { user: SessionUser | null }
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_COST);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== 'string' || pw.length < config.minPasswordLength) return `Password must be at least ${config.minPasswordLength} characters.`;
  if (pw.length > 200) return 'Password is too long.';
  return null;
}

export function normalizeUsername(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  const v = u.trim().toLowerCase();
  return /^[a-z0-9._-]{3,32}$/.test(v) ? v : null;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function createSession(db: Kysely<DB>, userId: number): Promise<{ token: string; expires: Date }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + config.sessionDays * 86_400_000);
  await db.insertInto('sessions').values({ token_hash: sha256(token), user_id: userId, created_at: new Date().toISOString(), expires_at: expires.toISOString() }).execute();
  return { token, expires };
}

export async function destroySession(db: Kysely<DB>, token: string | undefined) {
  if (token) await db.deleteFrom('sessions').where('token_hash', '=', sha256(token)).execute();
}

export async function loadSessionUser(db: Kysely<DB>, token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const row = await db.selectFrom('sessions')
    .innerJoin('users', 'users.id', 'sessions.user_id')
    .select(['users.id', 'users.username', 'users.display_name', 'users.role', 'users.must_change_password', 'users.active', 'sessions.expires_at'])
    .where('sessions.token_hash', '=', sha256(token))
    .executeTakeFirst();
  if (!row || !row.active || Date.parse(row.expires_at) < Date.now()) return null;
  return { id: row.id, username: row.username, displayName: row.display_name, role: row.role, mustChangePassword: !!row.must_change_password };
}

export function setSessionCookie(reply: FastifyReply, token: string, expires: Date) {
  reply.setCookie(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure: config.secureCookies, expires });
}

/**
 * Throttle repeated failures. No CAPTCHA: just a growing wait.
 * Per account: 5 free tries. Per IP: 25, because a whole office can share one IP
 * and one person's typos must not lock out the team.
 */
const failures = new Map<string, { count: number; until: number }>();
const freeTries = (key: string) => (key.startsWith('ip:') ? 25 : 5);

export function loginBlockedFor(keys: string[]): number {
  const now = Date.now();
  return Math.max(0, ...keys.map(k => (failures.get(k)?.until ?? 0) - now));
}
export function recordLoginFailure(keys: string[]) {
  for (const k of keys) {
    const f = failures.get(k) ?? { count: 0, until: 0 };
    f.count += 1;
    const free = freeTries(k);
    if (f.count >= free) f.until = Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (f.count - free));
    failures.set(k, f);
  }
}
/** A successful sign-in clears that account's count, not the shared IP's. */
export function clearLoginFailures(keys: string[]) { for (const k of keys) if (!k.startsWith('ip:')) failures.delete(k); }
export function resetLoginThrottle() { failures.clear(); }

/** Route guard: require a signed-in user with one of the roles. Members must change a temporary password first. */
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: 'Sign in to continue.' });
    if (!roles.includes(req.user.role)) return reply.code(403).send({ error: 'You do not have access to this.' });
    if (req.user.mustChangePassword) return reply.code(403).send({ error: 'Change your temporary password first.', code: 'must-change-password' });
  };
}

export async function audit(db: Kysely<DB>, actorId: number | null, action: string, target: string | null, detail?: unknown) {
  await db.insertInto('audit_log').values({ actor_id: actorId, action, target, detail: detail === undefined ? null : JSON.stringify(detail), at: new Date().toISOString() }).execute();
}
