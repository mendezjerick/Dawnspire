// Development only: creates sample accounts so Base can be tried locally.
// Run: npm run seed:dev (in server/). Credentials are written to .local/dev-accounts.txt (git-ignored).
// Never run against a production database.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from '../auth.ts';
import { config } from '../config.ts';
import { migrate, openDb } from '../db/index.ts';
import { addDays, manilaDate, manilaTime, weekStart } from '../time/rules.ts';

if (process.env.NODE_ENV === 'production') { console.log('Refusing to seed sample accounts in production.'); process.exit(1); }

const db = openDb();
await migrate(db);
const pw = () => crypto.randomBytes(6).toString('base64url');
const accounts: Array<{ username: string; name: string; role: 'admin' | 'hr' | 'member' }> = [
  { username: 'admin', name: 'Administrator', role: 'admin' },
  { username: 'hr.office', name: 'Sample HR', role: 'hr' },
  { username: 'marco', name: 'Marco Dela Cruz (sample)', role: 'member' },
  { username: 'bea', name: 'Bea Santos (sample)', role: 'member' },
  { username: 'paolo', name: 'Paolo Reyes (sample)', role: 'member' },
];
const lines = ['# Sample Base accounts for local development only. Not real people.', ''];
for (const a of accounts) {
  // Every run issues fresh passwords so this file is always the current list.
  const password = pw();
  const hash = await hashPassword(password);
  const exists = await db.selectFrom('users').select('id').where('username', '=', a.username).executeTakeFirst();
  if (exists) await db.updateTable('users').set({ password_hash: hash, must_change_password: 0, active: 1 }).where('id', '=', exists.id).execute();
  else await db.insertInto('users').values({ username: a.username, display_name: a.name, role: a.role, password_hash: hash, must_change_password: 0, active: 1, created_at: new Date().toISOString(), created_by: null }).execute();
  lines.push(`${a.role.padEnd(7)} ${a.username.padEnd(8)} ${password}`);
}
// Sample attendance for the earlier days of the current Manila week, so the grid has something to show.
const today = manilaDate(new Date());
const monday = weekStart(today);
const ids = Object.fromEntries((await db.selectFrom('users').select(['id', 'username']).execute()).map(u => [u.username, u.id]));
const hasTime = await db.selectFrom('time_entries').select('id').limit(1).executeTakeFirst();
if (!hasTime) {
  const bar = async (u: string, date: string, kind: 'regular' | 'overtime', h0: number, m0: number, h1: number, m1: number, endedBy = 'member') =>
    db.insertInto('time_entries').values({ user_id: ids[u], kind, start_at: manilaTime(date, h0, m0).toISOString(), end_at: manilaTime(date, h1, m1).toISOString(), ended_by: endedBy as 'member', manila_date: date }).execute();
  for (let i = 0; i < 5; i++) {
    const date = addDays(monday, i);
    if (date >= today) break;
    await bar('marco', date, 'regular', 7, 52, 17, 0, 'auto');
    if (i === 1) await bar('marco', date, 'overtime', 17, 40, 20, 15);
    if (i === 2) await db.insertInto('day_statuses').values({ user_id: ids.bea, manila_date: date, status: 'sick', set_at: manilaTime(date, 7).toISOString() }).execute();
    else { await bar('bea', date, 'regular', 8, 5, 12, 0); await bar('bea', date, 'regular', 13, 0, 16, 30); }
    if (i === 3) await db.insertInto('day_statuses').values({ user_id: ids.paolo, manila_date: date, status: 'unavailable', set_at: manilaTime(date, 8).toISOString() }).execute();
    else await bar('paolo', date, 'regular', 9, 10, 17, 0, 'auto');
    if (i === 0) await bar('paolo', date, 'overtime', 18, 0, 24, 0, 'auto'); // forgot to time out: flagged
  }
  lines.push('', 'Sample attendance added for earlier days this week.');
}

const out = path.join(path.dirname(config.dbFile), 'dev-accounts.txt');
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(`Sample accounts ready. Credentials: ${out}`);
await db.destroy();
