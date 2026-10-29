import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { MigratingDatabase, SqlParam, SqlStatement } from './types.js';

function bind(params?: readonly SqlParam[]): SqlParam[] {
  return params ? [...params] : [];
}

/**
 * node:sqlite driver. Import this only from the Node entry, never from routes,
 * so a future Worker bundle can swap in D1 without carrying this module.
 */
export function openSqlite(filename: string): MigratingDatabase {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  return {
    async all<T>(sql: string, params?: readonly SqlParam[]): Promise<T[]> {
      return db.prepare(sql).all(...bind(params)) as T[];
    },
    async get<T>(sql: string, params?: readonly SqlParam[]): Promise<T | undefined> {
      const row = db.prepare(sql).get(...bind(params));
      return row as T | undefined;
    },
    async run(sql: string, params?: readonly SqlParam[]): Promise<void> {
      db.prepare(sql).run(...bind(params));
    },
    async batch(statements: readonly SqlStatement[]): Promise<void> {
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const statement of statements) {
          db.prepare(statement.sql).run(...bind(statement.params));
        }
        db.exec('COMMIT');
      } catch (error) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // The original statement error is the one to surface.
        }
        throw error;
      }
    },
    async exec(sql: string): Promise<void> {
      db.exec(sql);
    },
  };
}
