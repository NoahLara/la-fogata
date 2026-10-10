import { SKY_SIZE } from "./limits";
import { shuffled, type Random } from "@/scene/random";

/**
 * The petitions a sky shows: the ones with the fewest prayers first, so none goes unprayed, and in a random order
 * among those with the same count so different stars pass over time. Petitions don't expire: a star stays until its
 * author returns it to the fire.
 */
export function pickSky<T extends { prayers: number }>(
  petitions: readonly T[],
  rand: Random,
  size = SKY_SIZE,
): T[] {
  return shuffled(petitions, rand)
    .sort((a, b) => a.prayers - b.prayers)
    .slice(0, size);
}

/** How many petitions a sky of this width shows: about `SKY_SIZE` for every screen width of the panorama. */
export function skyLimit(panorama: number, viewport: number): number {
  if (!(viewport > 0) || !(panorama > 0)) return SKY_SIZE;
  return Math.max(SKY_SIZE, Math.round((SKY_SIZE * panorama) / viewport));
}
