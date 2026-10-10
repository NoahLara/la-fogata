import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { Db, DbStatement } from "../db";

// Vite does not know `node:sqlite` yet, so it is loaded the way Node does, past it.
const { DatabaseSync: Sqlite } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");

/** The migrations, as a D1 would apply them: in order, by name. */
const MIGRATION = new URL("../../migrations/0001_petitions.sql", import.meta.url);

class Statement implements DbStatement {
  private values: SQLInputValue[] = [];

  constructor(
    private readonly db: DatabaseSync,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    const next = new Statement(this.db, this.sql);
    next.values = values as SQLInputValue[];
    return next;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const rows = this.db.prepare(this.sql).all(...this.values);
    return { results: rows.map((row) => ({ ...row }) as T) };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values);
    return row ? ({ ...row } as T) : null;
  }

  async run(): Promise<{ meta: { changes?: number } }> {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }
}

/** A real SQLite in memory, with the migrations applied, behind the same few methods D1 has. For tests. */
export function createTestDb(): Db {
  const sqlite = new Sqlite(":memory:");
  sqlite.exec(readFileSync(MIGRATION, "utf8"));
  return {
    prepare: (sql) => new Statement(sqlite, sql),
    async batch(statements) {
      const results: unknown[] = [];
      sqlite.exec("BEGIN");
      try {
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
      return results;
    },
  };
}
