import { describe, expect, it } from "vitest";
import { nearestStar } from "./hitTarget";

describe("nearestStar", () => {
  const stars = [
    { id: "a", x: 100, y: 100 },
    { id: "b", x: 120, y: 100 },
  ];

  it("where two targets overlap, the nearest star wins", () => {
    expect(nearestStar({ x: 105, y: 100 }, stars, 22)).toBe("a");
    expect(nearestStar({ x: 116, y: 100 }, stars, 22)).toBe("b");
  });

  it("is nothing outside every target", () => {
    expect(nearestStar({ x: 300, y: 300 }, stars, 22)).toBeUndefined();
  });

  it("is the one in reach when only one is", () => {
    expect(nearestStar({ x: 80, y: 100 }, stars, 22)).toBe("a");
  });
});
