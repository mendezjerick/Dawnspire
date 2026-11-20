// Settings come from the environment so moving to dawnspire.cc / base.dawnspire.cc is config, not code.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;

export const config = {
  port: Number(env.BASE_PORT ?? 5175),
  host: env.BASE_HOST ?? '127.0.0.1',
  /** SQLite file for local development. Git-ignored. */
  dbFile: env.BASE_DB_FILE ?? path.join(root, '.local', 'base.sqlite'),
  /** Uploaded images for the site editor. Git-ignored. */
  uploadDir: env.BASE_UPLOAD_DIR ?? path.join(root, '.local', 'uploads'),
  /** Session lifetime. */
  sessionDays: Number(env.BASE_SESSION_DAYS ?? 7),
  /** Mark cookies Secure once served over HTTPS (production). */
  secureCookies: env.BASE_SECURE_COOKIES === 'true',
  /** Public site origins allowed to read published content (dawnspire.cc later). */
  publicOrigins: (env.BASE_PUBLIC_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()).filter(Boolean),
  minPasswordLength: 8,
};
