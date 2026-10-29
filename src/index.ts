import { serve } from '@hono/node-server';
import path from 'node:path';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { openSqlite } from './db/sqlite.js';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 16) {
  console.error('SESSION_SECRET must be set and at least 16 characters.');
  process.exit(1);
}

const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'kids-tutor.sqlite');
const db = openSqlite(databasePath);
await migrate(db, path.join(process.cwd(), 'migrations'));

const app = createApp({ db, sessionSecret });
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Kids Tutor listening on http://${info.address}:${info.port}`);
});
