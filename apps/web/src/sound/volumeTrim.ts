/** A volume slider's range: 0 is silent, the middle is the normal level, the top is a good deal louder. */
export const TRIM_MIN = 0;
export const TRIM_MAX = 100;
/** Where each slider starts: the fire's crackle well up, the music low under it. */
export const CRACKLE_DEFAULT = 75;
export const MUSIC_DEFAULT = 25;
/** The middle of the slider is the normal level (a multiplier of 1). */
export const TRIM_NORMAL = 50;
/** How much louder than normal the top of the slider is. */
const LOUDEST = 2.5;

/** A whole number from 0 to 100; anything that isn't a number falls back to `fallback` (where that slider starts). */
export function clampTrim(value: unknown, fallback: number): number {
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), TRIM_MIN), TRIM_MAX);
}

/**
 * What a volume slider multiplies its sound by: 0 at the bottom, exactly 1 (the normal level) in the middle,
 * rising to `LOUDEST` at the top.
 */
export function trimMultiplier(level: number): number {
  const value = clampTrim(level, TRIM_NORMAL);
  if (value <= TRIM_NORMAL) return value / TRIM_NORMAL;
  return 1 + ((value - TRIM_NORMAL) / (TRIM_MAX - TRIM_NORMAL)) * (LOUDEST - 1);
}
