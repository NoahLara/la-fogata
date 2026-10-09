import { clientEventSchema, Fire, Roster, type ServerEvent } from "@fogata/shared";
import type { Connect, Link, LinkHandlers } from "./realtimeChannel";

interface Seat {
  link: Link;
  handlers: LinkHandlers;
  id: string;
}

/**
 * Campfires in memory for tests: the real `Roster` behind the same messages the Durable Object speaks, reached
 * through a `Connect` like the browser's. Never imported by the app.
 */
export class FakeCampfires {
  private readonly rosters = new Map<string, Roster>();
  private readonly fires = new Map<string, Fire>();
  private readonly seats = new Map<string, Seat[]>();
  private counter = 0;
  /** When true, nobody can reach the server. */
  unreachable = false;
  /** Every line the server received, with the room it came to. */
  readonly received: { room: string; data: string }[] = [];

  readonly connect: Connect = async (room, handlers) => {
    if (this.unreachable) throw new Error("unreachable");
    const roster = this.rosters.get(room) ?? new Roster();
    this.rosters.set(room, roster);
    const id = `p${this.counter++}`;
    const seats = this.seats.get(room) ?? [];
    this.seats.set(room, seats);
    const link: Link = {
      send: (data) => this.receive(room, id, data),
      // Like a real socket, closing reports "close" at once.
      close: () => this.release(room, id, true),
    };
    seats.push({ link, handlers, id });
    setTimeout(() => handlers.open(), 0);
    return link;
  };

  /** Who sits at a campfire now. */
  people(room: string) {
    return this.rosters.get(room)?.people() ?? [];
  }

  /** Fills a campfire with people who are not part of the test. */
  fill(room: string, count: number): void {
    const roster = this.rosters.get(room) ?? new Roster();
    this.rosters.set(room, roster);
    for (let i = 0; i < count; i++) roster.join(`filler-${room}-${i}`);
  }

  /** The server cuts off whoever is at `room` and has the given person id (the connection drops). */
  drop(room: string, id: string): void {
    this.release(room, id, true);
  }

  /** The id the server gave the n-th connection that reached `room`. */
  connectionIds(room: string): string[] {
    return (this.seats.get(room) ?? []).map((seat) => seat.id);
  }

  private fire(room: string): Fire {
    const fire = this.fires.get(room) ?? new Fire();
    this.fires.set(room, fire);
    return fire;
  }

  private say(room: string, id: string, event: ServerEvent): void {
    const seat = this.seats.get(room)?.find((candidate) => candidate.id === id);
    if (seat) setTimeout(() => seat.handlers.message(JSON.stringify(event)), 0);
  }

  private broadcast(room: string, event: ServerEvent, without?: string): void {
    for (const seat of this.seats.get(room) ?? []) {
      if (seat.id !== without) this.say(room, seat.id, event);
    }
  }

  private receive(room: string, id: string, data: string): void {
    this.received.push({ room, data });
    const parsed = clientEventSchema.safeParse(JSON.parse(data));
    const roster = this.rosters.get(room);
    if (!parsed.success || !roster) return;
    const event = parsed.data;
    if (event.type === "join") {
      const self = roster.join(id, event.preferred);
      if (!self) return this.say(room, id, { type: "full" });
      this.say(room, id, {
        type: "welcome",
        self,
        people: roster.people(),
        fuel: this.fire(room).level(),
      });
      this.broadcast(room, { type: "joined", person: self }, id);
    } else if (event.type === "wood") {
      if (roster.has(id)) {
        this.broadcast(room, { type: "wood", by: id, fuel: this.fire(room).throwLog() });
      }
    } else if (event.type === "changeSpecies") {
      const outcome = roster.changeSpecies(id, event.species);
      if (outcome.status === "changed") {
        this.broadcast(room, { type: "changed", person: outcome.person });
      }
    }
  }

  private release(room: string, id: string, report: boolean): void {
    const seats = this.seats.get(room) ?? [];
    const seat = seats.find((candidate) => candidate.id === id);
    if (!seat) return;
    seats.splice(seats.indexOf(seat), 1);
    if (this.rosters.get(room)?.leave(id)) this.broadcast(room, { type: "left", id });
    if (report) seat.handlers.close();
  }
}

export const later = (ms = 5) => new Promise<void>((resolve) => setTimeout(resolve, ms));
