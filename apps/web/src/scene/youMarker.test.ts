import { describe, expect, it } from "vitest";
import { gestureGlowAt, YOU, youLabelAlpha } from "./youMarker";

describe("youLabelAlpha", () => {
  it("is fully visible while it is held, then fades out for good", () => {
    expect(youLabelAlpha(0)).toBe(1);
    expect(youLabelAlpha(YOU.labelHold)).toBe(1);
    expect(youLabelAlpha(YOU.labelHold + YOU.labelFade / 2)).toBeCloseTo(0.5);
    expect(youLabelAlpha(YOU.labelHold + YOU.labelFade)).toBe(0);
    expect(youLabelAlpha(100)).toBe(0);
  });

  it("is not there before they have sat down", () => {
    expect(youLabelAlpha(-1)).toBe(0);
  });
});

describe("gestureGlowAt", () => {
  it("is nothing before and after, and peaks early", () => {
    expect(gestureGlowAt(0)).toBe(0);
    expect(gestureGlowAt(YOU.glowSeconds)).toBe(0);
    expect(gestureGlowAt(YOU.glowSeconds * 0.2)).toBeCloseTo(1);
    expect(gestureGlowAt(YOU.glowSeconds * 0.6)).toBeLessThan(1);
    expect(gestureGlowAt(YOU.glowSeconds * 0.6)).toBeGreaterThan(0);
  });
});
