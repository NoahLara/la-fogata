import { describe, expect, it } from "vitest";
import type { View } from "./characters";
import { evaluateCurve, VIEW_LIGHTING } from "./lighting";

describe("evaluateCurve", () => {
  const curve = { base: 0.46, perDistance: 0.1, perIntensity: 0.1, min: 0.3, max: 0.6 };

  it("grows with distance and shrinks as the fire gets stronger", () => {
    expect(evaluateCurve(curve, 1, 1)).toBeCloseTo(0.56, 12);
    expect(evaluateCurve(curve, 1, 1.5)).toBeCloseTo(0.51, 12);
  });

  it("stays within its limits", () => {
    expect(evaluateCurve(curve, 100, 1)).toBe(0.6);
    expect(evaluateCurve(curve, 0, 10)).toBe(0.3);
  });
});

describe("VIEW_LIGHTING", () => {
  const views: View[] = ["back", "side", "front"];

  it("has every curve inside 0..1 and every alpha positive", () => {
    for (const view of views) {
      const lighting = VIEW_LIGHTING[view];
      for (const curve of [lighting.bodyTint, lighting.logTint]) {
        expect(curve.min).toBeGreaterThanOrEqual(0);
        expect(curve.max).toBeLessThanOrEqual(1);
        expect(curve.min).toBeLessThanOrEqual(curve.max);
      }
      expect(lighting.litAlpha).toBeGreaterThan(0);
      expect(lighting.shadeAlpha).toBeGreaterThan(0);
      expect(lighting.rimAlpha).toBeGreaterThan(0);
    }
  });

  it("makes the back view darker than the others, with a stronger rim", () => {
    const back = VIEW_LIGHTING.back;
    const front = VIEW_LIGHTING.front;
    expect(evaluateCurve(back.bodyTint, 1, 1)).toBeGreaterThan(evaluateCurve(front.bodyTint, 1, 1));
    expect(back.rimAlpha).toBeGreaterThan(front.rimAlpha);
    expect(back.litAlpha).toBeLessThan(front.litAlpha);
  });

  it("lights the side and front views the same, since the seat decides only the art", () => {
    expect(VIEW_LIGHTING.side).toBe(VIEW_LIGHTING.front);
  });
});
