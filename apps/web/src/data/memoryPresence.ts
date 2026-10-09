import { pickArrival } from "@/scene/arrival";
import type { Random } from "@/scene/random";
import type { Species } from "@/scene/characters/species";
import { Emitter } from "./emitter";
import type { ChangeSpeciesResult, Person, PresenceEvent, PresenceService } from "./types";

interface Options {
  seatCount: number;
  rand: Random;
  /** People who are already sitting there when the service starts. */
  initial?: readonly Person[];
}

/** Presence kept in this browser: only the visitor sits here until the server brings real people. */
export class MemoryPresence implements PresenceService {
  protected readonly everyone = new Map<string, Person>();
  protected readonly events = new Emitter<PresenceEvent>();
  protected me: Person | undefined;

  constructor(private readonly options: Options) {
    for (const person of options.initial ?? []) this.everyone.set(person.id, person);
  }

  get self(): Person | undefined {
    return this.me;
  }

  async join(preferred?: Species): Promise<Person | undefined> {
    if (this.me) return this.me;
    return this.seat("you", true, preferred);
  }

  async changeSpecies(species: Species): Promise<ChangeSpeciesResult> {
    if (!this.me) return { status: "not-seated" };
    if (this.me.species === species) return { status: "unchanged" };
    if (this.people().some((person) => person.id !== this.me?.id && person.species === species)) {
      return { status: "taken" };
    }
    const person: Person = { ...this.me, species };
    this.me = person;
    this.everyone.set(person.id, person);
    this.events.emit({ type: "changed", person });
    return { status: "changed", person };
  }

  leave(): void {
    if (!this.me) return;
    const { id } = this.me;
    this.me = undefined;
    this.remove(id);
  }

  people(): readonly Person[] {
    return [...this.everyone.values()];
  }

  subscribe(listener: (event: PresenceEvent) => void) {
    return this.events.subscribe(listener);
  }

  /** Seats someone at a free seat. The visitor is known as such before anyone is told they arrived. */
  protected seat(id: string, isSelf: boolean, preferred?: Species): Person | undefined {
    const people = this.people();
    const arrival = pickArrival(
      this.options.rand,
      this.options.seatCount,
      new Set(people.map((person) => person.seat)),
      new Set<Species>(people.map((person) => person.species)),
      preferred,
    );
    if (!arrival) return undefined;
    const person: Person = { id, ...arrival };
    this.everyone.set(id, person);
    if (isSelf) this.me = person;
    this.events.emit({ type: "joined", person });
    return person;
  }

  /** Nobody is in view any more, the visitor included. */
  protected clear(): void {
    this.me = undefined;
    for (const id of [...this.everyone.keys()]) this.remove(id);
  }

  protected remove(id: string): void {
    if (this.everyone.delete(id)) this.events.emit({ type: "left", id });
  }
}
