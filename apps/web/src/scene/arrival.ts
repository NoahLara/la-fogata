import { SPECIES, type Species } from "./characters/species";
import { pick, type Random } from "./random";

export interface Arrival {
  species: Species;
  seat: number;
}

/**
 * Who sits down next: a random free seat, and an animal not already around the fire when there is one
 * (every animal is allowed in every seat). Nothing when the fire is full. A `preferred` animal wins when it is free.
 */
export function pickArrival(
  rand: Random,
  seatCount: number,
  takenSeats: ReadonlySet<number>,
  presentSpecies: ReadonlySet<Species>,
  preferred?: Species,
): Arrival | undefined {
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
