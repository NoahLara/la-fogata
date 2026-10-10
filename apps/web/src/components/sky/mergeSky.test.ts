import { describe, expect, it } from "vitest";
import type { Petition } from "@/data/types";
import { mergeSky } from "./mergeSky";

const petition = (id: string, extra: Partial<Petition> = {}): Petition => ({
  id,
  text: `texto ${id}`,
  createdAt: 0,
  createdOn: "2026-10-10",
  prayers: 0,
  mine: false,
  prayed: false,
  ...extra,
});

describe("mergeSky", () => {
  it("adds the stars of people who came by since, after the ones already there", () => {
    const merged = mergeSky([petition("a"), petition("b")], [petition("c"), petition("a")], 10);
    expect(merged.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps a star that is not in the new reading: it must not drop out for being accompanied", () => {
    const merged = mergeSky([petition("a", { prayers: 1 }), petition("b")], [petition("b")], 10);
    expect(merged.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("brings what is new about the stars already there: their company and their answer", () => {
    const answered = petition("a", {
      prayers: 4,
      answered: { at: 5, on: "2026-10-11", note: "Se dio" },
    });
    const [a] = mergeSky([petition("a")], [answered], 10);
    expect(a).toEqual(answered);
  });

  it("keeps their place: nothing moves", () => {
    const merged = mergeSky(
      [petition("a"), petition("b"), petition("c")],
      [petition("c"), petition("b"), petition("a"), petition("d")],
      10,
    );
    expect(merged.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("lets the oldest to arrive go first when there is no more room", () => {
    const current = ["a", "b", "c"].map((id) => petition(id));
    const merged = mergeSky(current, [petition("d"), petition("e")], 4);
    expect(merged.map((p) => p.id)).toEqual(["b", "c", "d", "e"]);
  });

  it("does not change what it is given, and handles an empty sky on either side", () => {
    const current = [petition("a")];
    mergeSky(current, [petition("b")], 10);
    expect(current.map((p) => p.id)).toEqual(["a"]);
    expect(mergeSky([], [], 5)).toEqual([]);
    expect(mergeSky([], [petition("x")], 5).map((p) => p.id)).toEqual(["x"]);
    expect(mergeSky([petition("x")], [], 5).map((p) => p.id)).toEqual(["x"]);
  });
});
