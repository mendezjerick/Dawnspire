import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { migrate, openDb } from '../src/db/index.ts';
import { hashPassword, resetLoginThrottle } from '../src/auth.ts';
import { manilaTime } from '../src/time/rules.ts';

const FRI = '2026-11-20';
let clock = manilaTime(FRI, 9);

async function setup() {
  const db = openDb(':memory:');
  await migrate(db);
  await db.insertInto('users').values({ username: 'root', display_name: 'Administrator', role: 'admin', password_hash: await hashPassword('admin-pass-1'), must_change_password: 0, active: 1, created_at: new Date().toISOString(), created_by: null }).execute();
  const app = await buildApp({ db, now: () => clock });
  return { app, db };
}

async function login(app: FastifyInstance, username: string, password: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
  const cookie = res.cookies.find(c => c.name === 'base_session');
  return { res, cookie: cookie ? `base_session=${cookie.value}` : '' };
}
const call = (app: FastifyInstance, cookie: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, payload?: object) =>
  app.inject({ method, url, payload, headers: { cookie } });

test('full flow: admin → HR → member, time rules, privacy', async () => {
  const { app } = await setup();
  clock = manilaTime(FRI, 9);

  // Admin creates an HR account; admin cannot use Time.
  const admin = await login(app, 'root', 'admin-pass-1');
  assert.equal(admin.res.statusCode, 200);
  assert.equal((await call(app, admin.cookie, 'GET', '/api/time/today')).statusCode, 403);
  const mkHr = await call(app, admin.cookie, 'POST', '/api/admin/hr', { username: 'hr.ana', displayName: 'Ana HR', password: 'temp-pass-1' });
  assert.equal(mkHr.statusCode, 201);
  assert.equal((await call(app, admin.cookie, 'POST', '/api/admin/hr', { username: 'hr.ana', displayName: 'Dup', password: 'temp-pass-1' })).statusCode, 409);
  assert.equal((await call(app, admin.cookie, 'POST', '/api/admin/hr', { username: 'hr.two', displayName: 'Short', password: 'short' })).statusCode, 400);

  // HR must change the temporary password before doing anything.
  const hr = await login(app, 'hr.ana', 'temp-pass-1');
  assert.equal(hr.res.json().user.mustChangePassword, true);
  assert.equal((await call(app, hr.cookie, 'GET', '/api/hr/members')).json().code, 'must-change-password');
  assert.equal((await call(app, hr.cookie, 'POST', '/api/auth/password', { current: 'temp-pass-1', next: 'hr-own-pass' })).statusCode, 200);

  // HR creates two members; members cannot reach HR or admin routes.
  for (const [u, n] of [['marco', 'Marco Dela Cruz'], ['bea', 'Bea Santos']]) {
    assert.equal((await call(app, hr.cookie, 'POST', '/api/hr/members', { username: u, displayName: n, password: 'welcome-123' })).statusCode, 201);
  }
  let marco = await login(app, 'marco', 'welcome-123');
  await call(app, marco.cookie, 'POST', '/api/auth/password', { current: 'welcome-123', next: 'marco-pass-1' });
  let bea = await login(app, 'bea', 'welcome-123');
  await call(app, bea.cookie, 'POST', '/api/auth/password', { current: 'welcome-123', next: 'bea-pass-12' });
  assert.equal((await call(app, marco.cookie, 'GET', '/api/hr/members')).statusCode, 403);
  assert.equal((await call(app, marco.cookie, 'GET', '/api/admin/content')).statusCode, 403);

  // 07:30 time in counts from 08:00; overtime locked before 17:00.
  clock = manilaTime(FRI, 7, 30);
  let t = (await call(app, marco.cookie, 'POST', '/api/time/in')).json();
  assert.equal(t.openBar.kind, 'regular');
  assert.equal((await call(app, marco.cookie, 'POST', '/api/time/in')).statusCode, 409); // already in
  clock = manilaTime(FRI, 16, 59);
  t = (await call(app, marco.cookie, 'GET', '/api/time/today')).json();
  assert.equal(t.actions.overtime.enabled, false);
  assert.equal(t.totals.regularMs, (7 * 60 + 59) * 60_000); // 8:00-12:00 + 13:00-16:59
  assert.equal((await call(app, marco.cookie, 'POST', '/api/time/overtime')).statusCode, 409);

  // At 17:30 the regular bar has auto-ended at 17:00; overtime is now allowed.
  clock = manilaTime(FRI, 17, 30);
  t = (await call(app, marco.cookie, 'GET', '/api/time/today')).json();
  assert.equal(t.openBar, null);
  assert.equal(t.totals.regularMs, 8 * 3_600_000);
  assert.equal(t.entries[0].endedBy, 'auto');
  t = (await call(app, marco.cookie, 'POST', '/api/time/overtime')).json();
  assert.equal(t.openBar.kind, 'overtime');
  clock = manilaTime(FRI, 19, 30);
  t = (await call(app, marco.cookie, 'POST', '/api/time/out')).json();
  assert.equal(t.totals.overtimeMs, 2 * 3_600_000);

  // Bea goes sick; board shows everyone; grid hides other members' detailed bars.
  clock = manilaTime(FRI, 10);
  await call(app, bea.cookie, 'POST', '/api/time/status', { status: 'sick' });
  assert.equal((await call(app, bea.cookie, 'POST', '/api/time/in')).statusCode, 409);
  const boardRes = (await call(app, bea.cookie, 'GET', '/api/time/board')).json();
  const byName = Object.fromEntries(boardRes.people.map((p: { name: string; state: string }) => [p.name, p.state]));
  assert.equal(byName['Bea Santos'], 'sick');
  const g = (await call(app, bea.cookie, 'GET', `/api/time/grid?start=${FRI}`)).json();
  const marcoRow = g.people.find((p: { name: string }) => p.name === 'Marco Dela Cruz');
  const fri = marcoRow.days.find((d: { date: string }) => d.date === FRI);
  assert.equal(fri.entries, undefined); // Bea can't see Marco's bars
  assert.equal(fri.regularMs, 8 * 3_600_000); // but sees his totals
  const hrGrid = (await call(app, hr.cookie, 'GET', `/api/time/grid?start=${FRI}`)).json();
  assert.ok(hrGrid.people.find((p: { name: string }) => p.name === 'Marco Dela Cruz').days.find((d: { date: string }) => d.date === FRI).entries.length >= 2);

  // HR deactivates Bea: her session ends and she can no longer sign in.
  const members = (await call(app, hr.cookie, 'GET', '/api/hr/members')).json().people;
  const beaId = members.find((m: { username: string }) => m.username === 'bea').id;
  await call(app, hr.cookie, 'PATCH', `/api/hr/members/${beaId}`, { active: false });
  assert.equal((await call(app, bea.cookie, 'GET', '/api/time/today')).statusCode, 401);
  assert.equal((await login(app, 'bea', 'bea-pass-12')).res.statusCode, 401);

  // CSV export works for HR.
  const csv = await call(app, hr.cookie, 'GET', `/api/hr/export.csv?from=${FRI}&to=${FRI}`);
  assert.match(csv.body, /Marco Dela Cruz,2026-11-20,,8\.00,2\.00/);
  await app.close();
});

test('repeated wrong passwords throttle that account, not everyone on the same network', async () => {
  resetLoginThrottle();
  const { app, db } = await setup();
  await db.insertInto('users').values({ username: 'other', display_name: 'Other', role: 'member', password_hash: await hashPassword('other-pass-1'), must_change_password: 0, active: 1, created_at: new Date().toISOString(), created_by: null }).execute();
  for (let i = 0; i < 4; i++) assert.equal((await login(app, 'root', 'wrong-pass')).res.statusCode, 401);
  assert.equal((await login(app, 'root', 'wrong-pass')).res.statusCode, 401); // 5th failure starts the wait
  assert.equal((await login(app, 'root', 'admin-pass-1')).res.statusCode, 429);
  assert.equal((await login(app, 'other', 'other-pass-1')).res.statusCode, 200); // same IP, different account: fine
  await app.close();
});
