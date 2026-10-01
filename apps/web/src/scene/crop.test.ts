import { describe, expect, it } from "vitest";
import { ellipseCrop } from "./crop";

describe("ellipseCrop", () => {
  it("covers the ellipse on whole pixels", () => {
    expect(ellipseCrop(100, 50, 20.4, 10.2, 1, 400, 200)).toEqual({
      x: 79,
      y: 39,
      width: 42,
      height: 22,
    });
  });

  it("scales with the resolution", () => {
    const crop = ellipseCrop(100, 50, 20, 10, 0.5, 200, 100);
    expect(crop).toEqual({ x: 40, y: 20, width: 20, height: 10 });
  });

  it("stays inside the canvas when the ellipse spills over", () => {
    const crop = ellipseCrop(10, 10, 50, 50, 1, 100, 80);
    expect(crop).toEqual({ x: 0, y: 0, width: 60, height: 60 });
    const far = ellipseCrop(90, 70, 50, 50, 1, 100, 80);
    expect(far).toEqual({ x: 40, y: 20, width: 60, height: 60 });
  });

  it("is never empty, even for an ellipse outside the canvas", () => {
    const crop = ellipseCrop(-500, -500, 5, 5, 1, 100, 80);
    expect(crop.width).toBeGreaterThanOrEqual(1);
    expect(crop.height).toBeGreaterThanOrEqual(1);
  });
});
