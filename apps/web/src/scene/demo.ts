import { SPECIES, type Species } from "./characters/species";
import { pick, type Random } from "./random";
import type { MemberInfo } from "./roster";

export interface DemoArrival {
  species: Species;
  seat: number;
}

/**
 * Who arrives next in the demo: a random free seat, and an animal not already around the fire when there is one
 * (every animal is allowed in every seat). Nothing when the fire is full. A `preferred` animal wins when it is free.
 */
export function pickArrival(
  rand: Random,
  seatCount: number,
  takenSeats: ReadonlySet<number>,
  presentSpecies: ReadonlySet<Species>,
  preferred?: Species,
): DemoArrival | undefined {
  const freeSeats = Array.from({ length: seatCount }, (_, seat) => seat).filter(
    (seat) => !takenSeats.has(seat),
  );
  if (freeSeats.length === 0) return undefined;
  const freeSpecies = SPECIES.filter((species) => !presentSpecies.has(species));
  const species =
    preferred && !presentSpecies.has(preferred)
      ? preferred
      : pick(rand, freeSpecies.length ? freeSpecies : SPECIES);
  return { seat: pick(rand, freeSeats), species };
}

/** Who leaves next in the demo: one of those sitting by the fire, chosen at random. Nothing when no one is. */
export function pickLeaver(rand: Random, members: readonly MemberInfo[]): string | undefined {
  const seated = members.filter((member) => member.status === "seated");
  return seated.length ? pick(rand, seated).id : undefined;
}

/** Who throws wood next in the demo: someone sitting by the fire who can, or how long until someone can. */
export type ThrowerChoice = { id: string } | { wait: number };

export function pickThrower(
  rand: Random,
  members: readonly MemberInfo[],
  cooldownOf: (id: string) => number,
): ThrowerChoice | undefined {
  const seated = members.filter((member) => member.status === "seated");
  if (seated.length === 0) return undefined;
  const ready = seated.filter((member) => cooldownOf(member.id) === 0);
  if (ready.length > 0) return { id: pick(rand, ready).id };
  return { wait: Math.min(...seated.map((member) => cooldownOf(member.id))) };
}
