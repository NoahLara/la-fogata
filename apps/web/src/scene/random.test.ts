import { describe, expect, it } from "vitest";
import { createRandom, shuffled } from "./random";

describe("shuffled", () => {
  const items = ["panda", "cat", "owl", "fox", "capybara", "rabbit", "bear"];

  it("keeps every item exactly once, without touching the input", () => {
    const result = shuffled(items, createRandom(1));
    expect([...result].sort()).toEqual([...items].sort());
    expect(items[0]).toBe("panda");
  });

  it("is deterministic for a given seed and varies between seeds", () => {
    expect(shuffled(items, createRandom(5))).toEqual(shuffled(items, createRandom(5)));
    const arrangements = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) => shuffled(items, createRandom(seed)).join()),
    );
    expect(arrangements.size).toBeGreaterThan(1);
  });
});
