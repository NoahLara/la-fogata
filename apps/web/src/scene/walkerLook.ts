import { smoothstep, lerp } from "./math";

/** The tint amount (see `nightTint`) of a character who has not yet reached any light: almost black, like a silhouette. */
export const DARK_TINT = 0.95;

/** How much of the fire's light has reached a walker, 0..1, from how far along its walk it is. Rises monotonically. */
export function exposureAt(progress: number): number {
  return smoothstep(0.05, 0.9, progress);
}

/** Opacity of a walker: it appears out of the darkness over the first stretch of its walk. */
export function fadeInAt(progress: number): number {
  return smoothstep(0, 0.12, progress);
}

/** The tint amount for a walker, from fully dark to the amount the fire gives it where it is. */
export function walkerTint(exposure: number, litTint: number): number {
  return lerp(DARK_TINT, litTint, exposure);
}

/** One step, in units of the character's height. */
export const STRIDE = 0.2;

export interface Bob {
  /** Lift in units of the character's height. */
  lift: number;
  /** Side-to-side sway in radians. */
  sway: number;
}

/** The soft bob of walking: a hop every step and a sway every two. Still when motion is reduced. */
export function bobAt(distanceInHeights: number, reduced: boolean): Bob {
  if (reduced) return { lift: 0, sway: 0 };
  const step = (distanceInHeights / STRIDE) * Math.PI;
  return { lift: Math.abs(Math.sin(step)) * 0.028, sway: Math.sin(step) * 0.035 };
}

/** How wide a character looks while turning: 0 when edge on, 1 when facing either view. Progress is 0..1 through the turn. */
export function turnWidth(progress: number): number {
  return Math.abs(Math.cos(Math.PI * progress));
}
