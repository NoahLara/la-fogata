import { describe, expect, it } from "vitest";
import {
  comfortMargin,
  offsetOf,
  panoramaWidth,
  screenX,
  sectionLeft,
  sectionOf,
  turnOf,
  turnToBring,
  turnToCenter,
  turnToCenterShowing,
  visibleSections,
  wrap,
  wrapSigned,
  type BringView,
} from "./panorama";

const VIEWPORT = 1000;
const WIDTH = panoramaWidth(VIEWPORT);

describe("wrap", () => {
  it("brings any number into one period", () => {
    expect(wrap(0, 4000)).toBe(0);
    expect(wrap(4000, 4000)).toBe(0);
    expect(wrap(4500, 4000)).toBe(500);
    expect(wrap(-1, 4000)).toBe(3999);
    expect(wrap(-8500, 4000)).toBe(3500);
  });

  it("never returns the period itself, even for a tiny negative number", () => {
    expect(wrap(-1e-18, 4000)).toBeLessThan(4000);
  });

  it("wrapSigned gives the short way round", () => {
    expect(wrapSigned(100, 4000)).toBe(100);
    expect(wrapSigned(3900, 4000)).toBe(-100);
    expect(wrapSigned(-3900, 4000)).toBe(100);
    expect(wrapSigned(2000, 4000)).toBe(-2000);
  });
});

describe("the panorama", () => {
  it("is four viewports wide", () => {
    expect(WIDTH).toBe(4000);
  });

  it("keeps the turn as a share of it, so the same view survives a different screen", () => {
    const turn = turnOf(1000, WIDTH);
    expect(turn).toBe(0.25);
    expect(offsetOf(turn, panoramaWidth(600))).toBe(600);
    expect(turnOf(offsetOf(0.9, WIDTH), WIDTH)).toBeCloseTo(0.9);
    expect(offsetOf(1.25, WIDTH)).toBe(1000);
  });

  it("puts a point on screen at its place minus the offset", () => {
    expect(screenX(300, 0, WIDTH, VIEWPORT)).toBe(300);
    expect(screenX(300, 100, WIDTH, VIEWPORT)).toBe(200);
  });

  it("wraps with no seam: a point just past the end shows just before the start", () => {
    // Turned a little past the point: it is a little off the left edge, not at the far end of the panorama.
    expect(screenX(20, 50, WIDTH, VIEWPORT)).toBe(-30);
    expect(screenX(3990, 3980, WIDTH, VIEWPORT)).toBe(10);
    // And one just past the seam shows just past the end of what is on screen.
    expect(screenX(10, 3990, WIDTH, VIEWPORT)).toBe(20);
    expect(screenX(10, 3500, WIDTH, VIEWPORT)).toBe(510);
  });

  it("always answers with the copy nearest the screen", () => {
    for (let px = 0; px < WIDTH; px += 137) {
      for (let offset = 0; offset < WIDTH; offset += 211) {
        const x = screenX(px, offset, WIDTH, VIEWPORT);
        expect(x).toBeGreaterThanOrEqual(-1500);
        expect(x).toBeLessThan(2500);
      }
    }
  });

  it("splits into four sections, one viewport wide", () => {
    expect(sectionOf(0, WIDTH)).toBe(0);
    expect(sectionOf(999, WIDTH)).toBe(0);
    expect(sectionOf(1000, WIDTH)).toBe(1);
    expect(sectionOf(3999, WIDTH)).toBe(3);
    expect(sectionOf(4000, WIDTH)).toBe(0);
    expect(sectionLeft(1, 0, WIDTH, VIEWPORT)).toBe(1000);
    expect(sectionLeft(1, 1500, WIDTH, VIEWPORT)).toBe(-500);
  });

  it("draws at most two sections (three with a margin), and the right ones", () => {
    expect(visibleSections(0, WIDTH, VIEWPORT)).toEqual([0]);
    expect(visibleSections(500, WIDTH, VIEWPORT)).toEqual([0, 1]);
    // Turned past the end: the last section and the first.
    expect(visibleSections(3500, WIDTH, VIEWPORT)).toEqual([0, 3]);
    expect(visibleSections(1000, WIDTH, VIEWPORT)).toEqual([1]);
    expect(visibleSections(1010, WIDTH, VIEWPORT)).toEqual([1, 2]);
    // With a margin, the neighbours that touch the screen's edges are drawn too.
    expect(visibleSections(1000, WIDTH, VIEWPORT, 48)).toEqual([0, 1, 2]);
    for (let offset = 0; offset < WIDTH; offset += 97) {
      expect(visibleSections(offset, WIDTH, VIEWPORT, 48).length).toBeLessThanOrEqual(3);
      expect(visibleSections(offset, WIDTH, VIEWPORT).length).toBeLessThanOrEqual(2);
    }
  });
});

describe("turnToBring", () => {
  const view = (offset: number): BringView => ({
    offset,
    viewport: VIEWPORT,
    width: WIDTH,
    margin: comfortMargin(VIEWPORT),
  });

  it("does nothing for a star that is already in view", () => {
    expect(turnToBring({ x: 500, y: 100 }, view(0))).toBe(0);
    expect(turnToBring({ x: 1500, y: 100 }, view(1000))).toBe(0);
  });

  it("turns toward a star that is off screen, the short way, until it is comfortably in view", () => {
    const delta = turnToBring({ x: 1500, y: 100 }, view(0));
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(1500);
    const x = screenX(1500, delta, WIDTH, VIEWPORT);
    expect(x).toBeGreaterThanOrEqual(comfortMargin(VIEWPORT) - 1e-6);
    expect(x).toBeLessThanOrEqual(VIEWPORT - comfortMargin(VIEWPORT) + 1e-6);
  });

  it("goes the short way round the seam", () => {
    const delta = turnToBring({ x: 3900, y: 100 }, view(200));
    expect(delta).toBeLessThan(0);
    expect(Math.abs(delta)).toBeLessThan(2000);
    expect(turnToBring({ x: 100, y: 100 }, view(3000))).toBeGreaterThan(0);
  });

  it("brings a star that is only just at the edge in by a small turn", () => {
    const delta = turnToBring({ x: 1010, y: 100 }, view(0));
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(500);
  });

  it("brings every star into view, from any turn", () => {
    for (let px = 0; px < WIDTH; px += 83) {
      for (let offset = 0; offset < WIDTH; offset += 173) {
        const delta = turnToBring({ x: px, y: 60 }, view(offset));
        const x = screenX(px, offset + delta, WIDTH, VIEWPORT);
        expect(x).toBeGreaterThanOrEqual(comfortMargin(VIEWPORT) - 1e-6);
        expect(x).toBeLessThanOrEqual(VIEWPORT - comfortMargin(VIEWPORT) + 1e-6);
      }
    }
  });
});

describe("turnToCenterShowing", () => {
  const view = (offset: number): BringView => ({
    offset,
    viewport: VIEWPORT,
    width: WIDTH,
    margin: comfortMargin(VIEWPORT),
  });

  it("centres a constellation that fits the screen", () => {
    const delta = turnToCenterShowing(1500, { x: 1300, y: 60 }, view(0));
    expect(screenX(1500, delta, WIDTH, VIEWPORT)).toBeCloseTo(VIEWPORT / 2, 6);
    expect(delta).toBe(turnToCenter(1500, 0, WIDTH, VIEWPORT));
  });

  it("turns a little further when the constellation is wider than the screen and the star is out of view", () => {
    const star = { x: 2400, y: 60 };
    const delta = turnToCenterShowing(1500, star, view(0));
    expect(delta).toBeGreaterThan(turnToCenter(1500, 0, WIDTH, VIEWPORT));
    const x = screenX(star.x, delta, WIDTH, VIEWPORT);
    expect(x).toBeLessThanOrEqual(VIEWPORT - comfortMargin(VIEWPORT) + 1e-6);
  });
});

describe("turnToCenter", () => {
  it("brings a point of the panorama to the middle of the screen, the short way round", () => {
    expect(turnToCenter(500, 0, WIDTH, VIEWPORT)).toBe(0);
    expect(turnToCenter(900, 0, WIDTH, VIEWPORT)).toBe(400);
    expect(turnToCenter(100, 0, WIDTH, VIEWPORT)).toBe(-400);
    // Across the seam.
    expect(turnToCenter(100, 3800, WIDTH, VIEWPORT)).toBe(-3800 + 4000 - 400 - 0 + 0 + 0);
    const delta = turnToCenter(1234, 777, WIDTH, VIEWPORT);
    expect(screenX(1234, 777 + delta, WIDTH, VIEWPORT)).toBeCloseTo(VIEWPORT / 2, 6);
  });
});
