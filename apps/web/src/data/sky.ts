import { PETITION_LIFETIME_MS, ANSWERED_LIFETIME_MS, SKY_SIZE } from "./limits";
import { shuffled, type Random } from "@/scene/random";

/** What the lifetime rules need of a petition: when it was written and when it was answered. */
interface Lifetime {
  createdAt: number;
  answered?: { at: number } | undefined;
}

/** When a petition stops being shown: 30 days after it was written, or 30 after it was answered. */
export function expiresAt(petition: Lifetime): number {
  return petition.answered
    ? petition.answered.at + ANSWERED_LIFETIME_MS
    : petition.createdAt + PETITION_LIFETIME_MS;
}

export function isAlive(petition: Lifetime, now: number): boolean {
  return now < expiresAt(petition);
}

/**
 * The petitions a sky shows: the living ones with the fewest prayers first, so none goes unprayed, and in a
 * random order among those with the same count so different stars pass over time.
 */
export function pickSky<T extends Lifetime & { prayers: number }>(
  petitions: readonly T[],
  now: number,
  rand: Random,
  size = SKY_SIZE,
): T[] {
  return shuffled(
    petitions.filter((petition) => isAlive(petition, now)),
    rand,
  )
    .sort((a, b) => a.prayers - b.prayers)
    .slice(0, size);
}

/** How many petitions a sky of this width shows: about `SKY_SIZE` for every screen width of the panorama. */
export function skyLimit(panorama: number, viewport: number): number {
  if (!(viewport > 0) || !(panorama > 0)) return SKY_SIZE;
  return Math.max(SKY_SIZE, Math.round((SKY_SIZE * panorama) / viewport));
}
