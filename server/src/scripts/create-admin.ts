// One-time setup: creates the single admin account. Run: npm run setup:admin (in server/).
// The password is typed here, never stored in code, and never echoed.
import readline from 'node:readline';
import { hashPassword, normalizeUsername, validatePassword } from '../auth.ts';
import { migrate, openDb } from '../db/index.ts';

function ask(question: string, hidden = false): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => { if (s.includes(question)) out.output.write(s); };
    }
    rl.question(question, answer => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
  });
}

const db = openDb();
await migrate(db);
const existing = await db.selectFrom('users').select('username').where('role', '=', 'admin').executeTakeFirst();
if (existing) {
  console.log(`An admin account already exists (${existing.username}). There can only be one.`);
  process.exit(1);
}
const username = normalizeUsername(await ask('Admin username: '));
if (!username) { console.log('Username must be 3–32 characters: letters, numbers, dot, dash or underscore.'); process.exit(1); }
const password = await ask('Admin password (8+ characters): ', true);
const problem = validatePassword(password);
if (problem) { console.log(problem); process.exit(1); }
if ((await ask('Repeat password: ', true)) !== password) { console.log('Passwords do not match.'); process.exit(1); }
await db.insertInto('users').values({
  username, display_name: 'Administrator', role: 'admin', password_hash: await hashPassword(password),
  must_change_password: 0, active: 1, created_at: new Date().toISOString(), created_by: null,
}).execute();
console.log(`Admin account “${username}” created. Sign in at Base.`);
await db.destroy();
