import { describe, expect, it } from "vitest";
import { paperOutline } from "./paperEdge";

describe("paperOutline", () => {
  it("is the same sheet for the same seed and a different one for another", () => {
    expect(paperOutline(1)).toEqual(paperOutline(1));
    expect(paperOutline(1)).not.toEqual(paperOutline(2));
  });

  it("has the points of four sides", () => {
    expect(paperOutline(1, 10)).toHaveLength(40);
    expect(paperOutline(1, 6)).toHaveLength(24);
  });

  it("stays inside the unit square, near its edges", () => {
    for (const { x, y } of paperOutline(7)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it("wanders: not every point on a side shares the same line", () => {
    const top = paperOutline(3)
      .slice(0, 10)
      .map((point) => point.y);
    expect(new Set(top).size).toBeGreaterThan(1);
  });
});
