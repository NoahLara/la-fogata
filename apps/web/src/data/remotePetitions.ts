import {
  answerPetitionRequestSchema,
  answerResponseSchema,
  API_PATHS,
  checkContent,
  createPetitionRequestSchema,
  createResponseSchema,
  hasRiskSignals,
  listResponseSchema,
  OWNER_KEY_HEADER,
  PETITION_ANSWER_MAX_LENGTH,
  PETITION_MAX_LENGTH,
  PETITION_MIN_LENGTH,
  PRAYERS_PER_SESSION,
  prayResponseSchema,
  removeResponseSchema,
  reportResponseSchema,
  textLength,
  type PetitionView,
} from "@fogata/shared";
import { dateKey } from "./dates";
import { Emitter } from "./emitter";
import type { KeyStore } from "./keyStore";
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

/** How often the visitor's own petitions are looked at, to notice that someone is with one. */
export const COMPANY_POLL_MS = 60_000;
/** How long the server has to answer before it counts as out of reach. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface RemotePetitionsOptions {
  /** Where the server is, such as `https://fogata-realtime.example.workers.dev`. */
  baseUrl: string;
  keys: KeyStore;
  newKey: () => string;
  /** The way to reach the server; tests bring their own. */
  fetch?: typeof fetch;
  now?: () => number;
  prayersPerSession?: number;
  /** How often to look for company on the visitor's petitions; 0 never does. */
  companyPollMs?: number;
}

/** What this file needs of a zod schema (the contract's schemas are zod ones). */
interface Schema<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false };
}

type Outcome<T> = { ok: true; data: T } | { ok: false; slow: boolean };

/** The view the server sends, as the page uses it. */
function toPetition(view: PetitionView): Petition {
  return {
    id: view.id,
    text: view.text,
    createdAt: view.createdAt,
    createdOn: view.createdOn,
    prayers: view.prayers,
    ...(view.answered
      ? {
          answered: {
            at: view.answered.at,
            on: view.answered.on,
            ...(view.answered.note ? { note: view.answered.note } : {}),
          },
        }
      : {}),
    mine: view.mine,
    prayed: view.prayed,
  };
}

/**
 * Petitions and prayers kept by the campfire's server, so they last and the sky is everyone's. The visitor's secret
 * key is made here the first time it is needed and travels only in a header, so the server can tell what is theirs
 * without a name or an account. What must not leave the browser never does: the checks for signs of risk and for
 * insults run here first, so a text that fails them is never sent (the server repeats them for a changed browser).
 * When the server cannot be reached nothing is made up: the visitor is told it was not kept.
 */
export class RemotePetitions implements PetitionService, PrayerService {
  private readonly events = new Emitter<PetitionEvent>();
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  /** The petitions seen last, so a prayer can update one and company can be told from what was there before. */
  private readonly seen = new Map<string, Petition>();
  private prayerTaps = 0;
  private poller: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly options: RemotePetitionsOptions) {
    this.fetcher = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.now = options.now ?? Date.now;
  }

  async sky(limit?: number): Promise<readonly Petition[]> {
    const query = limit === undefined ? "" : `?limit=${Math.floor(limit)}`;
    const outcome = await this.send("GET", `${API_PATHS.sky}${query}`, listResponseSchema);
    return outcome.ok ? this.remember(outcome.data.petitions) : [];
  }

  async mine(): Promise<readonly Petition[]> {
    // No key yet means no petition yet: there is nothing to ask for.
    if (!this.options.keys.get()) return [];
    const outcome = await this.send("GET", API_PATHS.mine, listResponseSchema);
    return outcome.ok ? this.remember(outcome.data.petitions) : [];
  }

  async create(text: string): Promise<CreatePetitionResult> {
    const clean = text.trim();
    if (textLength(clean) < PETITION_MIN_LENGTH) return { status: "empty" };
    if (textLength(clean) > PETITION_MAX_LENGTH) return { status: "too-long" };
    // Before anything is sent: someone at risk is shown the help screen, and their words go nowhere.
    if (hasRiskSignals(clean)) return { status: "risk" };
    const verdict = checkContent(clean);
    if (!verdict.ok) return { status: "rejected", reason: verdict.reason };
    const body = createPetitionRequestSchema.parse({ text: clean, day: dateKey(this.now()) });
    const outcome = await this.send("POST", API_PATHS.petitions, createResponseSchema, body, true);
    if (!outcome.ok) return { status: "unavailable" };
    if (outcome.data.status !== "created") return outcome.data;
    const petition = this.keep(outcome.data.petition);
    this.events.emit({ type: "added", petition });
    return { status: "created", petition };
  }

  async answer(id: string, note: string): Promise<AnswerPetitionResult> {
    const line = note.trim();
    if (!line) return { status: "note-required" };
    if (textLength(line) > PETITION_ANSWER_MAX_LENGTH) return { status: "too-long" };
    if (hasRiskSignals(line)) return { status: "risk" };
    const verdict = checkContent(line);
    if (!verdict.ok) return { status: "rejected", reason: verdict.reason };
    const body = answerPetitionRequestSchema.parse({ note: line, day: dateKey(this.now()) });
    const outcome = await this.send(
      "POST",
      this.path(id, "answer"),
      answerResponseSchema,
      body,
      true,
    );
    if (!outcome.ok) return { status: "unavailable" };
    if (outcome.data.status !== "answered") return outcome.data;
    const petition = this.keep(outcome.data.petition);
    this.events.emit({ type: "answered", petition });
    return { status: "answered", petition };
  }

  async remove(id: string): Promise<RemovePetitionResult> {
    const outcome = await this.send("DELETE", this.path(id), removeResponseSchema, undefined, true);
    if (!outcome.ok) return { status: "unavailable" };
    if (outcome.data.status === "removed") {
      this.seen.delete(id);
      this.events.emit({ type: "removed", id });
    }
    return outcome.data;
  }

  async report(id: string): Promise<ReportPetitionResult> {
    const outcome = await this.send(
      "POST",
      this.path(id, "report"),
      reportResponseSchema,
      undefined,
      true,
    );
    if (!outcome.ok) return { status: "unavailable" };
    if (outcome.data.status === "reported") this.events.emit({ type: "hidden", id });
    return outcome.data;
  }

  async pray(petitionId: string): Promise<PrayResult> {
    if (this.prayerTaps >= (this.options.prayersPerSession ?? PRAYERS_PER_SESSION)) {
      return { status: "rate-limited" };
    }
    const outcome = await this.send(
      "POST",
      this.path(petitionId, "pray"),
      prayResponseSchema,
      undefined,
      true,
    );
    if (!outcome.ok) return { status: outcome.slow ? "rate-limited" : "unavailable" };
    const result = outcome.data;
    if (result.status === "prayed") {
      this.prayerTaps++;
      const known = this.seen.get(petitionId);
      if (known) {
        const petition = { ...known, prayers: result.prayers, prayed: true };
        this.seen.set(petitionId, petition);
        this.events.emit({ type: "changed", petition });
      }
    }
    return result;
  }

  subscribe(listener: (event: PetitionEvent) => void) {
    const stop = this.events.subscribe(listener);
    this.startPolling();
    return stop;
  }

  /**
   * Looks at the visitor's own petitions once, and says (`accompanied`) of any that someone has become company to
   * since they were last seen. Called on a timer while the page is open; it says nothing the first time it sees one.
   */
  async checkCompany(): Promise<void> {
    const before = new Map([...this.seen].filter(([, petition]) => petition.mine));
    const now = await this.mine();
    for (const petition of now) {
      const earlier = before.get(petition.id);
      if (earlier && petition.prayers > earlier.prayers) {
        this.events.emit({ type: "accompanied", petition });
      }
    }
  }

  /** Stops the timer that looks for company. */
  dispose(): void {
    if (this.poller) clearInterval(this.poller);
    this.poller = undefined;
  }

  private startPolling(): void {
    const every = this.options.companyPollMs ?? COMPANY_POLL_MS;
    if (this.poller || every <= 0) return;
    this.poller = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void this.checkCompany();
    }, every);
  }

  private path(id: string, action?: string): string {
    return `${API_PATHS.petitions}/${encodeURIComponent(id)}${action ? `/${action}` : ""}`;
  }

  private keep(view: PetitionView): Petition {
    const petition = toPetition(view);
    this.seen.set(petition.id, petition);
    return petition;
  }

  private remember(views: readonly PetitionView[]): Petition[] {
    return views.map((view) => this.keep(view));
  }

  /** The visitor's key, made the first time it is needed. */
  private ownerKey(): string {
    const existing = this.options.keys.get();
    if (existing) return existing;
    const key = this.options.newKey();
    this.options.keys.set(key);
    return key;
  }

  /**
   * One request. It never throws: a server that cannot be reached, that answers with an error or with something that
   * is not what was agreed is `{ ok: false }`, and `slow` says the server asked the visitor to go slower.
   */
  private async send<T>(
    method: string,
    path: string,
    schema: Schema<T>,
    body?: unknown,
    needsKey = false,
  ): Promise<Outcome<T>> {
    const key = needsKey ? this.ownerKey() : this.options.keys.get();
    const headers: Record<string, string> = {};
    if (key) headers[OWNER_KEY_HEADER] = key;
    if (body !== undefined) headers["content-type"] = "application/json";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.fetcher(`${this.options.baseUrl}${path}`, {
        method,
        headers,
        signal: controller.signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 429) return { ok: false, slow: true };
      if (!response.ok) return { ok: false, slow: false };
      const parsed = schema.safeParse(await response.json());
      return parsed.success ? { ok: true, data: parsed.data } : { ok: false, slow: false };
    } catch {
      return { ok: false, slow: false };
    } finally {
      clearTimeout(timer);
    }
  }
}
