import { describe, expect, it } from "vitest";
import { ensureDatabase, findDatabase, withDatabaseId, type Wrangler } from "./provision";

const ID = "11111111-2222-3333-4444-555555555555";
const OTHER = "99999999-8888-7777-6666-000000000000";
const listing = (...rows: { uuid: string; name: string }[]) => JSON.stringify(rows);

describe("finding the database in what wrangler lists", () => {
  it("gives the id of the one with the name", () => {
    expect(
      findDatabase(listing({ uuid: OTHER, name: "other" }, { uuid: ID, name: "fogata" }), "fogata"),
    ).toBe(ID);
  });

  it("finds nothing when it is not there, the list is empty, or it is not a list", () => {
    expect(findDatabase(listing({ uuid: OTHER, name: "other" }), "fogata")).toBeUndefined();
    expect(findDatabase("[]", "fogata")).toBeUndefined();
    expect(findDatabase("", "fogata")).toBeUndefined();
    expect(findDatabase("not json at all", "fogata")).toBeUndefined();
    expect(findDatabase('{"uuid":"x","name":"fogata"}', "fogata")).toBeUndefined();
    expect(findDatabase("[1, null, {}]", "fogata")).toBeUndefined();
  });

  it("reads past a banner printed around the list", () => {
    const banner = ` ⛅️ wrangler 4.145.0\n────\n${listing({ uuid: ID, name: "fogata" })}\nDone.\n`;
    expect(findDatabase(banner, "fogata")).toBe(ID);
  });

  it("does not take a database whose name only contains the one asked for", () => {
    expect(findDatabase(listing({ uuid: OTHER, name: "fogata-old" }), "fogata")).toBeUndefined();
  });
});

describe("making sure the database is there", () => {
  function account(initial: { uuid: string; name: string }[]) {
    const rows = [...initial];
    const calls: string[][] = [];
    const run: Wrangler = async (args) => {
      calls.push(args);
      if (args[1] === "list") return listing(...rows);
      if (args[1] === "create") {
        rows.push({ uuid: ID, name: args[2] as string });
        return "Created";
      }
      throw new Error(`unexpected ${args.join(" ")}`);
    };
    return { run, calls };
  }

  it("uses the one the account has, and creates nothing", async () => {
    const { run, calls } = account([{ uuid: ID, name: "fogata" }]);
    expect(await ensureDatabase(run, "fogata")).toBe(ID);
    expect(calls).toEqual([["d1", "list", "--json"]]);
  });

  it("creates it on an account that has none, and reads its id from the list", async () => {
    const { run, calls } = account([{ uuid: OTHER, name: "something-else" }]);
    expect(await ensureDatabase(run, "fogata")).toBe(ID);
    expect(calls.map((call) => call[1])).toEqual(["list", "create", "list"]);
    expect(calls[1]).toEqual(["d1", "create", "fogata"]);
  });

  it("is safe to run again: the second time it creates nothing", async () => {
    const { run, calls } = account([]);
    await ensureDatabase(run, "fogata");
    calls.length = 0;
    expect(await ensureDatabase(run, "fogata")).toBe(ID);
    expect(calls.map((call) => call[1])).toEqual(["list"]);
  });

  it("fails when wrangler fails, and when the database cannot be found after creating it", async () => {
    await expect(
      ensureDatabase(async () => {
        throw new Error("not logged in");
      }, "fogata"),
    ).rejects.toThrow("not logged in");
    await expect(ensureDatabase(async () => "[]", "fogata")).rejects.toThrow(/not in the list/);
  });
});

describe("writing the id into the config", () => {
  const config = `{
  "name": "fogata-realtime",
  // The petitions.
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "fogata",
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "../../packages/api/migrations",
    },
  ],
}
`;

  it("sets the id of the database called so, and changes nothing else", () => {
    const updated = withDatabaseId(config, "fogata", ID);
    expect(updated).toContain(`"database_id": "${ID}"`);
    expect(updated).not.toContain("00000000-0000-0000-0000-000000000000");
    expect(updated.replace(ID, "00000000-0000-0000-0000-000000000000")).toBe(config);
  });

  it("is the same when run again with the same id", () => {
    const once = withDatabaseId(config, "fogata", ID);
    expect(withDatabaseId(once, "fogata", ID)).toBe(once);
  });

  it("says so when there is no such entry", () => {
    expect(() => withDatabaseId(config, "other", ID)).toThrow(/No d1_databases entry/);
    expect(() => withDatabaseId("{}", "fogata", ID)).toThrow();
  });

  it("works on the real config of the realtime Worker", async () => {
    const { readFileSync } = await import("node:fs");
    const real = readFileSync(
      new URL("../../../apps/realtime/wrangler.jsonc", import.meta.url),
      "utf8",
    );
    expect(withDatabaseId(real, "fogata", ID)).toContain(`"database_id": "${ID}"`);
  });
});
