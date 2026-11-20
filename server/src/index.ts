import { buildApp } from './app.ts';
import { config } from './config.ts';
import { migrate, openDb } from './db/index.ts';

const db = openDb();
await migrate(db);
const app = await buildApp({ db, logger: true });
await app.listen({ port: config.port, host: config.host });
