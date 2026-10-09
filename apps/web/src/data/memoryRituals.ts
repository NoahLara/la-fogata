import { Emitter } from "./emitter";
import type { RitualEvent, RitualService } from "./types";

/** Rituals kept in this browser: nobody else is here to watch, so announcing is saying it to no one. */
export class MemoryRituals implements RitualService {
  protected readonly events = new Emitter<RitualEvent>();

  announce(): void {}

  subscribe(listener: (event: RitualEvent) => void) {
    return this.events.subscribe(listener);
  }
}
