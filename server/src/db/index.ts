// The only place that knows which database engine Base runs on.
// Today: SQLite through better-sqlite3. To move to Postgres, swap the dialect here
// (Kysely PostgresDialect + pg Pool) and keep every query unchanged.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql, type Generated } from 'kysely';
import { config } from '../config.ts';

export type Role = 'admin' | 'hr' | 'member';

export interface UsersTable {
  id: Generated<number>;
  username: string; // stored lowercase, unique
  display_name: string;
  role: Role;
  password_hash: string;
  must_change_password: number; // 0 | 1
  active: number; // 0 | 1
  created_at: string;
  created_by: number | null;
}

export interface SessionsTable {
  token_hash: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

export interface TimeEntriesTable {
  id: Generated<number>;
  user_id: number;
  kind: 'regular' | 'overtime';
  start_at: string; // ISO UTC, the actual tap time
  end_at: string | null;
  ended_by: 'member' | 'auto' | 'hr' | 'status' | null;
  manila_date: string; // YYYY-MM-DD the bar belongs to
}

export interface DayStatusesTable {
  user_id: number;
  manila_date: string;
  status: 'unavailable' | 'sick';
  set_at: string;
}

export interface AuditLogTable {
  id: Generated<number>;
  actor_id: number | null;
  action: string;
  target: string | null;
  detail: string | null; // JSON
  at: string;
}

export interface InquiriesTable {
  id: Generated<number>;
  name: string;
  email: string;
  subject: string;
  message: string;
  received_at: string;
  read_at: string | null;
}

export interface ContentTable {
  section: string; // 'projects' | 'media' | 'timeline' | 'personnel' | ...
  draft: string; // JSON
  published: string; // JSON
  draft_updated_at: string;
  published_at: string | null;
  updated_by: number | null;
}

export interface UploadsTable {
  id: Generated<number>;
  file_name: string;
  stored_as: string;
  mime: string;
  size: number;
  uploaded_by: number;
  at: string;
}

export interface DB {
  users: UsersTable;
  sessions: SessionsTable;
  time_entries: TimeEntriesTable;
  day_statuses: DayStatusesTable;
  audit_log: AuditLogTable;
  inquiries: InquiriesTable;
  content: ContentTable;
  uploads: UploadsTable;
}

export function openDb(file = config.dbFile): Kysely<DB> {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return new Kysely<DB>({ dialect: new SqliteDialect({ database: sqlite }) });
}

/** Creates tables that do not exist yet. Uses only portable column types. */
export async function migrate(db: Kysely<DB>): Promise<void> {
  await db.schema.createTable('users').ifNotExists()
    .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
    .addColumn('username', 'text', c => c.notNull().unique())
    .addColumn('display_name', 'text', c => c.notNull())
    .addColumn('role', 'text', c => c.notNull())
    .addColumn('password_hash', 'text', c => c.notNull())
    .addColumn('must_change_password', 'integer', c => c.notNull().defaultTo(0))
    .addColumn('active', 'integer', c => c.notNull().defaultTo(1))
    .addColumn('created_at', 'text', c => c.notNull())
    .addColumn('created_by', 'integer', c => c.references('users.id'))
    .execute();
  await db.schema.createTable('sessions').ifNotExists()
    .addColumn('token_hash', 'text', c => c.primaryKey())
    .addColumn('user_id', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
    .addColumn('created_at', 'text', c => c.notNull())
    .addColumn('expires_at', 'text', c => c.notNull())
    .execute();
  await db.schema.createTable('time_entries').ifNotExists()
    .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', c => c.notNull().references('users.id'))
    .addColumn('kind', 'text', c => c.notNull())
    .addColumn('start_at', 'text', c => c.notNull())
    .addColumn('end_at', 'text')
    .addColumn('ended_by', 'text')
    .addColumn('manila_date', 'text', c => c.notNull())
    .execute();
  await db.schema.createIndex('time_entries_user_date').ifNotExists().on('time_entries').columns(['user_id', 'manila_date']).execute();
  await db.schema.createTable('day_statuses').ifNotExists()
    .addColumn('user_id', 'integer', c => c.notNull().references('users.id'))
    .addColumn('manila_date', 'text', c => c.notNull())
    .addColumn('status', 'text', c => c.notNull())
    .addColumn('set_at', 'text', c => c.notNull())
    .addPrimaryKeyConstraint('day_statuses_pk', ['user_id', 'manila_date'])
    .execute();
  await db.schema.createTable('audit_log').ifNotExists()
    .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
    .addColumn('actor_id', 'integer', c => c.references('users.id'))
    .addColumn('action', 'text', c => c.notNull())
    .addColumn('target', 'text')
    .addColumn('detail', 'text')
    .addColumn('at', 'text', c => c.notNull())
    .execute();
  await db.schema.createTable('inquiries').ifNotExists()
    .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
    .addColumn('name', 'text', c => c.notNull())
    .addColumn('email', 'text', c => c.notNull())
    .addColumn('subject', 'text', c => c.notNull())
    .addColumn('message', 'text', c => c.notNull())
    .addColumn('received_at', 'text', c => c.notNull())
    .addColumn('read_at', 'text')
    .execute();
  await db.schema.createTable('content').ifNotExists()
    .addColumn('section', 'text', c => c.primaryKey())
    .addColumn('draft', 'text', c => c.notNull())
    .addColumn('published', 'text', c => c.notNull())
    .addColumn('draft_updated_at', 'text', c => c.notNull())
    .addColumn('published_at', 'text')
    .addColumn('updated_by', 'integer', c => c.references('users.id'))
    .execute();
  await db.schema.createTable('uploads').ifNotExists()
    .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
    .addColumn('file_name', 'text', c => c.notNull())
    .addColumn('stored_as', 'text', c => c.notNull().unique())
    .addColumn('mime', 'text', c => c.notNull())
    .addColumn('size', 'integer', c => c.notNull())
    .addColumn('uploaded_by', 'integer', c => c.notNull().references('users.id'))
    .addColumn('at', 'text', c => c.notNull())
    .execute();
  // The single admin account is enforced by the setup script and a partial unique index.
  await sql`create unique index if not exists users_single_admin on users (role) where role = 'admin'`.execute(db);
}

export const nowIso = () => new Date().toISOString();
