import type { Species } from "@/scene/characters/species";

/**
 * What the server will provide later. The UI only knows these interfaces; the in-memory versions next to them
 * stand in until the realtime server and the database exist. A burden is deliberately absent: it never leaves
 * the browser, so no service may ever receive it.
 */

export type Unsubscribe = () => void;

// Presence

export interface Person {
  id: string;
  species: Species;
  /** Index of the seat they sit in. */
  seat: number;
}

export type PresenceEvent =
  | { type: "joined"; person: Person }
  | { type: "left"; id: string }
  /** The same person, in the same seat, now as another animal: the old one leaves and the new one arrives. */
  | { type: "changed"; person: Person };

export type ChangeSpeciesResult =
  | { status: "changed"; person: Person }
  /** Someone else at this campfire already has that animal: one of each. */
  | { status: "taken" }
  /** It is the animal they already are. */
  | { status: "unchanged" }
  | { status: "not-seated" };

export interface PresenceService {
  /** Who the visitor is once they have sat down; undefined before that, or when every seat is taken. */
  readonly self: Person | undefined;
  /**
   * Sits the visitor at a free seat. They get their `preferred` animal if it is free at this campfire, otherwise
   * a free one. Resolves to undefined when the campfire has no room.
   */
  join(preferred?: Species): Promise<Person | undefined>;
  /** Swaps the visitor's animal, keeping their seat, when nobody else here is that animal. */
  changeSpecies(species: Species): Promise<ChangeSpeciesResult>;
  leave(): void;
  /** Everyone around the fire now, the visitor included. */
  people(): readonly Person[];
  subscribe(listener: (event: PresenceEvent) => void): Unsubscribe;
}

// Fire

export type WoodResult =
  { status: "thrown" } | { status: "cooling"; secondsLeft: number } | { status: "not-seated" };

export type FireEvent = { type: "wood"; by: string };

export interface FireService {
  /** The visitor throws a log. Everyone in the campfire sees it. */
  throwWood(): Promise<WoodResult>;
  /** Seconds before the visitor can throw again; 0 when they can now. */
  woodCooldown(): number;
  subscribe(listener: (event: FireEvent) => void): Unsubscribe;
}

// Petitions

export interface Petition {
  id: string;
  text: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
  prayers: number;
  /** Set once the author has marked it answered. */
  answered?: { at: number; note?: string };
  /** The visitor wrote this one. */
  mine: boolean;
  /** The visitor has already prayed for it. */
  prayed: boolean;
}

export type CreatePetitionResult =
  | { status: "created"; petition: Petition }
  | { status: "empty" }
  | { status: "too-long" }
  | { status: "daily-limit" }
  /** Signs of self-harm: never published. The UI shows the help screen. */
  | { status: "risk" };

export type AnswerPetitionResult =
  | { status: "answered"; petition: Petition }
  | { status: "not-yours" }
  | { status: "not-found" }
  | { status: "already-answered" }
  /** An answered petition always says how it happened. */
  | { status: "note-required" }
  | { status: "too-long" };

export type RemovePetitionResult =
  { status: "removed" } | { status: "not-yours" } | { status: "not-found" };

export type PetitionEvent =
  | { type: "added"; petition: Petition }
  | { type: "changed"; petition: Petition }
  /** An answered petition: a shooting star crosses every sky. */
  | { type: "answered"; petition: Petition }
  /** The author returned it to the fire: its star is gone. */
  | { type: "removed"; id: string };

export interface PetitionService {
  /** The petitions the sky shows now: about `SKY_SIZE`, those with fewer prayers first. */
  sky(): Promise<readonly Petition[]>;
  /** The visitor's own petitions that are still alive. */
  mine(): Promise<readonly Petition[]>;
  /** Whether the visitor has already left all the petitions a day allows. */
  dailyLimitReached(): Promise<boolean>;
  create(text: string): Promise<CreatePetitionResult>;
  /** The author marks it answered, with one line that says how it happened: it is required. */
  answer(id: string, note: string): Promise<AnswerPetitionResult>;
  /** The author returns it to the fire, for good. The day's petition stays used. */
  remove(id: string): Promise<RemovePetitionResult>;
  subscribe(listener: (event: PetitionEvent) => void): Unsubscribe;
}

// Prayers

export type PrayResult =
  | { status: "prayed"; prayers: number }
  | { status: "already-prayed"; prayers: number }
  | { status: "rate-limited" }
  | { status: "not-found" };

export interface PrayerService {
  pray(petitionId: string): Promise<PrayResult>;
}

export interface Services {
  presence: PresenceService;
  fire: FireService;
  petitions: PetitionService;
  prayers: PrayerService;
}
