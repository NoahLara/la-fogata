import { SPECIES, type Species } from "./characters/species";
import { pick, type Random } from "./random";

export interface DemoArrival {
  species: Species;
  seat: number;
}

/**
 * Who arrives next in the demo: a random free seat, and an animal not already around the fire when there is one
 * (every animal is allowed in every seat). Nothing when the fire is full.
 */
export function pickArrival(
  rand: Random,
  seatCount: number,
  takenSeats: ReadonlySet<number>,
  presentSpecies: ReadonlySet<Species>,
): DemoArrival | undefined {
  const freeSeats = Array.from({ length: seatCount }, (_, seat) => seat).filter(
    (seat) => !takenSeats.has(seat),
  );
  if (freeSeats.length === 0) return undefined;
  const freeSpecies = SPECIES.filter((species) => !presentSpecies.has(species));
  return {
    seat: pick(rand, freeSeats),
    species: pick(rand, freeSpecies.length ? freeSpecies : SPECIES),
  };
}
