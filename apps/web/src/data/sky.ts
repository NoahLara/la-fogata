import { PETITION_LIFETIME_MS, ANSWERED_LIFETIME_MS, SKY_SIZE } from "./limits";
import { shuffled, type Random } from "@/scene/random";
import type { Petition } from "./types";

/** When a petition stops being shown: 30 days after it was written, or 30 after it was answered. */
export function expiresAt(petition: Pick<Petition, "createdAt" | "answered">): number {
  return petition.answered
    ? petition.answered.at + ANSWERED_LIFETIME_MS
    : petition.createdAt + PETITION_LIFETIME_MS;
}

export function isAlive(petition: Pick<Petition, "createdAt" | "answered">, now: number): boolean {
  return now < expiresAt(petition);
}

/**
 * The petitions a sky shows: the living ones with the fewest prayers first, so none goes unprayed, and in a
 * random order among those with the same count so different stars pass over time.
 */
export function pickSky<T extends Pick<Petition, "createdAt" | "answered" | "prayers">>(
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
