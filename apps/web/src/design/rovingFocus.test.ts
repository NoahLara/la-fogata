import { describe, expect, it } from "vitest";
import { nextStarIndex, orderStars, starAfterRemoval } from "./rovingFocus";

describe("orderStars", () => {
  it("goes from left to right, and top to bottom at the same x", () => {
    const stars = [
      { id: "c", x: 300, y: 10 },
      { id: "b2", x: 120, y: 90 },
      { id: "a", x: 40, y: 50 },
      { id: "b1", x: 120, y: 20 },
    ];
    expect(orderStars(stars).map((star) => star.id)).toEqual(["a", "b1", "b2", "c"]);
  });

  it("does not change the list it is given", () => {
    const stars = [
      { id: "b", x: 2, y: 0 },
      { id: "a", x: 1, y: 0 },
    ];
    orderStars(stars);
    expect(stars.map((star) => star.id)).toEqual(["b", "a"]);
  });
});

describe("nextStarIndex", () => {
  it("moves forward with right and down, and back with left and up", () => {
    expect(nextStarIndex("ArrowRight", 1, 4)).toBe(2);
    expect(nextStarIndex("ArrowDown", 1, 4)).toBe(2);
    expect(nextStarIndex("ArrowLeft", 1, 4)).toBe(0);
    expect(nextStarIndex("ArrowUp", 1, 4)).toBe(0);
  });

  it("wraps around at the ends", () => {
    expect(nextStarIndex("ArrowRight", 3, 4)).toBe(0);
    expect(nextStarIndex("ArrowDown", 3, 4)).toBe(0);
    expect(nextStarIndex("ArrowLeft", 0, 4)).toBe(3);
    expect(nextStarIndex("ArrowUp", 0, 4)).toBe(3);
    expect(nextStarIndex("ArrowRight", 0, 1)).toBe(0);
  });

  it("jumps to the first and the last with Home and End", () => {
    expect(nextStarIndex("Home", 2, 5)).toBe(0);
    expect(nextStarIndex("End", 2, 5)).toBe(4);
  });

  it("ignores other keys, and does nothing without stars", () => {
    expect(nextStarIndex("Enter", 0, 3)).toBeUndefined();
    expect(nextStarIndex("a", 0, 3)).toBeUndefined();
    expect(nextStarIndex("ArrowRight", 0, 0)).toBeUndefined();
  });
});

describe("starAfterRemoval", () => {
  it("is the star that took the place of the removed one", () => {
    expect(starAfterRemoval(["a", "c"], 1)).toBe("c");
  });

  it("wraps to the first when the last one was removed", () => {
    expect(starAfterRemoval(["a", "b"], 2)).toBe("a");
  });

  it("is nothing when no star is left", () => {
    expect(starAfterRemoval([], 0)).toBeUndefined();
  });
});
