import type { Random } from "./random";

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
