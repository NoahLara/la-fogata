import { describe, expect, it } from "vitest";
import { pickSky, shuffled } from "./sky";
import { textLength } from "./text";

/** A small seeded generator, so the tests do not depend on luck. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const star = (prayers: number, id = prayers) => ({ id, prayers });

describe("shuffled", () => {
  it("keeps every item and does not touch the list it is given", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const result = shuffled(items, seeded(1));
    expect([...result].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("is the same for the same generator, and different for another", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffled(items, seeded(3))).toEqual(shuffled(items, seeded(3)));
    expect(shuffled(items, seeded(3))).not.toEqual(shuffled(items, seeded(4)));
  });
});

describe("pickSky", () => {
  it("shows the least prayed for first, and at most the size of the sky", () => {
    const all = Array.from({ length: 50 }, (_, i) => star(i));
    const sky = pickSky(all, seeded(2), 30);
    expect(sky).toHaveLength(30);
    expect(sky.map((petition) => petition.prayers)).toEqual(
      Array.from({ length: 30 }, (_, i) => i),
    );
  });

  it("mixes petitions with the same count, so other stars pass over time", () => {
    const all = Array.from({ length: 60 }, (_, id) => ({ id, prayers: 0 }));
    const firsts = new Set<number>();
    for (let seed = 1; seed <= 10; seed++) firsts.add(pickSky(all, seeded(seed), 5)[0]?.id ?? -1);
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("leaves a petition out only for being prayed for more, never for being old", () => {
    const all = [
      { id: "old", prayers: 0, createdAt: 0 },
      { id: "new", prayers: 0, createdAt: 9e12 },
    ];
    expect(pickSky(all, seeded(1), 10)).toHaveLength(2);
  });
});

describe("textLength", () => {
  it("counts characters as people do: an emoji or an accented letter is one", () => {
    expect(textLength("añ")).toBe(2);
    expect(textLength("🙏")).toBe(1);
    expect(textLength("")).toBe(0);
  });
});
