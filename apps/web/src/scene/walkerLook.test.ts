import { describe, expect, it } from "vitest";
import { bobAt, DARK_TINT, exposureAt, fadeInAt, turnWidth, walkerTint } from "./walkerLook";

describe("walker light", () => {
  it("starts in the dark and is fully lit by the end of the walk, never dimming on the way", () => {
    expect(exposureAt(0)).toBe(0);
    expect(exposureAt(1)).toBe(1);
    let previous = 0;
    for (let p = 0; p <= 1; p += 0.01) {
      expect(exposureAt(p)).toBeGreaterThanOrEqual(previous);
      previous = exposureAt(p);
    }
  });

  it("goes from the dark tint to the tint the fire gives it", () => {
    expect(walkerTint(0, 0.4)).toBe(DARK_TINT);
    expect(walkerTint(1, 0.4)).toBeCloseTo(0.4);
    expect(walkerTint(0.5, 0.4)).toBeLessThan(DARK_TINT);
  });

  it("fades in at the start only", () => {
    expect(fadeInAt(0)).toBe(0);
    expect(fadeInAt(0.5)).toBe(1);
  });
});

describe("bobAt", () => {
  it("lifts with each step and comes back to the ground between them", () => {
    expect(bobAt(0, false).lift).toBeCloseTo(0);
    expect(bobAt(0.1, false).lift).toBeGreaterThan(0.02);
    expect(bobAt(0.2, false).lift).toBeCloseTo(0);
    for (let d = 0; d < 2; d += 0.013) expect(bobAt(d, false).lift).toBeGreaterThanOrEqual(0);
  });

  it("sways to one side and then the other", () => {
    expect(bobAt(0.1, false).sway).toBeGreaterThan(0);
    expect(bobAt(0.3, false).sway).toBeLessThan(0);
  });

  it("stands still when motion is reduced", () => {
    expect(bobAt(0.1, true)).toEqual({ lift: 0, sway: 0 });
  });
});

describe("turnWidth", () => {
  it("narrows to nothing halfway and is full width at both ends", () => {
    expect(turnWidth(0)).toBe(1);
    expect(turnWidth(0.5)).toBeCloseTo(0);
    expect(turnWidth(1)).toBeCloseTo(1);
  });
});
