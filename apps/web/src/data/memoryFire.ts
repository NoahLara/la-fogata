import { Emitter } from "./emitter";
import type { FireEvent, FireService, PresenceService, WoodResult } from "./types";

interface Options {
  presence: PresenceService;
}

/** The fire kept in this browser: anyone sitting there can throw wood whenever they like. */
export class MemoryFire implements FireService {
  private readonly events = new Emitter<FireEvent>();

  constructor(private readonly options: Options) {}

  async throwWood(): Promise<WoodResult> {
    const self = this.options.presence.self;
    if (!self) return { status: "not-seated" };
    this.events.emit({ type: "wood", by: self.id });
    return { status: "thrown" };
  }

  subscribe(listener: (event: FireEvent) => void) {
    return this.events.subscribe(listener);
  }
}
