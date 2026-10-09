import {
  clientEventSchema,
  IDLE_LIMIT_MS,
  PING_EVERY_MS,
  Roster,
  type ServerEvent,
} from "@fogata/shared";
import { Server, routePartykitRequest, type Connection, type WSMessage } from "partyserver";

/** A client has no reason to send more than this; anything bigger is dropped unread. */
const MAX_MESSAGE_LENGTH = 256;

function encode(event: ServerEvent): string {
  return JSON.stringify(event);
}

// Durable Object: one instance per campfire. Presence lives in its memory and nowhere else.
export class Campfire extends Server {
  private readonly roster = new Roster();
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
      connection.send(encode({ type: "welcome", self, people: this.roster.people() }));
      this.broadcast(encode({ type: "joined", person: self }), [connection.id]);
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

// Worker: stateless front door that sends each request to its campfire.
export default {
  async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
    const response = await routePartykitRequest(request, env);
    return response ?? new Response("ok");
  },
};
