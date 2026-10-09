import type { ContentIssue } from "@/moderation/content";
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
  | {
      type: "joined";
      person: Person;
      /** They were already sitting when the visitor arrived: they are simply there, they do not walk in. */
      already?: boolean;
    }
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

export type WoodResult = { status: "thrown" } | { status: "not-seated" };

export type FireEvent =
  /** Someone threw a log. For other people's, `fuel` is the fire's fuel once it has landed, as the campfire keeps it. */
  | { type: "wood"; by: string; fuel?: number }
  /** How much fuel the fire has right now, as the campfire keeps it: what a late arrival sees. */
  | { type: "fuel"; fuel: number };

export interface FireService {
  /** The visitor throws a log. Everyone in the campfire sees it. */
  throwWood(): Promise<WoodResult>;
  subscribe(listener: (event: FireEvent) => void): Unsubscribe;
}

// Petitions

export interface Petition {
  id: string;
  text: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
  /** The day it was written, `YYYY-MM-DD`: what a letter is dated with. */
  createdOn: string;
  prayers: number;
  /** Set once the author has marked it answered; `on` is the day, `YYYY-MM-DD`. */
  answered?: { at: number; on: string; note?: string };
  /** The visitor wrote this one. */
  mine: boolean;
  /** The visitor is already with it (the one counter, whether it is waiting or answered). */
  prayed: boolean;
}

export type CreatePetitionResult =
  | { status: "created"; petition: Petition }
  | { status: "empty" }
  | { status: "too-long" }
  | { status: "daily-limit" }
  /** Signs of self-harm: never published. The UI shows the help screen. */
  | { status: "risk" }
  /** Insults, swearing or nothing readable: never published. The UI says La Fogata is not for this. */
  | { status: "rejected"; reason: ContentIssue };

export type AnswerPetitionResult =
  | { status: "answered"; petition: Petition }
  | { status: "not-yours" }
  | { status: "not-found" }
  | { status: "already-answered" }
  /** An answered petition always says how it happened. */
  | { status: "note-required" }
  | { status: "too-long" }
  /** Signs of risk in the line: it is never saved or shown, and the visitor is offered help instead. */
  | { status: "risk" }
  /** Insults, swearing or nothing readable: it is never saved or shown. */
  | { status: "rejected"; reason: ContentIssue };

export type RemovePetitionResult =
  { status: "removed" } | { status: "not-yours" } | { status: "not-found" };

export type ReportPetitionResult =
  { status: "reported" } | { status: "own" } | { status: "not-found" };

export type PetitionEvent =
  | { type: "added"; petition: Petition }
  | { type: "changed"; petition: Petition }
  /** Someone is with the visitor's own petition: its star pulses softly. */
  | { type: "accompanied"; petition: Petition }
  /** The visitor reported it: its star is hidden for them from now on. */
  | { type: "hidden"; id: string }
  /** An answered petition: a shooting star crosses every sky. */
  | { type: "answered"; petition: Petition }
  /** The author returned it to the fire: its star is gone. */
  | { type: "removed"; id: string };

export interface PetitionService {
  /**
   * The petitions the sky shows now, those with fewer prayers first: `limit` of them, which grows with the width of
   * the panorama (about `SKY_SIZE` per screen). Petitions the visitor reported are never among them.
   */
  sky(limit?: number): Promise<readonly Petition[]>;
  /** The visitor's own petitions that are still alive. */
  mine(): Promise<readonly Petition[]>;
  /** Whether the visitor has already left all the petitions a day allows. */
  dailyLimitReached(): Promise<boolean>;
  create(text: string): Promise<CreatePetitionResult>;
  /** The author marks it answered, with one line that says how it happened: it is required. */
  answer(id: string, note: string): Promise<AnswerPetitionResult>;
  /** The author returns it to the fire, for good. The day's petition stays used. */
  remove(id: string): Promise<RemovePetitionResult>;
  /** The visitor reports someone else's petition: it is saved for review and hidden from their sky. */
  report(id: string): Promise<ReportPetitionResult>;
  subscribe(listener: (event: PetitionEvent) => void): Unsubscribe;
}

// Prayers

export type PrayResult =
  | { status: "prayed"; prayers: number }
  | { status: "already-prayed"; prayers: number }
  | { status: "rate-limited" }
  /** Nobody is with their own petition. */
  | { status: "own" }
  | { status: "not-found" };

export interface PrayerService {
  pray(petitionId: string): Promise<PrayResult>;
}

// Distant fires

/** Another campfire in the forest: only that it is burning and how many people sit at it. */
export interface DistantFire {
  id: string;
  people: number;
}

export interface DistantFireService {
  /** The other campfires that are burning now, this one never included. Real ones only. */
  fires(): readonly DistantFire[];
  subscribe(listener: (fires: readonly DistantFire[]) => void): Unsubscribe;
}

export interface Services {
  presence: PresenceService;
  distantFires: DistantFireService;
  fire: FireService;
  petitions: PetitionService;
  prayers: PrayerService;
}
