import { SEAT_COUNT, SPECIES, type Person, type Species } from "./presence";

export type ChangeSpeciesOutcome =
  | { status: "changed"; person: Person }
  | { status: "taken" }
  | { status: "unchanged" }
  | { status: "not-seated" };

function pick<T>(items: readonly T[], rand: () => number): T | undefined {
  return items[Math.floor(rand() * items.length)];
}

/**
 * Who sits around one campfire: at most SEAT_COUNT people, one of each animal. Pure logic, no network:
 * the Durable Object holds one of these in memory.
 */
export class Roster {
  private readonly seated = new Map<string, Person>();

  constructor(private readonly rand: () => number = Math.random) {}

  people(): Person[] {
    return [...this.seated.values()];
  }

  isFull(): boolean {
    return this.seated.size >= SEAT_COUNT;
  }

  /** Sits `id` at a free seat with their preferred animal if it is free, otherwise a free one. Undefined when full. */
  join(id: string, preferred?: Species): Person | undefined {
    const existing = this.seated.get(id);
    if (existing) return existing;
    const people = this.people();
    const takenSeats = new Set(people.map((person) => person.seat));
    const takenSpecies = new Set(people.map((person) => person.species));
    const freeSeats = Array.from({ length: SEAT_COUNT }, (_, seat) => seat).filter(
      (seat) => !takenSeats.has(seat),
    );
    const freeSpecies = SPECIES.filter((species) => !takenSpecies.has(species));
    const seat = pick(freeSeats, this.rand);
    const species =
      preferred && !takenSpecies.has(preferred) ? preferred : pick(freeSpecies, this.rand);
    // One animal per seat and seven of each: a free seat always has a free animal.
    if (seat === undefined || species === undefined) return undefined;
    const person: Person = { id, species, seat };
    this.seated.set(id, person);
    return person;
  }

  changeSpecies(id: string, species: Species): ChangeSpeciesOutcome {
    const current = this.seated.get(id);
    if (!current) return { status: "not-seated" };
    if (current.species === species) return { status: "unchanged" };
    if (this.people().some((person) => person.species === species)) return { status: "taken" };
    const person: Person = { ...current, species };
    this.seated.set(id, person);
    return { status: "changed", person };
  }

  /** True when `id` was sitting here. */
  leave(id: string): boolean {
    return this.seated.delete(id);
  }
}
