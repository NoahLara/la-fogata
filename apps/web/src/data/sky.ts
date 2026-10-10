import { SKY_SIZE } from "./limits";
import { pickSky as pickSharedSky } from "@fogata/shared";
import type { Random } from "@/scene/random";

/**
 * The petitions a sky shows (the choice itself is in `@fogata/shared`, so the server that keeps the petitions makes it
 * the same way): the ones with the fewest prayers first, in a random order among those with the same count.
 */
export function pickSky<T extends { prayers: number }>(
  petitions: readonly T[],
  rand: Random,
  size = SKY_SIZE,
): T[] {
  return pickSharedSky(petitions, rand, size);
}

/** How many petitions a sky of this width shows: about `SKY_SIZE` for every screen width of the panorama. */
export function skyLimit(panorama: number, viewport: number): number {
  if (!(viewport > 0) || !(panorama > 0)) return SKY_SIZE;
  return Math.max(SKY_SIZE, Math.round((SKY_SIZE * panorama) / viewport));
}
