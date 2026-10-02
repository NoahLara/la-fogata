import type { Point } from "./layout";

/** A log is thrown in three beats: the thrower swings, the log leaves their hands, and it flies to the fire. */
export const THROW = {
  /** Seconds from the start of the swing until the log leaves the thrower's hands. */
  release: 0.18,
  /** Seconds in the air. */
  flight: 0.75,
  /** How much the thrower stretches while throwing, and for how long. */
  swing: { amount: 0.07, seconds: 0.4 },
  /** How many turns the log makes in the air. */
  turns: 1.5,
} as const;

/** Where a log is `u` of the way through its flight (0..1): straight across, rising to `apex` units above the line in the middle. */
export function arcAt(from: Point, to: Point, apex: number, u: number): Point {
  return {
    x: from.x + (to.x - from.x) * u,
    y: from.y + (to.y - from.y) * u - apex * 4 * u * (1 - u),
  };
}

/** How far the log has turned, in radians, `u` of the way through its flight. */
export function spinAt(u: number, direction: 1 | -1 = 1): number {
  return direction * u * THROW.turns * Math.PI * 2;
}

/** How much taller the thrower is `elapsed` seconds into the swing: up and back to nothing. */
export function swingAt(elapsed: number): number {
  const u = Math.min(1, Math.max(0, elapsed / THROW.swing.seconds));
  return THROW.swing.amount * Math.sin(Math.PI * u);
}
