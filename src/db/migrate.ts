import fs from 'node:fs';
import path from 'node:path';
import type { MigratingDatabase } from './types.js';

/**
 * Applies numbered .sql files. Bookkeeping lives in schema_migrations, which is
 * not one of the D1 files — Wrangler tracks those itself.
 */
export async function migrate(db: MigratingDatabase, migrationsDir: string): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await db.get<{ name: string }>(
      'SELECT name FROM schema_migrations WHERE name = ?',
      [file],
    );
    if (applied) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await db.exec(sql);
    await db.run('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)', [
      file,
      new Date().toISOString(),
    ]);
    console.log(`Applied migration ${file}`);
  }
}
