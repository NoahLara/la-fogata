import type { View } from "./characters";
import { clamp } from "./math";

/** A value that depends on how far a seat is from the fire and how strong the fire is, kept within [min, max]. */
interface Curve {
  base: number;
  /** Added per unit of seat distance (see `Seated.distance`). */
  perDistance: number;
  /** Subtracted per unit the fire's intensity is above 1. */
  perIntensity: number;
  min: number;
  max: number;
}

export function evaluateCurve(curve: Curve, distance: number, intensity: number): number {
  return clamp(
    curve.base + distance * curve.perDistance - (intensity - 1) * curve.perIntensity,
    curve.min,
    curve.max,
  );
}

/** How the fire lights a character, and the log it may sit on, as seen from one view. */
export interface ViewLighting {
  /** How far the body is multiplied toward the night colour (0..1). */
  bodyTint: Curve;
  /** Base opacity of the warm light over the body, the shade on its far side, and the thin rim along its edges. */
  litAlpha: number;
  shadeAlpha: number;
  rimAlpha: number;
  /** How far the rim reaches in from the edge, and how far its falloff leans toward the fire, in local units. */
  rimFade: number;
  rimLean: number;
  /** Like `bodyTint`, for the log. */
  logTint: Curve;
}

/** Seen from behind means backlit: near-black with a bright rim, and a wider one. */
const BACKLIT: ViewLighting = {
  bodyTint: { base: 0.94, perDistance: 0, perIntensity: 0.04, min: 0.86, max: 0.96 },
  litAlpha: 0.2,
  shadeAlpha: 0.55,
  rimAlpha: 1.1,
  rimFade: 3,
  rimLean: 1.2,
  logTint: { base: 0.5, perDistance: 0, perIntensity: 0, min: 0.5, max: 0.5 },
};

/** Seen in profile or head-on: lit by the fire, with a thin rim hugging the edge. */
const FIRELIT: ViewLighting = {
  bodyTint: { base: 0.46, perDistance: 0.1, perIntensity: 0.1, min: 0.3, max: 0.6 },
  litAlpha: 0.6,
  shadeAlpha: 1,
  rimAlpha: 0.7,
  rimFade: 2.2,
  rimLean: 1,
  logTint: { base: 0.2, perDistance: 0.18, perIntensity: 0.1, min: 0.08, max: 0.45 },
};

/** It is the view that decides the lighting, not how far the seat is from the fire line. */
export const VIEW_LIGHTING: Record<View, ViewLighting> = {
  back: BACKLIT,
  side: FIRELIT,
  front: FIRELIT,
};
