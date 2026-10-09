import type { PartySocket } from "partysocket";
import { PING_EVERY_MS, serverEventSchema, type ServerEvent } from "@fogata/shared";
import type { Species } from "@/scene/characters/species";
import { MemoryPresence } from "./memoryPresence";
import type { RealtimeTarget } from "./realtimeTarget";
import type { ChangeSpeciesResult, Person } from "./types";

interface Options {
  target: RealtimeTarget;
  seatCount: number;
  rand: () => number;
}

/** The campfires are numbered; a full one sends you to the next, so nobody waits. */
const MAX_FIRES = 50;
/** If the server does not answer in this long, the visitor sits alone instead of waiting for it. */
const CONNECT_TIMEOUT_MS = 4000;
const CHANGE_TIMEOUT_MS = 3000;
/** After the connection is lost, how long before trying to sit down again (longer each time, up to the cap). */
const REJOIN_BASE_MS = 1500;
const REJOIN_CAP_MS = 10_000;
const PING = JSON.stringify({ type: "ping" });

type Outcome = "seated" | "full" | "unreachable";

/**
 * Presence from the realtime server: the campfire's Durable Object says who is sitting and where.
 * When the server cannot be reached the visitor sits alone in this browser (the in-memory behaviour),
 * so the app still works without it. Nobody else is ever invented.
 */
export class RealtimePresence extends MemoryPresence {
  private socket: PartySocket | undefined;
  private waitingForChange: ((person: Person) => void) | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private rejoinTimer: ReturnType<typeof setTimeout> | undefined;
  /** The visitor chose to leave: nothing may sit them down again. */
  private left = false;
  /** Looking for a seat right now. A second request waits for this one instead of opening another socket. */
  private sitting: Promise<Outcome> | undefined;

  constructor(private readonly realtime: Options) {
    super({ seatCount: realtime.seatCount, rand: realtime.rand });
  }

  override async join(preferred?: Species): Promise<Person | undefined> {
    if (this.me) return this.me;
    this.left = false;
    const outcome = await this.sitAtAnyFire(preferred);
    if (outcome === "seated") return this.me;
    return outcome === "unreachable" ? super.join(preferred) : undefined;
  }

  override async changeSpecies(species: Species): Promise<ChangeSpeciesResult> {
    const socket = this.socket;
    if (!socket) return super.changeSpecies(species);
    if (!this.me) return { status: "not-seated" };
    if (this.me.species === species) return { status: "unchanged" };
    if (this.people().some((person) => person.id !== this.me?.id && person.species === species)) {
      return { status: "taken" };
    }
    const changed = new Promise<Person | undefined>((resolve) => {
      const settle = (person?: Person) => {
        clearTimeout(timer);
        this.waitingForChange = undefined;
        resolve(person);
      };
      const timer = setTimeout(settle, CHANGE_TIMEOUT_MS);
      this.waitingForChange = settle;
    });
    socket.send(JSON.stringify({ type: "changeSpecies", species }));
    const person = await changed;
    // Silence from the server means somebody took that animal a moment before.
    return person ? { status: "changed", person } : { status: "taken" };
  }

  override leave(): void {
    this.left = true;
    this.stopTimers();
    // Forget the socket before closing it: closing can report "close" at once, and that must not look like a drop.
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
    this.clear();
  }

  private sitAtAnyFire(preferred?: Species): Promise<Outcome> {
    this.sitting ??= this.findSeat(preferred).finally(() => {
      this.sitting = undefined;
    });
    return this.sitting;
  }

  /** Tries the campfires in order until one has a seat. */
  private async findSeat(preferred?: Species): Promise<Outcome> {
    for (let fire = 1; fire <= MAX_FIRES; fire++) {
      const outcome = await this.sitAt(`fogata-${fire}`, preferred);
      if (outcome !== "full") return outcome;
    }
    return "full";
  }

  /** Opens a socket to one campfire and resolves once the server has said whether there is a seat. */
  private async sitAt(room: string, preferred?: Species): Promise<Outcome> {
    // Loaded on first use: the socket library is not needed to draw the scene.
    const { PartySocket } = await import("partysocket");
    return new Promise((resolve) => {
      const { host, protocol } = this.realtime.target;
      // The socket does not reconnect by itself: a dropped connection means leaving the fire.
      const socket = new PartySocket({ host, protocol, party: "campfire", room, maxRetries: 0 });
      let settled = false;
      const finish = (outcome: Outcome) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (outcome !== "seated") socket.close();
        resolve(outcome);
      };
      const timer = setTimeout(() => finish("unreachable"), CONNECT_TIMEOUT_MS);

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "join", ...(preferred ? { preferred } : {}) }));
      });
      socket.addEventListener("error", () => finish("unreachable"));
      socket.addEventListener("message", (message) => {
        const event = parse(message.data);
        if (!event) return;
        if (event.type === "full") return finish("full");
        if (event.type === "welcome") {
          this.socket = socket;
          this.startHeartbeat(socket);
          this.welcome(event.self, event.people);
          finish("seated");
          return;
        }
        this.apply(event);
      });
      socket.addEventListener("close", () => {
        if (!settled) return finish("unreachable");
        if (this.socket === socket) this.dropped();
      });
    });
  }

  /** The visitor is known as such before anyone is told they arrived. */
  private welcome(self: Person, people: readonly Person[]): void {
    this.me = self;
    // The visitor arrives; everyone else was already there.
    for (const person of people) {
      this.everyone.set(person.id, person);
      this.events.emit({ type: "joined", person, already: person.id !== self.id });
    }
  }

  private apply(event: ServerEvent): void {
    if (event.type === "joined") {
      this.everyone.set(event.person.id, event.person);
      this.events.emit({ type: "joined", person: event.person });
    } else if (event.type === "left") {
      this.remove(event.id);
    } else if (event.type === "changed") {
      this.everyone.set(event.person.id, event.person);
      if (event.person.id === this.me?.id) {
        this.me = event.person;
        this.waitingForChange?.(event.person);
      }
      this.events.emit({ type: "changed", person: event.person });
    }
  }

  /** The connection was lost: the fire is out of reach, so nobody is in view, until the visitor sits down again. */
  private dropped(): void {
    const species = this.me?.species;
    this.stopTimers();
    this.socket = undefined;
    this.clear();
    if (!this.left) this.rejoin(species, 1);
  }

  private rejoin(preferred: Species | undefined, attempt: number): void {
    const wait = Math.min(REJOIN_BASE_MS * attempt, REJOIN_CAP_MS);
    this.rejoinTimer = setTimeout(async () => {
      if (this.left || this.me) return; // they sat down again by themselves meanwhile
      const outcome = await this.sitAtAnyFire(preferred);
      // They left while the seat was being found.
      if (outcome === "seated" && this.left) return this.leave();
      // Still out of reach (or every fire is full): keep trying while the visitor stays.
      if (outcome !== "seated" && !this.left) this.rejoin(preferred, attempt + 1);
    }, wait);
  }

  /** Tells the campfire every few seconds that this device is still here. */
  private startHeartbeat(socket: PartySocket): void {
    clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => socket.send(PING), PING_EVERY_MS);
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
