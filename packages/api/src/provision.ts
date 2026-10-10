/**
 * Finding or creating the D1 database before a deploy, so a copy of La Fogata on a new Cloudflare account sets its
 * own up. Pure logic: the script that runs it hands in the way to call `wrangler`.
 */

/** Runs `wrangler` with these arguments and gives back what it printed. */
export type Wrangler = (args: string[]) => Promise<string>;

/** The id of the database called `name` in the output of `wrangler d1 list --json`, if there is one. */
export function findDatabase(listing: string, name: string): string | undefined {
  // Wrangler may print a banner around the JSON: read only from the first bracket to the last.
  const from = listing.indexOf("[");
  const to = listing.lastIndexOf("]");
  if (from < 0 || to < from) return undefined;
  let rows: unknown;
  try {
    rows = JSON.parse(listing.slice(from, to + 1));
  } catch {
    return undefined;
  }
  if (!Array.isArray(rows)) return undefined;
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const { uuid, name: found } = row as { uuid?: unknown; name?: unknown };
    if (found === name && typeof uuid === "string" && uuid.length > 0) return uuid;
  }
  return undefined;
}

/** The id of the database called `name`, which is created if the account does not have one yet. */
export async function ensureDatabase(run: Wrangler, name: string): Promise<string> {
  const existing = findDatabase(await run(["d1", "list", "--json"]), name);
  if (existing) return existing;
  await run(["d1", "create", name]);
  const created = findDatabase(await run(["d1", "list", "--json"]), name);
  if (!created) throw new Error(`The database "${name}" was created but is not in the list`);
  return created;
}

/** The wrangler config with the id of the database called `name` set to `id`. */
export function withDatabaseId(config: string, name: string, id: string): string {
  const entry = new RegExp(
    `("database_name"\\s*:\\s*"${name}"\\s*,\\s*"database_id"\\s*:\\s*)"[^"]*"`,
  );
  if (!entry.test(config)) throw new Error(`No d1_databases entry called "${name}" in the config`);
  return config.replace(entry, `$1"${id}"`);
}
