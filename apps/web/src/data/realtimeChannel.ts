import {
  PING_EVERY_MS,
  serverEventSchema,
  type ClientEvent,
  type ServerEvent,
  type Species,
} from "@fogata/shared";
import { Emitter } from "./emitter";
import type { Unsubscribe } from "./types";

/** What the channel needs from a socket; the browser's comes from `partySocketLink`, tests bring their own. */
export interface Link {
  send(data: string): void;
  close(): void;
}

export interface LinkHandlers {
  open(): void;
  message(data: unknown): void;
  close(): void;
  error(): void;
}

/** Opens a link to the campfire called `room`. It does not reconnect by itself, and calls the handlers only after the returned promise has resolved. */
export type Connect = (room: string, handlers: LinkHandlers) => Promise<Link>;

export type ChannelEvent = ServerEvent | { type: "dropped" };

export type Outcome = "seated" | "full" | "unreachable";

export interface ChannelTiming {
  /** The campfires are numbered; a full one sends you to the next, so nobody waits. */
  maxFires: number;
  /** If the server does not answer in this long, it counts as out of reach. */
  connectTimeoutMs: number;
  /** After the connection is lost, how long before sitting down again (longer each time, up to the cap). */
  rejoinBaseMs: number;
  rejoinCapMs: number;
}

export const DEFAULT_TIMING: ChannelTiming = {
  maxFires: 50,
  connectTimeoutMs: 4000,
  rejoinBaseMs: 1500,
  rejoinCapMs: 10_000,
};

const PING = JSON.stringify({ type: "ping" });

/**
 * The visitor's session with the realtime server: it finds a campfire with a seat, keeps the connection alive,
 * sits the visitor down again when it is lost, and passes on what the campfire says. It knows nothing about what
 * the events mean; presence, the fire and the gestures each listen for their own.
 */
export class RealtimeChannel {
  private link: Link | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private rejoinTimer: ReturnType<typeof setTimeout> | undefined;
  /** The visitor chose to leave: nothing may sit them down again. */
  private left = false;
  /** Looking for a seat right now. A second request waits for this one instead of opening another socket. */
  private sitting: Promise<Outcome> | undefined;
  private rejoinAs: () => Species | undefined = () => undefined;
  private readonly events = new Emitter<ChannelEvent>();

  constructor(
    private readonly connect: Connect,
    private readonly timing: ChannelTiming = DEFAULT_TIMING,
  ) {}

  /** Seated at a campfire right now. */
  get connected(): boolean {
    return this.link !== undefined;
  }

  /** Who the visitor is when the connection is lost, so they sit down again as the same animal. */
  rejoinWith(preferred: () => Species | undefined): void {
    this.rejoinAs = preferred;
  }

  subscribe(listener: (event: ChannelEvent) => void): Unsubscribe {
    return this.events.subscribe(listener);
  }

  /** Sits the visitor at the first campfire with room. Every event, the welcome included, reaches listeners first. */
  join(preferred?: Species): Promise<Outcome> {
    this.left = false;
    return this.sit(preferred);
  }

  send(event: ClientEvent): void {
    this.link?.send(JSON.stringify(event));
  }

  leave(): void {
    this.left = true;
    this.stopTimers();
    // Forget the link before closing it: closing can report "close" at once, and that must not look like a drop.
    const link = this.link;
    this.link = undefined;
    link?.close();
  }

  private sit(preferred?: Species): Promise<Outcome> {
    this.sitting ??= this.findSeat(preferred).finally(() => {
      this.sitting = undefined;
    });
    return this.sitting;
  }

  /** Tries the campfires in order until one has a seat. */
  private async findSeat(preferred?: Species): Promise<Outcome> {
    for (let fire = 1; fire <= this.timing.maxFires; fire++) {
      const outcome = await this.sitAt(`fogata-${fire}`, preferred);
      if (outcome !== "full") return outcome;
    }
    return "full";
  }

  /** Opens a link to one campfire and resolves once the server has said whether there is a seat. */
  private async sitAt(room: string, preferred?: Species): Promise<Outcome> {
    return new Promise<Outcome>((resolve) => {
      let settled = false;
      let link: Link | undefined;
      const finish = (outcome: Outcome) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (outcome !== "seated") link?.close();
        resolve(outcome);
      };
      const timer = setTimeout(() => finish("unreachable"), this.timing.connectTimeoutMs);

      this.connect(room, {
        open: () => {
          const join: ClientEvent = { type: "join", ...(preferred ? { preferred } : {}) };
          link?.send(JSON.stringify(join));
        },
        error: () => finish("unreachable"),
        message: (data) => {
          const event = parse(data);
          if (!event || !link) return;
          if (event.type === "full") return finish("full");
          if (event.type === "welcome") {
            this.link = link;
            this.startHeartbeat(link);
            // Listeners learn who is there before the caller learns it is seated.
            this.events.emit(event);
            return finish("seated");
          }
          this.events.emit(event);
        },
        close: () => {
          if (!settled) return finish("unreachable");
          if (this.link === link) this.dropped();
        },
      }).then(
        (opened) => {
          link = opened;
          // A link that opened after the attempt gave up is of no use.
          if (settled) opened.close();
        },
        () => finish("unreachable"),
      );
    });
  }

  /** The connection was lost: the campfire is out of reach until the visitor sits down again. */
  private dropped(): void {
    const preferred = this.rejoinAs();
    this.stopTimers();
    this.link = undefined;
    this.events.emit({ type: "dropped" });
    if (!this.left) this.rejoin(preferred, 1);
  }

  private rejoin(preferred: Species | undefined, attempt: number): void {
    const wait = Math.min(this.timing.rejoinBaseMs * attempt, this.timing.rejoinCapMs);
    this.rejoinTimer = setTimeout(async () => {
      if (this.left || this.link) return; // they sat down again by themselves meanwhile
      const outcome = await this.sit(preferred);
      // They left while the seat was being found.
      if (outcome === "seated" && this.left) return this.leave();
      // Still out of reach (or every fire is full): keep trying while the visitor stays.
      if (outcome !== "seated" && !this.left) this.rejoin(preferred, attempt + 1);
    }, wait);
  }

  /** Tells the campfire every few seconds that this device is still here. */
  private startHeartbeat(link: Link): void {
    clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => link.send(PING), PING_EVERY_MS);
  }

  private stopTimers(): void {
    clearInterval(this.heartbeat);
    clearTimeout(this.rejoinTimer);
  }
}

function parse(data: unknown): ServerEvent | undefined {
  if (typeof data !== "string") return undefined;
  try {
    const parsed = serverEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
