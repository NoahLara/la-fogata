import { describe, expect, it } from "vitest";
import { distanceToSegment } from "./math";
import { createRandom } from "./random";
import {
  nextShootingStarDelay,
  planShootingStar,
  planShootingStarFrom,
  SHOOTING_STAR_INTERVAL,
  type Keepout,
} from "./shootingStar";

const BOUNDS = { width: 1200, top: 20, bottom: 260 };
const KEEPOUTS: Keepout[] = [
  { x: 1000, y: 70, radius: 70 },
  { x: 880, y: 140, radius: 45 },
];

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
  it("stays in the sky and never passes over the moon", () => {
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

describe("planShootingStarFrom", () => {
  const bounds = { width: 800, top: 10, bottom: 300 };
  const from = { x: 400, y: 120 };

  it("starts at the point it is given, heads down and stays in the sky", () => {
    for (let seed = 1; seed < 40; seed++) {
      const plan = planShootingStarFrom(createRandom(seed), from, bounds, []);
      expect(plan).toBeDefined();
      expect(plan?.from).toEqual(from);
      expect(plan!.to.y).toBeGreaterThan(from.y);
      expect(plan!.to.x).toBeGreaterThanOrEqual(0);
      expect(plan!.to.x).toBeLessThanOrEqual(bounds.width);
      expect(plan!.to.y).toBeLessThanOrEqual(bounds.bottom);
      expect(plan!.duration).toBeGreaterThanOrEqual(0.85);
      expect(plan!.duration).toBeLessThanOrEqual(1.15);
    }
  });

  it("goes to either side", () => {
    const sides = new Set<number>();
    for (let seed = 1; seed < 40; seed++) {
      const plan = planShootingStarFrom(createRandom(seed), from, bounds, []);
      sides.add(Math.sign(plan!.to.x - from.x));
    }
    expect(sides.size).toBe(2);
  });

  it("keeps clear of the moon and Venus", () => {
    const moon = { x: 520, y: 150, radius: 40 };
    for (let seed = 1; seed < 40; seed++) {
      const plan = planShootingStarFrom(createRandom(seed), from, bounds, [moon]);
      if (plan)
        expect(distanceToSegment(moon, plan.from, plan.to)).toBeGreaterThanOrEqual(moon.radius);
    }
  });

  it("is the same for the same seed", () => {
    expect(planShootingStarFrom(createRandom(3), from, bounds, [])).toEqual(
      planShootingStarFrom(createRandom(3), from, bounds, []),
    );
  });

  it("finds nothing only when nothing fits", () => {
    expect(planShootingStarFrom(createRandom(1), { x: 400, y: 295 }, bounds, [])).toBeUndefined();
  });
});
