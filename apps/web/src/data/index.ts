import { MemoryDistantFires } from "./memoryDistantFires";
import { MemoryFire } from "./memoryFire";
import { MemoryPetitions } from "./memoryPetitions";
import { MemoryPresence } from "./memoryPresence";
import { randomKey } from "./randomKey";
import { BrowserKeyStore, type KeyStore } from "./keyStore";
import type { Person, Services } from "./types";

export type { Services } from "./types";

/** The in-memory services behind the UI, plus the demo-only handles a real server won't have. */
export interface LocalServices extends Services {
  presence: MemoryPresence;
  distantFires: MemoryDistantFires;
  petitions: MemoryPetitions;
}

interface LocalOptions {
  seatCount: number;
  /** People already seated when the services start. */
  initial?: readonly Person[];
  keys?: KeyStore;
  /** Development only (`?demo`): no daily limit on petitions. */
  unlimitedPetitions?: boolean;
}

let counter = 0;

export function createLocalServices(options: LocalOptions): LocalServices {
  const rand = Math.random;
  const presence = new MemoryPresence({
    seatCount: options.seatCount,
    rand,
    ...(options.initial ? { initial: options.initial } : {}),
  });
  const petitions = new MemoryPetitions({
    now: () => Date.now(),
    rand,
    keys: options.keys ?? new BrowserKeyStore(),
    newId: () => `petition-${Date.now().toString(36)}-${counter++}`,
    newKey: randomKey,
    ...(options.unlimitedPetitions ? { petitionsPerDay: Infinity } : {}),
  });
  const distantFires = new MemoryDistantFires(rand);
  const fire = new MemoryFire({ presence });
  return { presence, distantFires, fire, petitions, prayers: petitions };
}
