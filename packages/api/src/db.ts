/**
 * The little of a SQL database this package needs, which is what Cloudflare D1 offers (and what the tests' SQLite
 * offers too). Nothing here is specific to either.
 */
export interface DbStatement {
  bind(...values: unknown[]): DbStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes?: number } }>;
}

export interface Db {
  prepare(sql: string): DbStatement;
  /** Runs the statements in order, all or none. */
  batch(statements: DbStatement[]): Promise<unknown[]>;
}
