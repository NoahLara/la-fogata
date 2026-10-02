import { hasRiskSignals } from "@/burden/risk";
import { burdenLength } from "@/burden/burden";
import type { Random } from "@/scene/random";
import { Emitter } from "./emitter";
import type { KeyStore } from "./keyStore";
import {
  PETITION_ANSWER_MAX_LENGTH,
  PETITION_MAX_LENGTH,
  PETITION_MIN_LENGTH,
  PETITIONS_PER_DAY,
  petitionAvailableAt,
  PRAYERS_PER_SESSION,
} from "./limits";
import { isAlive, pickSky } from "./sky";
import type {
  AnswerPetitionResult,
  CreatePetitionResult,
  Petition,
  PetitionEvent,
  PetitionService,
  PrayerService,
  PrayResult,
} from "./types";

interface Options {
  /** Milliseconds since the epoch. */
  now: () => number;
  rand: Random;
  keys: KeyStore;
  newId: () => string;
  newKey: () => string;
  prayersPerSession?: number;
  /** Petitions a day. Only development raises it, to test the ritual over and over. */
  petitionsPerDay?: number;
}

interface Stored {
  id: string;
  text: string;
  createdAt: number;
  prayers: number;
  answered?: { at: number; note?: string };
  /** The secret that proves who wrote it. */
  ownerKey: string;
}

/**
 * Petitions and prayers kept in this browser, following the same rules the server will. There is no moderation
 * queue here: a petition that is not a risk is shown at once.
 */
export class MemoryPetitions implements PetitionService, PrayerService {
  private readonly records = new Map<string, Stored>();
  private readonly events = new Emitter<PetitionEvent>();
  private readonly prayedFor = new Set<string>();
  private prayerTaps = 0;

  constructor(private readonly options: Options) {}

  async sky(): Promise<readonly Petition[]> {
    const alive = pickSky(this.living(), this.options.now(), this.options.rand);
    return alive.map((record) => this.view(record));
  }

  async mine(): Promise<readonly Petition[]> {
    return this.living()
      .filter((record) => this.isMine(record))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((record) => this.view(record));
  }

  async dailyLimitReached(): Promise<boolean> {
    return this.limitReached();
  }

  async create(text: string): Promise<CreatePetitionResult> {
    const clean = text.trim();
    if (burdenLength(clean) < PETITION_MIN_LENGTH) return { status: "empty" };
    if (burdenLength(clean) > PETITION_MAX_LENGTH) return { status: "too-long" };
    // Never published; the visitor is shown the help screen instead.
    if (hasRiskSignals(clean)) return { status: "risk" };
    if (this.limitReached()) return { status: "daily-limit" };
    const record = this.add(clean, this.ownerKey());
    const petition = this.view(record);
    this.events.emit({ type: "added", petition });
    return { status: "created", petition };
  }

  async answer(id: string, note?: string): Promise<AnswerPetitionResult> {
    const record = this.records.get(id);
    if (!record || !isAlive(record, this.options.now())) return { status: "not-found" };
    if (!this.isMine(record)) return { status: "not-yours" };
    if (record.answered) return { status: "already-answered" };
    const line = note?.trim();
    if (line && burdenLength(line) > PETITION_ANSWER_MAX_LENGTH) return { status: "too-long" };
    record.answered = { at: this.options.now(), ...(line ? { note: line } : {}) };
    const petition = this.view(record);
    this.events.emit({ type: "answered", petition });
    return { status: "answered", petition };
  }

  async pray(petitionId: string): Promise<PrayResult> {
    const record = this.records.get(petitionId);
    if (!record || !isAlive(record, this.options.now())) return { status: "not-found" };
    if (this.prayedFor.has(petitionId))
      return { status: "already-prayed", prayers: record.prayers };
    if (this.prayerTaps >= (this.options.prayersPerSession ?? PRAYERS_PER_SESSION)) {
      return { status: "rate-limited" };
    }
    this.prayerTaps++;
    this.prayedFor.add(petitionId);
    record.prayers++;
    this.events.emit({ type: "changed", petition: this.view(record) });
    return { status: "prayed", prayers: record.prayers };
  }

  subscribe(listener: (event: PetitionEvent) => void) {
    return this.events.subscribe(listener);
  }

  /** Demo and tests only: a petition someone else wrote. */
  seedOther(text: string, options: { prayers?: number; createdAt?: number } = {}): Petition {
    const record = this.add(text, "someone-else");
    record.prayers = options.prayers ?? 0;
    if (options.createdAt !== undefined) record.createdAt = options.createdAt;
    return this.view(record);
  }

  private add(text: string, ownerKey: string): Stored {
    const record: Stored = {
      id: this.options.newId(),
      text,
      createdAt: this.options.now(),
      prayers: 0,
      ownerKey,
    };
    this.records.set(record.id, record);
    return record;
  }

  private limitReached(): boolean {
    const now = this.options.now();
    const mine = [...this.records.values()].filter((record) => this.isMine(record));
    const perDay = this.options.petitionsPerDay ?? PETITIONS_PER_DAY;
    return (
      petitionAvailableAt(
        mine.map((record) => record.createdAt),
        now,
        perDay,
      ) > now
    );
  }

  private living(): Stored[] {
    const now = this.options.now();
    return [...this.records.values()].filter((record) => isAlive(record, now));
  }

  /** The visitor's secret key, made the first time it is needed. */
  private ownerKey(): string {
    const existing = this.options.keys.get();
    if (existing) return existing;
    const key = this.options.newKey();
    this.options.keys.set(key);
    return key;
  }

  private isMine(record: Stored): boolean {
    const key = this.options.keys.get();
    return key !== undefined && record.ownerKey === key;
  }

  /** What the UI sees: never the owner's key. */
  private view(record: Stored): Petition {
    return {
      id: record.id,
      text: record.text,
      createdAt: record.createdAt,
      prayers: record.prayers,
      ...(record.answered ? { answered: { ...record.answered } } : {}),
      mine: this.isMine(record),
      prayed: this.prayedFor.has(record.id),
    };
  }
}
