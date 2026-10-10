import { checkContent, hasRiskSignals } from "@fogata/shared";
import { burdenLength } from "@/burden/burden";
import type { Random } from "@/scene/random";
import { dateKey } from "./dates";
import { Emitter } from "./emitter";
import type { KeyStore } from "./keyStore";
import {
  PETITION_ANSWER_MAX_LENGTH,
  PETITION_MAX_LENGTH,
  PETITION_MIN_LENGTH,
  PRAYERS_PER_SESSION,
} from "./limits";
import { pickSky } from "./sky";
import type {
  AnswerPetitionResult,
  CreatePetitionResult,
  Petition,
  PetitionEvent,
  PetitionService,
  PrayerService,
  PrayResult,
  RemovePetitionResult,
  ReportPetitionResult,
} from "./types";

export interface PetitionOptions {
  /** Milliseconds since the epoch. */
  now: () => number;
  rand: Random;
  keys: KeyStore;
  newId: () => string;
  newKey: () => string;
  prayersPerSession?: number;
}

export interface Stored {
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
 * queue here: a petition that is not a risk is shown at once. Petitions don't expire and there is no limit on how
 * many a person may leave: one stays until its author returns it to the fire.
 */
export class MemoryPetitions implements PetitionService, PrayerService {
  protected readonly records = new Map<string, Stored>();
  protected readonly events = new Emitter<PetitionEvent>();
  private readonly prayedFor = new Set<string>();
  /** What the visitor reported: kept for review (the database will hold them) and hidden from their sky. */
  private readonly reported = new Set<string>();
  private prayerTaps = 0;

  constructor(protected readonly options: PetitionOptions) {}

  async sky(limit?: number): Promise<readonly Petition[]> {
    const shown = [...this.records.values()].filter((record) => !this.reported.has(record.id));
    return pickSky(shown, this.options.rand, limit).map((record) => this.view(record));
  }

  async mine(): Promise<readonly Petition[]> {
    return [...this.records.values()]
      .filter((record) => this.isMine(record))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((record) => this.view(record));
  }

  async create(text: string): Promise<CreatePetitionResult> {
    const clean = text.trim();
    if (burdenLength(clean) < PETITION_MIN_LENGTH) return { status: "empty" };
    if (burdenLength(clean) > PETITION_MAX_LENGTH) return { status: "too-long" };
    // Never published; the visitor is shown the help screen instead.
    if (hasRiskSignals(clean)) return { status: "risk" };
    const verdict = checkContent(clean);
    if (!verdict.ok) return { status: "rejected", reason: verdict.reason };
    const record = this.add(clean, this.ownerKey());
    const petition = this.view(record);
    this.events.emit({ type: "added", petition });
    return { status: "created", petition };
  }

  async answer(id: string, note: string): Promise<AnswerPetitionResult> {
    const record = this.records.get(id);
    if (!record) return { status: "not-found" };
    if (!this.isMine(record)) return { status: "not-yours" };
    if (record.answered) return { status: "already-answered" };
    const line = note.trim();
    if (!line) return { status: "note-required" };
    if (burdenLength(line) > PETITION_ANSWER_MAX_LENGTH) return { status: "too-long" };
    if (hasRiskSignals(line)) return { status: "risk" };
    const verdict = checkContent(line);
    if (!verdict.ok) return { status: "rejected", reason: verdict.reason };
    record.answered = { at: this.options.now(), note: line };
    const petition = this.view(record);
    this.events.emit({ type: "answered", petition });
    return { status: "answered", petition };
  }

  async remove(id: string): Promise<RemovePetitionResult> {
    const record = this.records.get(id);
    if (!record) return { status: "not-found" };
    if (!this.isMine(record)) return { status: "not-yours" };
    this.records.delete(id);
    this.prayedFor.delete(id);
    this.events.emit({ type: "removed", id });
    return { status: "removed" };
  }

  async report(id: string): Promise<ReportPetitionResult> {
    const record = this.records.get(id);
    if (!record) return { status: "not-found" };
    if (this.isMine(record)) return { status: "own" };
    this.reported.add(id);
    this.events.emit({ type: "hidden", id });
    return { status: "reported" };
  }

  /** The ids the visitor has reported, for review. */
  reportedIds(): readonly string[] {
    return [...this.reported];
  }

  async pray(petitionId: string): Promise<PrayResult> {
    const record = this.records.get(petitionId);
    if (!record || this.reported.has(petitionId)) return { status: "not-found" };
    if (this.isMine(record)) return { status: "own" };
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

  protected add(text: string, ownerKey: string): Stored {
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

  /** The visitor's secret key, made the first time it is needed. */
  private ownerKey(): string {
    const existing = this.options.keys.get();
    if (existing) return existing;
    const key = this.options.newKey();
    this.options.keys.set(key);
    return key;
  }

  protected isMine(record: Stored): boolean {
    const key = this.options.keys.get();
    return key !== undefined && record.ownerKey === key;
  }

  /** What the UI sees: never the owner's key. */
  protected view(record: Stored): Petition {
    return {
      id: record.id,
      text: record.text,
      createdAt: record.createdAt,
      createdOn: dateKey(record.createdAt),
      prayers: record.prayers,
      ...(record.answered
        ? {
            answered: {
              at: record.answered.at,
              on: dateKey(record.answered.at),
              ...(record.answered.note ? { note: record.answered.note } : {}),
            },
          }
        : {}),
      mine: this.isMine(record),
      prayed: this.prayedFor.has(record.id),
    };
  }
}
