import type { Graphics } from "pixi.js";
import type { Point } from "./layout";
import { between, clamp, toRadians } from "./math";
import type { Random } from "./random";

/** A circle the shooting star must stay clear of, such as the moon. */
export interface Keepout extends Point {
  radius: number;
}

export interface ShootingStarPlan {
  from: Point;
  to: Point;
  /** Seconds from first to last frame. */
  duration: number;
}

/** The part of the sky a shooting star may cross. */
interface SkyBounds {
  width: number;
  top: number;
  bottom: number;
}

/** Seconds between shooting stars: random in this range. */
export const SHOOTING_STAR_INTERVAL = { min: 40, max: 60 } as const;

/** How much of the path the glowing trail covers, and the room kept around each keepout. */
const TRAIL = 0.3;
const MARGIN = 12;

export function nextShootingStarDelay(rand: Random): number {
  return between(rand, SHOOTING_STAR_INTERVAL.min, SHOOTING_STAR_INTERVAL.max);
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const along =
    lengthSquared === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(p.x - (a.x + dx * along), p.y - (a.y + dy * along));
}

/**
 * A random straight path across the upper sky: a random side to start from and a random downward angle,
 * about a second long. Paths that leave the sky or come near a keepout are thrown away; `undefined` means
 * none worked out after `tries`.
 */
export function planShootingStar(
  rand: Random,
  bounds: SkyBounds,
  keepouts: readonly Keepout[],
  tries = 30,
): ShootingStarPlan | undefined {
  for (let i = 0; i < tries; i++) {
    const length = between(rand, 0.14, 0.28) * bounds.width;
    const angle = toRadians(between(rand, 12, 48));
    const direction = rand() < 0.5 ? -1 : 1;
    const from = {
      x: between(rand, 0.05, 0.95) * bounds.width,
      y: between(rand, bounds.top, bounds.top + (bounds.bottom - bounds.top) * 0.55),
    };
    const to = {
      x: from.x + Math.cos(angle) * length * direction,
      y: from.y + Math.sin(angle) * length,
    };
    if (to.x < 0 || to.x > bounds.width || to.y > bounds.bottom) continue;
    if (keepouts.some((k) => distanceToSegment(k, from, to) < k.radius + MARGIN)) continue;
    return { from, to, duration: between(rand, 0.85, 1.15) };
  }
  return undefined;
}

const SEGMENTS = 16;

/**
 * Draws the shooting star at progress `t` (0 to 1): a bright head with a thin trail that thins and fades
 * behind it, the whole thing fading in at the start and out at the end. `scale` is the scene's unit.
 */
export function drawShootingStar(
  g: Graphics,
  plan: ShootingStarPlan,
  t: number,
  scale: number,
): void {
  g.clear();
  if (t <= 0 || t >= 1) return;
  const at = (progress: number): Point => ({
    x: plan.from.x + (plan.to.x - plan.from.x) * progress,
    y: plan.from.y + (plan.to.y - plan.from.y) * progress,
  });
  const envelope = Math.min(1, t / 0.1) * Math.min(1, (1 - t) / 0.35);
  const tail = Math.max(0, t - TRAIL);
  for (let i = 0; i < SEGMENTS; i++) {
    const a = at(tail + ((t - tail) * i) / SEGMENTS);
    const b = at(tail + ((t - tail) * (i + 1)) / SEGMENTS);
    const strength = (i + 1) / SEGMENTS;
    g.moveTo(a.x, a.y)
      .lineTo(b.x, b.y)
      .stroke({
        width: Math.max(0.6, (0.4 + 1.5 * strength) * scale),
        color: 0xe6eeff,
        alpha: envelope * strength ** 1.7 * 0.9,
        cap: "round",
      });
  }
  const head = at(t);
  g.circle(head.x, head.y, 4.5 * scale).fill({ color: 0xcfdcff, alpha: envelope * 0.16 });
  g.circle(head.x, head.y, 1.3 * Math.max(1, scale)).fill({ color: 0xffffff, alpha: envelope });
}
