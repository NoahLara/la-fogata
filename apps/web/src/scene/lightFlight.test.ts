import { describe, expect, it } from "vitest";
import { flightProgress, lightAt, planFlight, RISE_SECONDS } from "./lightFlight";

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
