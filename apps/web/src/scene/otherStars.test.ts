import { describe, expect, it } from "vitest";
import type { Point } from "./layout";
import { placeOtherStar, placeOtherStars, type OtherStarSpec } from "./otherStars";
import { panoramaWidth, sectionOf, wrapSigned } from "./panorama";
import { createRandom } from "./random";

const spec = (viewport: number, overrides: Partial<OtherStarSpec> = {}): OtherStarSpec => ({
  width: panoramaWidth(viewport),
  top: 40,
  bottom: 240,
  spacing: 30,
  exclude: [],
  ...overrides,
});

const gap = (a: Point, b: Point, width: number) =>
  Math.hypot(wrapSigned(a.x - b.x, width), a.y - b.y);

describe("placeOtherStars", () => {
  it("puts them across the whole panorama, in every section", () => {
    const s = spec(1280);
    const stars = placeOtherStars(s, 120, createRandom(1));
    expect(stars.length).toBeGreaterThan(108);
    const sections = new Set(stars.map((star) => sectionOf(star.x, s.width)));
    expect(sections.size).toBe(4);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(s.width);
      expect(star.y).toBeGreaterThanOrEqual(s.top);
      expect(star.y).toBeLessThanOrEqual(s.bottom);
    }
  });

  it("keeps their distance from each other, the short way round the seam", () => {
    const s = spec(800);
    const stars = placeOtherStars(s, 100, createRandom(3));
    for (let i = 0; i < stars.length; i++) {
      for (let j = 0; j < i; j++) {
        expect(gap(stars[i]!, stars[j]!, s.width)).toBeGreaterThanOrEqual(s.spacing);
      }
    }
  });

  it("keeps out of the boxes it is told to, and of round places such as the moon", () => {
    const box = { left: 100, right: 700, top: 40, bottom: 160 };
    const moon = { x: 1500, y: 80, radius: 120 };
    const s = spec(800, { exclude: [box], keepouts: [moon] });
    for (const seed of [1, 2, 3, 4]) {
      for (const star of placeOtherStars(s, 100, createRandom(seed))) {
        const inBox =
          star.x >= box.left && star.x <= box.right && star.y >= box.top && star.y <= box.bottom;
        expect(inBox).toBe(false);
        expect(Math.hypot(star.x - moon.x, star.y - moon.y)).toBeGreaterThanOrEqual(moon.radius);
      }
    }
  });

  it("is the same for the same seed, and different for another", () => {
    const s = spec(800);
    expect(placeOtherStars(s, 50, createRandom(7))).toEqual(
      placeOtherStars(s, 50, createRandom(7)),
    );
    expect(placeOtherStars(s, 50, createRandom(7))).not.toEqual(
      placeOtherStars(s, 50, createRandom(8)),
    );
  });

  it("gives each its own phase", () => {
    const stars = placeOtherStars(spec(800), 50, createRandom(5));
    expect(new Set(stars.map((star) => star.phase)).size).toBe(stars.length);
  });

  it("leaves some out rather than crowd them when there is no room", () => {
    const stars = placeOtherStars(spec(200, { spacing: 80 }), 5000, createRandom(9));
    expect(stars.length).toBeLessThan(5000);
    expect(stars.length).toBeGreaterThan(0);
  });
});

describe("placeOtherStar", () => {
  it("gives nothing when there is no room, so the petition has no star", () => {
    const s = spec(200, { spacing: 100000 });
    expect(placeOtherStar(s, [{ x: 10, y: 100 }], createRandom(1))).toBeUndefined();
  });

  it("is settled by the random stream alone, so a petition's id keeps its spot", () => {
    const s = spec(800);
    expect(placeOtherStar(s, [], createRandom(42))).toEqual(
      placeOtherStar(s, [], createRandom(42)),
    );
  });
});
