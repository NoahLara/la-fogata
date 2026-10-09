import type { Species } from "@/scene/characters/species";
import { MemoryPresence } from "./memoryPresence";
import type { ChannelEvent, RealtimeChannel } from "./realtimeChannel";
import type { ChangeSpeciesResult, Person } from "./types";

interface Options {
  channel: RealtimeChannel;
  seatCount: number;
  rand: () => number;
}

const CHANGE_TIMEOUT_MS = 3000;

/**
 * Presence from the realtime server: the campfire's Durable Object says who is sitting and where.
 * When the server cannot be reached the visitor sits alone in this browser (the in-memory behaviour),
 * so the app still works without it. Nobody else is ever invented.
 */
export class RealtimePresence extends MemoryPresence {
  private waitingForChange: ((person: Person) => void) | undefined;
  private readonly channel: RealtimeChannel;

  constructor(options: Options) {
    super({ seatCount: options.seatCount, rand: options.rand });
    this.channel = options.channel;
    this.channel.rejoinWith(() => this.me?.species);
    this.channel.subscribe((event) => this.apply(event));
  }

  override async join(preferred?: Species): Promise<Person | undefined> {
    if (this.me) return this.me;
    const outcome = await this.channel.join(preferred);
    if (outcome === "seated") return this.me;
    return outcome === "unreachable" ? super.join(preferred) : undefined;
  }

  override async changeSpecies(species: Species): Promise<ChangeSpeciesResult> {
    if (!this.channel.connected) return super.changeSpecies(species);
    if (!this.me) return { status: "not-seated" };
    if (this.me.species === species) return { status: "unchanged" };
    if (this.people().some((person) => person.id !== this.me?.id && person.species === species)) {
      return { status: "taken" };
    }
    const changed = new Promise<Person | undefined>((resolve) => {
      const settle = (person?: Person) => {
        clearTimeout(timer);
        this.waitingForChange = undefined;
        resolve(person);
      };
      const timer = setTimeout(settle, CHANGE_TIMEOUT_MS);
      this.waitingForChange = settle;
    });
    this.channel.send({ type: "changeSpecies", species });
    const person = await changed;
    // Silence from the server means somebody took that animal a moment before.
    return person ? { status: "changed", person } : { status: "taken" };
  }

  override leave(): void {
    this.channel.leave();
    this.clear();
  }

  private apply(event: ChannelEvent): void {
    if (event.type === "welcome") {
      this.me = event.self;
      // The visitor arrives; everyone else was already there.
      for (const person of event.people) {
        this.everyone.set(person.id, person);
        this.events.emit({ type: "joined", person, already: person.id !== event.self.id });
      }
    } else if (event.type === "joined") {
      this.everyone.set(event.person.id, event.person);
      this.events.emit({ type: "joined", person: event.person });
    } else if (event.type === "left") {
      this.remove(event.id);
    } else if (event.type === "changed") {
      this.everyone.set(event.person.id, event.person);
      if (event.person.id === this.me?.id) {
        this.me = event.person;
        this.waitingForChange?.(event.person);
      }
      this.events.emit({ type: "changed", person: event.person });
    } else if (event.type === "dropped") {
      // The fire is out of reach, so nobody is in view, until the visitor sits down again.
      this.clear();
    }
  }
}
