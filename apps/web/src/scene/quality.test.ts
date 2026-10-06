import { describe, expect, it } from "vitest";
import { createQualityGovernor, nextResolution } from "./quality";

/** Feeds `count` frames of `ms` and returns the first change it asked for. */
function feed(
  governor: ReturnType<typeof createQualityGovernor>,
  count: number,
  ms: number,
  res: number,
) {
  for (let i = 0; i < count; i++) {
    const change = governor.frame(ms, res);
    if (change !== undefined) return change;
  }
  return undefined;
}

describe("nextResolution", () => {
  it("steps down 2, 1.5, 1 and then stops", () => {
    expect(nextResolution(2)).toBe(1.5);
    expect(nextResolution(1.5)).toBe(1);
    expect(nextResolution(1)).toBeUndefined();
    expect(nextResolution(0.75)).toBeUndefined();
  });

  it("goes to the next step below an odd density", () => {
    expect(nextResolution(1.75)).toBe(1.5);
    expect(nextResolution(3)).toBe(2);
  });
});

describe("the quality governor", () => {
  it("never acts on a device that keeps up", () => {
    const governor = createQualityGovernor();
    expect(feed(governor, 2000, 16.7, 2)).toBeUndefined();
    expect(feed(createQualityGovernor(), 2000, 8.3, 2)).toBeUndefined();
  });

  it("steps down after a whole window of slow frames, once the warm-up is over", () => {
    const governor = createQualityGovernor({ window: 60, warmup: 120 });
    // Not before the warm-up and a full window.
    expect(feed(governor, 179, 50, 2)).toBeUndefined();
    expect(governor.frame(50, 2)).toBe(1.5);
  });

  it("starts over after a change, so it doesn't drop twice in a row", () => {
    const governor = createQualityGovernor({ window: 60, warmup: 120 });
    expect(feed(governor, 180, 50, 2)).toBe(1.5);
    expect(feed(governor, 179, 50, 1.5)).toBeUndefined();
    expect(governor.frame(50, 1.5)).toBe(1);
  });

  it("stops at the lowest resolution", () => {
    const governor = createQualityGovernor();
    expect(feed(governor, 1000, 80, 1)).toBeUndefined();
  });

  it("ignores stalls, which are not the scene being heavy", () => {
    const governor = createQualityGovernor();
    // A hidden tab or a rebuild: huge frames, plenty of them, yet no change.
    expect(feed(governor, 1000, 900, 2)).toBeUndefined();
    expect(feed(governor, 10, 0, 2)).toBeUndefined();
  });

  it("forgives a short slow patch among fast frames", () => {
    const governor = createQualityGovernor({ window: 60, warmup: 0 });
    expect(feed(governor, 500, 16, 2)).toBeUndefined();
    expect(feed(governor, 5, 120, 2)).toBeUndefined();
    expect(feed(governor, 500, 16, 2)).toBeUndefined();
  });
});
