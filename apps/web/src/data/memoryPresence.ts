import { pickArrival } from "@/scene/demo";
import type { Random } from "@/scene/random";
import type { Species } from "@/scene/characters/species";
import { Emitter } from "./emitter";
import type { Person, PresenceEvent, PresenceService } from "./types";

interface Options {
  seatCount: number;
  rand: Random;
  /** People who are already sitting there, for example when the scene starts full in development. */
  initial?: readonly Person[];
}

/** Presence kept in this browser. Other people can only be made up for the demo; the server will bring real ones. */
export class MemoryPresence implements PresenceService {
  private readonly everyone = new Map<string, Person>();
  private readonly events = new Emitter<PresenceEvent>();
  private nextPeer = 1;
  private me: Person | undefined;

  constructor(private readonly options: Options) {
    for (const person of options.initial ?? []) this.everyone.set(person.id, person);
  }

  get self(): Person | undefined {
    return this.me;
  }

  async join(): Promise<Person | undefined> {
    if (this.me) return this.me;
    return this.seat("you", true);
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

  /** Demo only: someone else sits down. */
  addPeer(): Person | undefined {
    return this.seat(`demo-${this.nextPeer++}`, false);
  }

  /** Demo only: someone else leaves. The visitor can't be sent away this way. */
  removePeer(id: string): void {
    if (id !== this.me?.id) this.remove(id);
  }

  /** Seats someone at a free seat. The visitor is known as such before anyone is told they arrived. */
  private seat(id: string, isSelf: boolean): Person | undefined {
    const people = this.people();
    const arrival = pickArrival(
      this.options.rand,
      this.options.seatCount,
      new Set(people.map((person) => person.seat)),
      new Set<Species>(people.map((person) => person.species)),
    );
    if (!arrival) return undefined;
    const person: Person = { id, ...arrival };
    this.everyone.set(id, person);
    if (isSelf) this.me = person;
    this.events.emit({ type: "joined", person });
    return person;
  }

  private remove(id: string): void {
    if (this.everyone.delete(id)) this.events.emit({ type: "left", id });
  }
}
