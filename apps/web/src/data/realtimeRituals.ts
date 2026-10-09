import { Emitter } from "./emitter";
import type { RealtimeChannel } from "./realtimeChannel";
import type { RitualEvent, RitualKind, RitualService } from "./types";

/**
 * What the others at the campfire hand over, and the visitor's own, told to them. Only the kind travels: the
 * campfire cannot know, and so cannot tell anyone, what was written. Without a server nobody is told.
 */
export class RealtimeRituals implements RitualService {
  private readonly events = new Emitter<RitualEvent>();

  constructor(private readonly channel: RealtimeChannel) {
    channel.subscribe((event) => {
      if (event.type === "ritual") {
        this.events.emit({ type: "ritual", kind: event.kind, by: event.by });
      }
    });
  }

  announce(kind: RitualKind): void {
    this.channel.send({ type: "ritual", kind });
  }

  subscribe(listener: (event: RitualEvent) => void) {
    return this.events.subscribe(listener);
  }
}
