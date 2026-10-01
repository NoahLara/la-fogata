import { describe, expect, it } from "vitest";
import { createRandom } from "./random";
import {
  distanceToSegment,
  nextShootingStarDelay,
  planShootingStar,
  SHOOTING_STAR_INTERVAL,
  type Keepout,
} from "./shootingStar";

const BOUNDS = { width: 1200, top: 20, bottom: 260 };
const KEEPOUTS: Keepout[] = [
  { x: 1000, y: 70, radius: 70 },
  { x: 880, y: 140, radius: 45 },
];

describe("distanceToSegment", () => {
  it("measures to the nearest point of the segment, not the infinite line", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distanceToSegment({ x: 5, y: 3 }, a, b)).toBeCloseTo(3);
    expect(distanceToSegment({ x: 14, y: 3 }, a, b)).toBeCloseTo(5);
  });
});

describe("nextShootingStarDelay", () => {
  it("is always between 40 and 60 seconds", () => {
    const rand = createRandom(1);
    for (let i = 0; i < 500; i++) {
      const delay = nextShootingStarDelay(rand);
      expect(delay).toBeGreaterThanOrEqual(SHOOTING_STAR_INTERVAL.min);
      expect(delay).toBeLessThanOrEqual(SHOOTING_STAR_INTERVAL.max);
    }
  });
});

describe("planShootingStar", () => {
  it("stays in the sky and never passes over the moon or Venus", () => {
    let planned = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const plan = planShootingStar(createRandom(seed), BOUNDS, KEEPOUTS);
      if (!plan) continue;
      planned++;
      for (const point of [plan.from, plan.to]) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(BOUNDS.width);
        expect(point.y).toBeGreaterThanOrEqual(BOUNDS.top);
        expect(point.y).toBeLessThanOrEqual(BOUNDS.bottom);
      }
      for (const keepout of KEEPOUTS) {
        expect(distanceToSegment(keepout, plan.from, plan.to)).toBeGreaterThan(keepout.radius);
      }
      expect(plan.duration).toBeGreaterThan(0.8);
      expect(plan.duration).toBeLessThan(1.2);
    }
    expect(planned).toBeGreaterThan(380);
  });

  it("gives up with undefined when nothing fits", () => {
    const everything: Keepout[] = [{ x: 600, y: 140, radius: 5000 }];
    expect(planShootingStar(createRandom(1), BOUNDS, everything)).toBeUndefined();
  });
});
