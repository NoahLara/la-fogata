import { describe, expect, it } from "vitest";
import {
  flightProgress,
  GIFT_SECONDS,
  giftAt,
  planGift,
  lightAt,
  planFlight,
  planReturn,
  returnAt,
  returnProgress,
  RISE_SECONDS,
} from "./lightFlight";

const FIRE = { x: 195, y: 480 };

const cases = [
  { name: "phone", to: { x: 80, y: 120 }, u: 0.49 },
  { name: "desktop, star to the right", to: { x: 1100, y: 60 }, u: 1.4 },
  { name: "star straight above", to: { x: 195, y: 90 }, u: 1 },
] as const;

describe.each(cases)("the light's flight ($name)", ({ to, u }) => {
  const from = { ...FIRE };
  const plan = planFlight(from, to, u);
  const steps = Array.from({ length: 601 }, (_, i) => (i / 600) * plan.duration);

  it("starts at the fire and ends at its spot", () => {
    const start = lightAt(plan, 0);
    const end = lightAt(plan, plan.duration);
    expect(start.x).toBeCloseTo(from.x, 6);
    expect(start.y).toBeCloseTo(from.y, 6);
    expect(end.x).toBeCloseTo(to.x, 6);
    expect(end.y).toBeCloseTo(to.y, 6);
    // And it stays there if asked for later.
    expect(lightAt(plan, plan.duration + 10)).toEqual(end);
  });

  it("makes progress that never goes back, from 0 to 1", () => {
    let last = -1;
    for (const time of steps) {
      const progress = flightProgress(plan, time);
      expect(progress).toBeGreaterThanOrEqual(last);
      last = progress;
    }
    expect(flightProgress(plan, 0)).toBe(0);
    expect(flightProgress(plan, plan.duration)).toBe(1);
  });

  it("rises first: it is above the fire when the rise ends", () => {
    expect(lightAt(plan, RISE_SECONDS).y).toBeLessThan(from.y);
  });

  it("sways only a little to the side while it rises", () => {
    for (const time of steps.filter((t) => t <= RISE_SECONDS)) {
      const at = lightAt(plan, time);
      // Where it would be on the straight line up, at the same height.
      const along = (from.y - at.y) / (from.y - plan.rise.y);
      const straight = from.x + (plan.rise.x - from.x) * along;
      expect(Math.abs(at.x - straight)).toBeLessThanOrEqual(plan.sway + 1e-6);
    }
  });

  it("moves without jumps and slows as it arrives", () => {
    const gaps = steps.slice(1).map((time, i) => {
      const a = lightAt(plan, steps[i] as number);
      const b = lightAt(plan, time);
      return Math.hypot(b.x - a.x, b.y - a.y);
    });
    const farthest = Math.max(...gaps);
    expect(farthest).toBeLessThan(40 * Math.max(u, 1));
    expect(gaps[gaps.length - 1] as number).toBeLessThan(farthest / 5);
  });
});

describe.each(cases)("the light's flight back to the fire ($name)", ({ to: star, u }) => {
  const plan = planReturn({ ...star }, { ...FIRE }, u);
  const steps = Array.from({ length: 601 }, (_, i) => (i / 600) * plan.duration);
  const gaps = steps.slice(1).map((time, i) => {
    const a = returnAt(plan, steps[i] as number);
    const b = returnAt(plan, time);
    return Math.hypot(b.x - a.x, b.y - a.y);
  });

  it("starts at the star and ends at the fire, and stays there", () => {
    const start = returnAt(plan, 0);
    const end = returnAt(plan, plan.duration);
    expect(start.x).toBeCloseTo(star.x, 6);
    expect(start.y).toBeCloseTo(star.y, 6);
    expect(end.x).toBeCloseTo(FIRE.x, 6);
    expect(end.y).toBeCloseTo(FIRE.y, 6);
    expect(returnAt(plan, plan.duration + 10)).toEqual(end);
  });

  it("makes progress that never goes back, from 0 to 1", () => {
    let last = -1;
    for (const time of steps) {
      const progress = returnProgress(plan, time);
      expect(progress).toBeGreaterThanOrEqual(last);
      last = progress;
    }
    expect(returnProgress(plan, 0)).toBe(0);
    expect(returnProgress(plan, plan.duration)).toBe(1);
  });

  it("eases out: fastest at the start, slowing into the flames", () => {
    expect(gaps[0] as number).toBeGreaterThan((gaps[gaps.length - 1] as number) * 5);
    // Each step is no longer than the one before it.
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i] as number).toBeLessThanOrEqual((gaps[i - 1] as number) * 1.15 + 1e-6);
    }
  });

  it("bows into an arc instead of a straight line", () => {
    const middle = returnAt(plan, plan.duration * 0.3);
    const t = returnProgress(plan, plan.duration * 0.3);
    const straight = {
      x: star.x + (FIRE.x - star.x) * t,
      y: star.y + (FIRE.y - star.y) * t,
    };
    expect(Math.hypot(middle.x - straight.x, middle.y - straight.y)).toBeGreaterThan(1);
  });
});

describe("the small light sent to another person's star", () => {
  const paws = { x: 200, y: 460 };
  const star = { x: 330, y: 90 };

  it("starts at the animal's paws and ends in the star", () => {
    const plan = planGift(paws, star);
    expect(giftAt(plan, 0)).toEqual(paws);
    const end = giftAt(plan, GIFT_SECONDS);
    expect(end.x).toBeCloseTo(star.x, 5);
    expect(end.y).toBeCloseTo(star.y, 5);
    expect(giftAt(plan, GIFT_SECONDS + 3)).toEqual(giftAt(plan, GIFT_SECONDS));
  });

  it("always rises toward the star, never dipping back", () => {
    const plan = planGift(paws, star);
    let lastY = Infinity;
    for (let t = 0; t <= GIFT_SECONDS; t += 0.1) {
      const { y } = giftAt(plan, t);
      expect(y).toBeLessThanOrEqual(lastY + 1e-6);
      lastY = y;
    }
  });
});
