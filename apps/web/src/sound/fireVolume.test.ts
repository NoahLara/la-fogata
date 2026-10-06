import { describe, expect, it } from "vitest";
import { fireVolume } from "./fireVolume";

describe("fireVolume", () => {
  it("is never silent: an empty fire still has its embers", () => {
    expect(fireVolume(0)).toBeGreaterThan(0.2);
  });

  it("grows a little with each person and tops out at a full campfire", () => {
    const levels = [0, 1, 2, 3, 4, 5, 6, 7].map(fireVolume);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1]!);
    expect(levels[7]).toBe(1);
    // One person is a small step, not a jump.
    expect(levels[1]! - levels[0]!).toBeLessThan(0.12);
  });

  it("holds its limits for counts that make no sense", () => {
    expect(fireVolume(-3)).toBe(fireVolume(0));
    expect(fireVolume(40)).toBe(1);
    expect(fireVolume(Number.NaN)).toBe(fireVolume(0));
  });
});
