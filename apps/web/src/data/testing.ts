/**
 * Helpers for tests only: the in-memory services with ways to make other people appear, which a real server
 * brings by itself. Nothing in the app imports this file, so none of it ships.
 */
import { createRandom } from "@/scene/random";
import { DAY } from "./limits";
import { MemoryDistantFires } from "./memoryDistantFires";
import { MemoryFire } from "./memoryFire";
import { MemoryPetitions } from "./memoryPetitions";
import { MemoryPresence } from "./memoryPresence";
import { isAlive } from "./sky";
import type { DistantFire, Person, Petition } from "./types";
import { BrowserKeyStore, type KeyStore } from "./keyStore";
import { randomKey } from "./randomKey";

export class TestPresence extends MemoryPresence {
  private nextPeer = 1;

  /** Someone else sits down. */
  addPeer(): Person | undefined {
    return this.seat(`peer-${this.nextPeer++}`, false);
  }

  /** Someone else leaves. The visitor can't be sent away this way. */
  removePeer(id: string): void {
    if (id !== this.me?.id) this.remove(id);
  }
}

export class TestPetitions extends MemoryPetitions {
  /** A petition someone else wrote. */
  seedOther(
    text: string,
    options: {
      prayers?: number;
      createdAt?: number;
      /** How many days ago it was written. */
      daysAgo?: number;
      answered?: string;
    } = {},
  ): Petition {
    const record = this.add(text, "someone-else");
    record.prayers = options.prayers ?? 0;
    if (options.createdAt !== undefined) record.createdAt = options.createdAt;
    else if (options.daysAgo !== undefined)
      record.createdAt = this.options.now() - options.daysAgo * DAY;
    if (options.answered !== undefined) {
      record.answered = {
        // Answered some time after it was written, and never in the future.
        at: Math.min(
          this.options.now(),
          record.createdAt + Math.ceil((options.daysAgo ?? 0) / 2) * DAY,
        ),
        ...(options.answered ? { note: options.answered } : {}),
      };
    }
    return this.view(record);
  }

  /** Someone else is with one of the visitor's petitions. */
  simulateAccompany(id: string): boolean {
    const record = this.records.get(id);
    if (!record || !isAlive(record, this.options.now()) || !this.isMine(record)) return false;
    record.prayers++;
    const petition = this.view(record);
    this.events.emit({ type: "accompanied", petition });
    return true;
  }
}

export class TestDistantFires extends MemoryDistantFires {
  private next = 1;

  /** Another campfire lights, with this many people at it. */
  light(people: number): void {
    this.set([...this.fires(), { id: `fire-${this.next++}`, people }]);
  }

  /** The most recently lit campfire goes out. */
  putOutLast(): void {
    this.set(this.fires().slice(0, -1));
  }

  /** The server says exactly which campfires burn. */
  setFires(fires: readonly DistantFire[]): void {
    this.set(fires);
  }
}

interface TestServicesOptions {
  seatCount: number;
  initial?: readonly Person[];
  keys?: KeyStore;
  seed?: number;
  now?: () => number;
}

/** The services as the UI uses them, with the test handles on top. */
export function createTestServices(options: TestServicesOptions) {
  const rand = createRandom(options.seed ?? 1);
  const presence = new TestPresence({
    seatCount: options.seatCount,
    rand,
    ...(options.initial ? { initial: options.initial } : {}),
  });
  let counter = 0;
  const petitions = new TestPetitions({
    now: options.now ?? (() => Date.now()),
    rand,
    keys: options.keys ?? new BrowserKeyStore(),
    newId: () => `petition-${counter++}`,
    newKey: randomKey,
  });
  const distantFires = new TestDistantFires();
  const fire = new MemoryFire({ presence });
  return { presence, distantFires, fire, petitions, prayers: petitions };
}
