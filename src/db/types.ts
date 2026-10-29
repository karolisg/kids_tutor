/** Values both SQLite and D1 can bind. */
export type SqlParam = string | number | null;

export type SqlStatement = {
  sql: string;
  params?: readonly SqlParam[];
};

/**
 * Small async surface shared by the Node sqlite driver and a future D1 driver.
 * Routes depend on this interface only.
 */
export interface SqlDatabase {
  all<T>(sql: string, params?: readonly SqlParam[]): Promise<T[]>;
  get<T>(sql: string, params?: readonly SqlParam[]): Promise<T | undefined>;
  run(sql: string, params?: readonly SqlParam[]): Promise<void>;
  batch(statements: readonly SqlStatement[]): Promise<void>;
}

/** Node-only migration runner. A Worker would apply the same SQL files through D1. */
export interface MigratingDatabase extends SqlDatabase {
  exec(sql: string): Promise<void>;
}
