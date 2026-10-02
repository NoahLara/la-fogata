import { WOOD_COOLDOWN_SECONDS, WoodCooldowns } from "@/scene/fuel";
import { Emitter } from "./emitter";
import type { FireEvent, FireService, PresenceService, WoodResult } from "./types";

interface Options {
  presence: PresenceService;
  /** Seconds from any clock that only goes forward. */
  now: () => number;
  cooldownSeconds?: number;
}

/** The wood rule (one log a minute each) kept in this browser. The server will enforce it for everyone. */
export class MemoryFire implements FireService {
  private readonly events = new Emitter<FireEvent>();
  private readonly cooldowns: WoodCooldowns;

  constructor(private readonly options: Options) {
    this.cooldowns = new WoodCooldowns(options.cooldownSeconds ?? WOOD_COOLDOWN_SECONDS);
  }

  async throwWood(): Promise<WoodResult> {
    const self = this.options.presence.self;
    if (!self) return { status: "not-seated" };
    const now = this.options.now();
    const secondsLeft = this.cooldowns.remaining(self.id, now);
    if (secondsLeft > 0) return { status: "cooling", secondsLeft };
    this.cooldowns.record(self.id, now);
    this.events.emit({ type: "wood", by: self.id });
    return { status: "thrown" };
  }

  woodCooldown(): number {
    const self = this.options.presence.self;
    return self ? this.cooldowns.remaining(self.id, this.options.now()) : 0;
  }

  subscribe(listener: (event: FireEvent) => void) {
    return this.events.subscribe(listener);
  }
}
