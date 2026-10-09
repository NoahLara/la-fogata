import { MemoryDistantFires } from "./memoryDistantFires";
import { MemoryFire } from "./memoryFire";
import { MemoryPetitions } from "./memoryPetitions";
import { MemoryPresence } from "./memoryPresence";
import { partySocketLink } from "./partySocketLink";
import { RealtimeChannel } from "./realtimeChannel";
import { RealtimeFire } from "./realtimeFire";
import { RealtimePresence } from "./realtimePresence";
import type { RealtimeTarget } from "./realtimeTarget";
import { randomKey } from "./randomKey";
import { BrowserKeyStore, type KeyStore } from "./keyStore";
import type { Person, Services } from "./types";

export type { Services } from "./types";

/** The in-memory services behind the UI. The server will replace them. */
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
  /** Where the realtime server is. Without it the visitor sits alone in this browser. */
  realtime?: RealtimeTarget | undefined;
}

let counter = 0;

export function createLocalServices(options: LocalOptions): LocalServices {
  const rand = Math.random;
  // One session with the campfire, shared by everything that listens to it.
  const channel = options.realtime
    ? new RealtimeChannel(partySocketLink(options.realtime))
    : undefined;
  const presence = channel
    ? new RealtimePresence({ channel, seatCount: options.seatCount, rand })
    : new MemoryPresence({
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
  });
  const distantFires = new MemoryDistantFires();
  const fire = channel ? new RealtimeFire({ channel, presence }) : new MemoryFire({ presence });
  return { presence, distantFires, fire, petitions, prayers: petitions };
}
