import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testing";
import type { Db } from "./db";
import { PetitionStore, REPORTS_TO_HIDE, type NewPetition } from "./store";

let db: Db;
let store: PetitionStore;

const petition = (id: string, extra: Partial<NewPetition> = {}): NewPetition => ({
  id,
  ownerHash: "owner-a",
  text: `texto de ${id}`,
  createdAt: 1000,
  createdOn: "2026-10-10",
  ...extra,
});

beforeEach(() => {
  db = createTestDb();
  store = new PetitionStore(db);
});

describe("the schema", () => {
  it("has no column that says who wrote a petition, only a hash of a key", async () => {
    const { results } = await db.prepare("PRAGMA table_info(petitions)").all<{ name: string }>();
    expect(results.map((column) => column.name).sort()).toEqual(
      [
        "answer_note",
        "answered_at",
        "answered_on",
        "created_at",
        "created_on",
        "id",
        "owner_hash",
        "prayers",
        "status",
        "text",
      ].sort(),
    );
  });

  it("refuses a status that is not visible or hidden", async () => {
    await store.create(petition("a"));
    await expect(
      db.prepare("UPDATE petitions SET status = 'deleted' WHERE id = 'a'").run(),
    ).rejects.toThrow();
  });
});

describe("keeping and reading petitions", () => {
  it("keeps a petition as it was written and reads it back", async () => {
    await store.create(petition("a", { text: "Por mi familia 🙏" }));
    expect(await store.get("a")).toMatchObject({
      id: "a",
      text: "Por mi familia 🙏",
      createdAt: 1000,
      createdOn: "2026-10-10",
      answeredAt: null,
      prayers: 0,
      status: "visible",
    });
    expect(await store.get("nope")).toBeUndefined();
  });

  it("lists one owner's petitions, the newest first, and nobody else's", async () => {
    await store.create(petition("old", { createdAt: 1 }));
    await store.create(petition("new", { createdAt: 9 }));
    await store.create(petition("other", { ownerHash: "owner-b", createdAt: 5 }));
    expect((await store.mine("owner-a")).map((row) => row.id)).toEqual(["new", "old"]);
    expect((await store.mine("owner-b")).map((row) => row.id)).toEqual(["other"]);
    expect(await store.mine("nobody")).toEqual([]);
  });

  it("gives the sky the least prayed for, and only as many as asked", async () => {
    for (let i = 0; i < 10; i++) await store.create(petition(`p${i}`));
    for (let i = 0; i < 4; i++) {
      for (let visitor = 0; visitor < i; visitor++) await store.pray(`p${i}`, `v${visitor}`, 1);
    }
    const pool = await store.pool(3);
    expect(pool).toHaveLength(3);
    expect(pool.every((row) => row.prayers === 0)).toBe(true);
    const all = await store.pool(100);
    expect(all.map((row) => row.prayers)).toEqual(
      [...all.map((row) => row.prayers)].sort((a, b) => a - b),
    );
  });

  it("never keeps a petition out of the sky for being old", async () => {
    await store.create(petition("ancient", { createdAt: 0 }));
    expect((await store.pool(10)).map((row) => row.id)).toEqual(["ancient"]);
  });
});

describe("answering and sending back to the fire", () => {
  it("is answered once, by its owner only", async () => {
    await store.create(petition("a"));
    expect(await store.answer("a", "owner-b", 5, "2026-10-11", "x")).toBe(false);
    expect(await store.answer("a", "owner-a", 5, "2026-10-11", "Se dio")).toBe(true);
    expect(await store.answer("a", "owner-a", 6, "2026-10-12", "otra vez")).toBe(false);
    expect(await store.get("a")).toMatchObject({
      answeredAt: 5,
      answeredOn: "2026-10-11",
      answerNote: "Se dio",
    });
  });

  it("goes for good, with whoever was with it and whoever reported it", async () => {
    await store.create(petition("a"));
    await store.pray("a", "v1", 1);
    await store.report("a", "r1", 1);
    expect(await store.remove("a", "owner-b")).toBe(false);
    expect(await store.get("a")).toBeDefined();
    expect(await store.remove("a", "owner-a")).toBe(true);
    expect(await store.get("a")).toBeUndefined();
    expect((await db.prepare("SELECT COUNT(*) AS n FROM prayers").first<{ n: number }>())?.n).toBe(
      0,
    );
    expect((await db.prepare("SELECT COUNT(*) AS n FROM reports").first<{ n: number }>())?.n).toBe(
      0,
    );
    expect(await store.remove("a", "owner-a")).toBe(false);
  });
});

describe("being with a petition", () => {
  it("counts each person once, and the counter follows the rows", async () => {
    await store.create(petition("a"));
    expect(await store.pray("a", "v1", 1)).toEqual({ inserted: true, prayers: 1 });
    expect(await store.pray("a", "v1", 2)).toEqual({ inserted: false, prayers: 1 });
    expect(await store.pray("a", "v2", 3)).toEqual({ inserted: true, prayers: 2 });
    expect((await store.get("a"))?.prayers).toBe(2);
    expect(await store.prayedBy("v1")).toEqual(new Set(["a"]));
    expect(await store.prayedBy("nobody")).toEqual(new Set());
  });

  it("counts how many someone has prayed lately, for the flood guard", async () => {
    await store.create(petition("a"));
    await store.create(petition("b"));
    await store.pray("a", "v1", 100);
    await store.pray("b", "v1", 200);
    expect(await store.prayedSince("v1", 150)).toBe(1);
    expect(await store.prayedSince("v1", 0)).toBe(2);
  });
});

describe("reports", () => {
  it("hides a petition once enough different people have reported it, not before", async () => {
    await store.create(petition("a"));
    for (let i = 1; i < REPORTS_TO_HIDE; i++) await store.report("a", `r${i}`, 1);
    expect((await store.get("a"))?.status).toBe("visible");
    await store.report("a", `r${REPORTS_TO_HIDE}`, 2);
    expect((await store.get("a"))?.status).toBe("hidden");
    expect(await store.pool(10)).toEqual([]);
  });

  it("counts one person once, however many times they report", async () => {
    await store.create(petition("a"));
    for (let i = 0; i < 10; i++) await store.report("a", "same", i);
    expect((await store.get("a"))?.status).toBe("visible");
    expect(await store.reportedBy("same")).toEqual(new Set(["a"]));
  });
});

describe("how many petitions someone made lately", () => {
  it("counts only theirs, and only since the moment asked", async () => {
    await store.create(petition("a", { createdAt: 100 }));
    await store.create(petition("b", { createdAt: 200 }));
    await store.create(petition("c", { ownerHash: "owner-b", createdAt: 200 }));
    expect(await store.madeSince("owner-a", 150)).toBe(1);
    expect(await store.madeSince("owner-a", 0)).toBe(2);
    expect(await store.madeSince("nobody", 0)).toBe(0);
  });
});

describe("what a query reads", () => {
  // The free plan counts the rows a query scans, so every query must use an index and read about what it returns.
  const plan = async (sql: string, ...values: unknown[]) => {
    const { results } = await db
      .prepare(`EXPLAIN QUERY PLAN ${sql}`)
      .bind(...values)
      .all<{ detail: string }>();
    return results.map((row) => row.detail).join(" | ");
  };

  it("reads the sky from an index, in the order it is wanted, with no sort", async () => {
    const detail = await plan(
      "SELECT id FROM petitions WHERE status = 'visible' ORDER BY prayers ASC LIMIT ?",
      10,
    );
    expect(detail).toContain("petitions_for_sky");
    expect(detail).not.toContain("TEMP B-TREE");
    expect(detail).not.toMatch(/SCAN petitions(?! USING)/);
  });

  it("reads 'mine', and how many were made lately, from an index", async () => {
    expect(
      await plan("SELECT id FROM petitions WHERE owner_hash = ? ORDER BY created_at DESC", "x"),
    ).toContain("petitions_by_owner");
    expect(
      await plan("SELECT COUNT(*) FROM petitions WHERE owner_hash = ? AND created_at >= ?", "x", 1),
    ).toContain("petitions_by_owner");
  });

  it("reads what a person prayed for, reported and prayed lately from an index", async () => {
    expect(await plan("SELECT petition_id FROM prayers WHERE visitor_hash = ?", "x")).toContain(
      "prayers_by_visitor",
    );
    expect(
      await plan("SELECT COUNT(*) FROM prayers WHERE visitor_hash = ? AND created_at >= ?", "x", 1),
    ).toContain("prayers_by_visitor");
    expect(await plan("SELECT petition_id FROM reports WHERE reporter_hash = ?", "x")).toContain(
      "reports_by_reporter",
    );
  });
});
