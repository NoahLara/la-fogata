import { createApi } from "@fogata/api";
import {
  clientEventSchema,
  Fire,
  IDLE_LIMIT_MS,
  PING_EVERY_MS,
  Roster,
  Throttle,
  type ServerEvent,
} from "@fogata/shared";
import { Server, routePartykitRequest, type Connection, type WSMessage } from "partyserver";

/** A client has no reason to send more than this; anything bigger is dropped unread. */
const MAX_MESSAGE_LENGTH = 256;

/** Anyone may throw as many logs as they like; this only drops absurd bursts (a held-down button, a script). */
const WOOD_LIMITS = { burst: 10, perSecond: 6 };
/** A ritual takes about eight seconds, so nobody hands things over more often than this. */
const RITUAL_LIMITS = { burst: 2, perSecond: 0.2 };

function encode(event: ServerEvent): string {
  return JSON.stringify(event);
}

// Durable Object: one instance per campfire. Presence lives in its memory and nowhere else.
export class Campfire extends Server {
  private readonly roster = new Roster();
  /** The fire's fuel: the same for everyone at this campfire, whoever drew it first. */
  private readonly fire = new Fire();
  private readonly woodFlood = new Throttle(WOOD_LIMITS);
  private readonly ritualFlood = new Throttle(RITUAL_LIMITS);
  private sweeper: ReturnType<typeof setInterval> | undefined;

  override onMessage(connection: Connection, message: WSMessage): void {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) return;
    let raw: unknown;
    try {
      raw = JSON.parse(message);
    } catch {
      return;
    }
    const parsed = clientEventSchema.safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data;
    this.roster.touch(connection.id);
    if (event.type === "ping") return;

    if (event.type === "join") {
      if (this.roster.people().some((person) => person.id === connection.id)) return;
      const self = this.roster.join(connection.id, event.preferred);
      if (!self) {
        connection.send(encode({ type: "full" }));
        connection.close(1000, "full");
        return;
      }
      this.startSweeping();
      connection.send(
        encode({ type: "welcome", self, people: this.roster.people(), fuel: this.fire.level() }),
      );
      this.broadcast(encode({ type: "joined", person: self }), [connection.id]);
      return;
    }

    if (event.type === "wood") {
      // Only someone sitting here can throw a log, and not in absurd bursts.
      if (!this.roster.has(connection.id) || !this.woodFlood.allow(connection.id)) return;
      this.broadcast(encode({ type: "wood", by: connection.id, fuel: this.fire.throwLog() }));
      return;
    }

    if (event.type === "ritual") {
      if (!this.roster.has(connection.id) || !this.ritualFlood.allow(connection.id)) return;
      // The others watch it; the one handing over has it on their own screen already. Nothing written travels.
      this.broadcast(encode({ type: "ritual", kind: event.kind, by: connection.id }), [
        connection.id,
      ]);
      return;
    }

    const outcome = this.roster.changeSpecies(connection.id, event.species);
    if (outcome.status === "changed") {
      this.broadcast(encode({ type: "changed", person: outcome.person }));
    }
  }

  override onClose(connection: Connection): void {
    this.release(connection.id);
  }

  /** Frees the seat and tells the others, once. */
  private release(id: string): void {
    this.woodFlood.forget(id);
    this.ritualFlood.forget(id);
    if (this.roster.leave(id)) {
      this.broadcast(encode({ type: "left", id }));
    }
    if (this.roster.people().length === 0) this.stopSweeping();
  }

  /**
   * A phone that sleeps or loses its signal never closes its socket, so the seat would stay taken. Whoever has
   * been silent for too long is given up, and their socket closed.
   */
  private startSweeping(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => {
      for (const id of this.roster.expired(IDLE_LIMIT_MS)) {
        this.release(id);
        this.getConnection(id)?.close(1001, "idle");
      }
    }, PING_EVERY_MS);
  }

  private stopSweeping(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = undefined;
  }

  override onRequest(): Response {
    return new Response("ok");
  }
}

// Worker: stateless front door. The petitions' API answers what is under /api; everything else goes to its campfire.
let api: ReturnType<typeof createApi> | undefined;

interface Env extends Record<string, unknown> {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    api ??= createApi({ db: env.DB });
    const answer = await api(request);
    if (answer) return answer;
    const response = await routePartykitRequest(request, env);
    return response ?? new Response("ok");
  },
};
