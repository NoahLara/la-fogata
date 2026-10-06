import type { Point } from "./layout";
import type { Random } from "./random";

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** How far a point is from the nearest point of the segment from `a` to `b`. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const along =
    lengthSquared === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(p.x - (a.x + dx * along), p.y - (a.y + dy * along));
}

/** A random number in [min, max). */
export function between(rand: Random, min: number, max: number): number {
  return min + rand() * (max - min);
}

/** A random whole number in [min, max], both ends included. Draws from `rand` exactly once. */
export function randomInt(rand: Random, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/** 0 up to `from`, 1 from `to` on, and a smooth S-curve between. */
export function smoothstep(from: number, to: number, value: number): number {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Moves `current` toward `target` exponentially, with time constant `tau` seconds. Frame-rate independent. */
export function easeToward(current: number, target: number, dt: number, tau: number): number {
  return target + (current - target) * Math.exp(-dt / tau);
}

/** A blend of two 0xRRGGBB colors, `t` of the way from `from` to `to`. */
export function mixColor(from: number, to: number, t: number): number {
  const channel = (shift: number) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
