import { MemoryDistantFires } from "./memoryDistantFires";
import { MemoryFire } from "./memoryFire";
import { MemoryPetitions } from "./memoryPetitions";
import { MemoryPresence } from "./memoryPresence";
import { MemoryRituals } from "./memoryRituals";
import { RemotePetitions } from "./remotePetitions";
import { partySocketLink } from "./partySocketLink";
import { RealtimeChannel } from "./realtimeChannel";
import { RealtimeFire } from "./realtimeFire";
import { RealtimePresence } from "./realtimePresence";
import { RealtimeRituals } from "./realtimeRituals";
import { apiBase, type RealtimeTarget } from "./realtimeTarget";
import { randomKey } from "./randomKey";
import { BrowserKeyStore, type KeyStore } from "./keyStore";
import type { Person, PetitionService, PrayerService, Services } from "./types";

export type { Services } from "./types";

/**
 * The services behind the UI. With a server (`realtime`) the people, the fire, the rituals and the petitions are the
 * campfire's; without one everything is kept in this browser and the visitor sits alone.
 */
export interface LocalServices extends Services {
  presence: MemoryPresence;
  distantFires: MemoryDistantFires;
  petitions: PetitionService;
  prayers: PrayerService;
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
  const keys = options.keys ?? new BrowserKeyStore();
  // The petitions last on the server, and the sky is everyone's; without one they live in this browser.
  const petitions = options.realtime
    ? new RemotePetitions({ baseUrl: apiBase(options.realtime), keys, newKey: randomKey })
    : new MemoryPetitions({
        now: () => Date.now(),
        rand,
        keys,
        newId: () => `petition-${Date.now().toString(36)}-${counter++}`,
        newKey: randomKey,
      });
  const distantFires = new MemoryDistantFires();
  const fire = channel ? new RealtimeFire({ channel, presence }) : new MemoryFire({ presence });
  const rituals = channel ? new RealtimeRituals(channel) : new MemoryRituals();
  return { presence, distantFires, fire, rituals, petitions, prayers: petitions };
}
