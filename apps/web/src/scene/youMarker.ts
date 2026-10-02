import { clamp, smoothstep } from "./math";

/** How the scene points out which animal is the visitor's own. */
export const YOU = {
  /** Seconds the "you" label is fully visible after arriving. */
  labelHold: 4,
  /** Seconds it then takes to fade away. */
  labelFade: 1.5,
  /** Seconds a gesture's glow lasts, rising and falling. */
  glowSeconds: 1.6,
} as const;

/** Opacity of the label `elapsed` seconds after the visitor has sat down. */
export function youLabelAlpha(elapsed: number): number {
  if (elapsed < 0) return 0;
  return 1 - smoothstep(YOU.labelHold, YOU.labelHold + YOU.labelFade, elapsed);
}

/** Strength of the glow `elapsed` seconds after a gesture: up quickly, then slowly back to nothing. */
export function gestureGlowAt(elapsed: number): number {
  const u = clamp(elapsed / YOU.glowSeconds, 0, 1);
  if (u === 0 || u === 1) return 0;
  // Rises over the first fifth, then eases away.
  return u < 0.2 ? smoothstep(0, 0.2, u) : 1 - smoothstep(0.2, 1, u);
}
