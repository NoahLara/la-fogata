import { Emitter } from "./emitter";
import type { ChannelEvent, RealtimeChannel } from "./realtimeChannel";
import type { FireEvent, FireService, PresenceService, WoodResult } from "./types";

interface Options {
  channel: RealtimeChannel;
  presence: PresenceService;
}

/**
 * The fire shared with everyone at the campfire. The visitor's own log flies at once; the campfire tells the others,
 * and tells every newcomer how much fuel the fire has, so it is the same fire for all. When the server cannot be
 * reached the log is only seen here, as before.
 */
export class RealtimeFire implements FireService {
  private readonly events = new Emitter<FireEvent>();

  constructor(private readonly options: Options) {
    options.channel.subscribe((event) => this.apply(event));
  }

  async throwWood(): Promise<WoodResult> {
    const self = this.options.presence.self;
    if (!self) return { status: "not-seated" };
    // At once, whatever the network takes: the echo of one's own log is not played twice.
    this.events.emit({ type: "wood", by: self.id });
    this.options.channel.send({ type: "wood" });
    return { status: "thrown" };
  }

  subscribe(listener: (event: FireEvent) => void) {
    return this.events.subscribe(listener);
  }

  private apply(event: ChannelEvent): void {
    if (event.type === "welcome") {
      this.events.emit({ type: "fuel", fuel: event.fuel });
    } else if (event.type === "wood" && event.by !== this.options.presence.self?.id) {
      this.events.emit({ type: "wood", by: event.by, fuel: event.fuel });
    }
  }
}
