import type { Point } from "./layout";
import { clamp, lerp, smoothstep } from "./math";

/** The journey of the golden light: it rises slowly with the smoke, swaying, then glides in an arc to its star. */
export interface FlightPlan {
  from: Point;
  /** Where the smoke's rise ends and the glide begins. */
  rise: Point;
  /** Bends the glide into an arc. */
  control: Point;
  to: Point;
  /** How far the sway strays sideways, in px. */
  sway: number;
  /** Total seconds. */
  duration: number;
}

export const RISE_SECONDS = 3.2;
export const GLIDE_SECONDS = 2.8;
/** Share of the path (not of the time) covered by the rise. */
const RISE_SHARE = 0.4;
const SWAY_CYCLES = 2.5;

/**
 * Plans the flight from the flames at `from` to the star at `to`, for a scene whose unit is `u`. The rise climbs
 * about `110 u` but never past the star, so the glide always goes up toward it, and the arc bows away from the
 * way the light travels.
 */
export function planFlight(from: Point, to: Point, u: number): FlightPlan {
  const riseY = Math.max(to.y + 30 * u, from.y - 110 * u);
  const rise = { x: from.x + (to.x - from.x) * 0.08, y: Math.min(riseY, from.y) };
  const dx = to.x - rise.x;
  const dy = to.y - rise.y;
  const bow = (to.x >= from.x ? -1 : 1) * 0.22;
  const control = {
    x: rise.x + dx * 0.4 - dy * bow,
    y: rise.y + dy * 0.4 + dx * bow,
  };
  return { from, rise, control, to, sway: 7 * u, duration: RISE_SECONDS + GLIDE_SECONDS };
}

/** Eases a leg: slow at the start and at the end. */
const ease = (a: number) => smoothstep(0, 1, a);

/** How far along the whole path the light is after `elapsed` seconds: 0 to 1, never going back. */
export function flightProgress(plan: FlightPlan, elapsed: number): number {
  const t = clamp(elapsed / plan.duration, 0, 1);
  const split = RISE_SECONDS / plan.duration;
  if (t <= split) return RISE_SHARE * ease(t / split);
  return RISE_SHARE + (1 - RISE_SHARE) * ease((t - split) / (1 - split));
}

/** Where the light is after `elapsed` seconds. At 0 it is at `from` and from `duration` on it is at `to`. */
export function lightAt(plan: FlightPlan, elapsed: number): Point {
  const progress = flightProgress(plan, elapsed);
  if (progress <= RISE_SHARE) {
    const e = progress / RISE_SHARE;
    return {
      // The sway fades in and out with the rise, so it starts and ends on the straight line.
      x:
        lerp(plan.from.x, plan.rise.x, e) +
        plan.sway * Math.sin(Math.PI * e) * Math.sin(2 * Math.PI * SWAY_CYCLES * e),
      y: lerp(plan.from.y, plan.rise.y, e),
    };
  }
  const e = (progress - RISE_SHARE) / (1 - RISE_SHARE);
  const a = (1 - e) * (1 - e);
  const b = 2 * (1 - e) * e;
  const c = e * e;
  return {
    x: a * plan.rise.x + b * plan.control.x + c * plan.to.x,
    y: a * plan.rise.y + b * plan.control.y + c * plan.to.y,
  };
}
