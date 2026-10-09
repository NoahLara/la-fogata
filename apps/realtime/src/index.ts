import { clientEventSchema, Roster, type ServerEvent } from "@fogata/shared";
import { Server, routePartykitRequest, type Connection, type WSMessage } from "partyserver";

/** A client has no reason to send more than this; anything bigger is dropped unread. */
const MAX_MESSAGE_LENGTH = 256;

function encode(event: ServerEvent): string {
  return JSON.stringify(event);
}

// Durable Object: one instance per campfire. Presence lives in its memory and nowhere else.
export class Campfire extends Server {
  private readonly roster = new Roster();

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

    if (event.type === "join") {
      if (this.roster.people().some((person) => person.id === connection.id)) return;
      const self = this.roster.join(connection.id, event.preferred);
      if (!self) {
        connection.send(encode({ type: "full" }));
        connection.close(1000, "full");
        return;
      }
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
    if (this.roster.leave(connection.id)) {
      this.broadcast(encode({ type: "left", id: connection.id }));
    }
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
