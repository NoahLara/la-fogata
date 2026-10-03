import { describe, expect, it } from "vitest";
import type { Point } from "./layout";
import {
  OTHER_ANSWERED_SHARE,
  OTHER_STAR_DENSITY,
  otherStarCount,
  placeOtherStars,
  type OtherStarSpec,
} from "./otherStars";
import { panoramaWidth, sectionOf, wrapSigned } from "./panorama";
import { createRandom } from "./random";

const spec = (viewport: number, overrides: Partial<OtherStarSpec> = {}): OtherStarSpec => {
  const width = panoramaWidth(viewport);
  return {
    count: otherStarCount(width, 40, 240),
    width,
    top: 40,
    bottom: 240,
    spacing: 30,
    exclude: [],
    ...overrides,
  };
};

const gap = (a: Point, b: Point, width: number) =>
  Math.hypot(wrapSigned(a.x - b.x, width), a.y - b.y);

describe("how many stars of others", () => {
  it("follows the area of the panorama, at a fixed density", () => {
    const phone = otherStarCount(panoramaWidth(390), 40, 360);
    const laptop = otherStarCount(panoramaWidth(1440), 40, 360);
    const wide = otherStarCount(panoramaWidth(2560), 40, 360);
    expect(phone).toBeLessThan(laptop);
    expect(laptop).toBeLessThan(wide);
    expect(laptop / phone).toBeCloseTo(1440 / 390, 0);
    expect(phone / (panoramaWidth(390) * 320)).toBeCloseTo(OTHER_STAR_DENSITY, 4);
  });

  it("is about two hundred on a laptop", () => {
    const count = otherStarCount(panoramaWidth(1440), 40, 40 + 0.72 * 280);
    expect(count).toBeGreaterThan(150);
    expect(count).toBeLessThan(260);
  });

  it("is nothing for no sky", () => {
    expect(otherStarCount(0, 0, 0)).toBe(0);
    expect(otherStarCount(1000, 300, 100)).toBe(0);
  });
});

describe("placeOtherStars", () => {
  it("puts them across the whole panorama, in every section", () => {
    const s = spec(1280);
    const stars = placeOtherStars(s, createRandom(1));
    expect(stars.length).toBeGreaterThan(s.count * 0.9);
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
    const stars = placeOtherStars(s, createRandom(3));
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
      for (const star of placeOtherStars(s, createRandom(seed))) {
        const inBox =
          star.x >= box.left && star.x <= box.right && star.y >= box.top && star.y <= box.bottom;
        expect(inBox).toBe(false);
        expect(Math.hypot(star.x - moon.x, star.y - moon.y)).toBeGreaterThanOrEqual(moon.radius);
      }
    }
  });

  it("is the same for the same seed, and different for another", () => {
    const s = spec(800);
    expect(placeOtherStars(s, createRandom(7))).toEqual(placeOtherStars(s, createRandom(7)));
    expect(placeOtherStars(s, createRandom(7))).not.toEqual(placeOtherStars(s, createRandom(8)));
  });

  it("makes about a fifth of them answered", () => {
    expect(OTHER_ANSWERED_SHARE).toBe(0.2);
    const stars = placeOtherStars(spec(1280), createRandom(5));
    const share = stars.filter((star) => star.answered).length / stars.length;
    expect(share).toBeGreaterThan(0.12);
    expect(share).toBeLessThan(0.28);
    expect(
      placeOtherStars(spec(800, { answeredShare: 0 }), createRandom(5)).some((s) => s.answered),
    ).toBe(false);
    expect(
      placeOtherStars(spec(800, { answeredShare: 1 }), createRandom(5)).every((s) => s.answered),
    ).toBe(true);
  });

  it("gives each its own phase", () => {
    const stars = placeOtherStars(spec(800), createRandom(5));
    expect(new Set(stars.map((star) => star.phase)).size).toBe(stars.length);
  });

  it("leaves some out rather than crowd them when there is no room", () => {
    const s = spec(200, { count: 5000, spacing: 80 });
    const stars = placeOtherStars(s, createRandom(9));
    expect(stars.length).toBeLessThan(5000);
    expect(stars.length).toBeGreaterThan(0);
  });
});
