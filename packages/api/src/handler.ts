import {
  API_PATHS,
  answerPetitionRequestSchema,
  checkContent,
  createPetitionRequestSchema,
  hasRiskSignals,
  OWNER_KEY_HEADER,
  ownerKeySchema,
  PETITION_ANSWER_MAX_LENGTH,
  PETITION_MAX_LENGTH,
  PETITION_MIN_LENGTH,
  pickSky,
  SKY_SIZE,
  textLength,
  type PetitionView,
} from "@fogata/shared";
import type { Db } from "./db";
import { hashKey } from "./hash";
import { PetitionStore, type PetitionRow } from "./store";

/** The most the sky may be asked to show, and how many petitions it chooses from: the ones with the fewest prayers. */
const MAX_SKY = 200;
const POOL_SIZE = 600;
/** The sky is the same for everyone, so it is chosen from one reading kept for this long. */
const POOL_TTL_MS = 60_000;
/** Nobody types or taps this fast: more than this in a minute is a script. It is a flood guard, not a limit. */
const PETITIONS_PER_MINUTE = 6;
const PRAYERS_PER_MINUTE = 40;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Nothing a person sends is longer than a petition and its day. */
const MAX_BODY = 40_000;

const CORS = {
  // No cookies and no credentials are used (the key travels in a header), so any page may ask.
  "access-control-allow-origin": "*",
  "access-control-allow-headers": `content-type, ${OWNER_KEY_HEADER}`,
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-max-age": "86400",
} as const;

export interface ApiOptions {
  db: Db;
  now?: () => number;
  newId?: () => string;
  rand?: () => number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS,
    },
  });
}

const fail = (error: "bad-request" | "missing-key" | "slow-down" | "not-found", status: number) =>
  json({ error }, status);

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The day the visitor says it is, if it is today or a day away (time zones); otherwise today, by the server's clock. */
function dayFor(asked: string, at: number): string {
  const today = new Date(at).toISOString().slice(0, 10);
  const day = Date.parse(`${asked}T00:00:00Z`);
  if (Number.isNaN(day)) return today;
  return Math.abs(day - Date.parse(`${today}T00:00:00Z`)) <= DAY_MS ? asked : today;
}

function view(row: PetitionRow, who: { ownerHash?: string; prayed?: Set<string> }): PetitionView {
  const answered =
    row.answeredAt !== null && row.answeredOn !== null
      ? {
          at: row.answeredAt,
          on: row.answeredOn,
          ...(row.answerNote ? { note: row.answerNote } : {}),
        }
      : undefined;
  return {
    id: row.id,
    text: row.text,
    createdAt: row.createdAt,
    createdOn: row.createdOn,
    prayers: row.prayers,
    ...(answered ? { answered } : {}),
    mine: who.ownerHash !== undefined && row.ownerHash === who.ownerHash,
    prayed: who.prayed?.has(row.id) ?? false,
  };
}

/**
 * The petitions' side of the server, as a plain request handler: it answers the paths under `/api` and returns
 * `undefined` for anything else, so it can sit in front of other routes. It checks what it is sent (the same checks
 * the browser already made, which is a second line against a changed browser), keeps nothing of a refused text, and
 * never says who wrote a petition.
 */
export function createApi(
  options: ApiOptions,
): (request: Request) => Promise<Response | undefined> {
  const store = new PetitionStore(options.db);
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const rand = options.rand ?? Math.random;
  let pool: { at: number; rows: PetitionRow[] } | undefined;

  const readPool = async (): Promise<PetitionRow[]> => {
    if (pool && now() - pool.at < POOL_TTL_MS) return pool.rows;
    const rows = await store.pool(POOL_SIZE);
    pool = { at: now(), rows };
    return rows;
  };
  const forgetPool = () => {
    pool = undefined;
  };

  /** The key the visitor sent, if it is one. */
  const keyOf = (request: Request): string | undefined => {
    const parsed = ownerKeySchema.safeParse(request.headers.get(OWNER_KEY_HEADER) ?? "");
    return parsed.success ? parsed.data : undefined;
  };

  const sky = async (request: Request, url: URL): Promise<Response> => {
    const asked = Number(url.searchParams.get("limit") ?? SKY_SIZE);
    const limit = Number.isInteger(asked) ? Math.min(Math.max(asked, 1), MAX_SKY) : SKY_SIZE;
    const key = keyOf(request);
    const ownerHash = key ? await hashKey(key, "owner") : undefined;
    const prayerHash = key ? await hashKey(key, "prayer") : undefined;
    const reporterHash = key ? await hashKey(key, "report") : undefined;
    const [rows, prayed, reported] = await Promise.all([
      readPool(),
      prayerHash ? store.prayedBy(prayerHash) : Promise.resolve(new Set<string>()),
      reporterHash ? store.reportedBy(reporterHash) : Promise.resolve(new Set<string>()),
    ]);
    const shown = pickSky(
      rows.filter((row) => !reported.has(row.id)),
      rand,
      limit,
    );
    return json({
      petitions: shown.map((row) => view(row, { ...(ownerHash ? { ownerHash } : {}), prayed })),
    });
  };

  const mine = async (request: Request): Promise<Response> => {
    const key = keyOf(request);
    if (!key) return fail("missing-key", 401);
    const ownerHash = await hashKey(key, "owner");
    const rows = await store.mine(ownerHash);
    return json({ petitions: rows.map((row) => view(row, { ownerHash })) });
  };

  const create = async (request: Request): Promise<Response> => {
    const key = keyOf(request);
    if (!key) return fail("missing-key", 401);
    const body = createPetitionRequestSchema.safeParse(await readJson(request));
    if (!body.success) return fail("bad-request", 400);
    const text = body.data.text.trim();
    const length = textLength(text);
    if (length < PETITION_MIN_LENGTH) return json({ status: "empty" });
    if (length > PETITION_MAX_LENGTH) return json({ status: "too-long" });
    // Never kept: the browser already showed the help screen, and a text that still arrives is dropped here.
    if (hasRiskSignals(text)) return json({ status: "risk" });
    const verdict = checkContent(text);
    if (!verdict.ok) return json({ status: "rejected", reason: verdict.reason });
    const ownerHash = await hashKey(key, "owner");
    const at = now();
    if ((await store.madeSince(ownerHash, at - MINUTE_MS)) >= PETITIONS_PER_MINUTE) {
      return fail("slow-down", 429);
    }
    const row: PetitionRow = {
      id: newId(),
      ownerHash,
      text,
      createdAt: at,
      createdOn: dayFor(body.data.day, at),
      answeredAt: null,
      answeredOn: null,
      answerNote: null,
      prayers: 0,
      status: "visible",
    };
    await store.create(row);
    forgetPool();
    return json({ status: "created", petition: view(row, { ownerHash }) });
  };

  const answer = async (request: Request, id: string): Promise<Response> => {
    const key = keyOf(request);
    if (!key) return fail("missing-key", 401);
    const body = answerPetitionRequestSchema.safeParse(await readJson(request));
    if (!body.success) return fail("bad-request", 400);
    const ownerHash = await hashKey(key, "owner");
    const row = await store.get(id);
    if (!row) return json({ status: "not-found" });
    if (row.ownerHash !== ownerHash) return json({ status: "not-yours" });
    if (row.answeredAt !== null) return json({ status: "already-answered" });
    const note = body.data.note.trim();
    if (!note) return json({ status: "note-required" });
    if (textLength(note) > PETITION_ANSWER_MAX_LENGTH) return json({ status: "too-long" });
    if (hasRiskSignals(note)) return json({ status: "risk" });
    const verdict = checkContent(note);
    if (!verdict.ok) return json({ status: "rejected", reason: verdict.reason });
    const at = now();
    const on = dayFor(body.data.day, at);
    if (!(await store.answer(id, ownerHash, at, on, note)))
      return json({ status: "already-answered" });
    forgetPool();
    const updated = await store.get(id);
    return json({ status: "answered", petition: view(updated ?? row, { ownerHash }) });
  };

  const remove = async (request: Request, id: string): Promise<Response> => {
    const key = keyOf(request);
    if (!key) return fail("missing-key", 401);
    const ownerHash = await hashKey(key, "owner");
    const row = await store.get(id);
    if (!row) return json({ status: "not-found" });
    if (row.ownerHash !== ownerHash) return json({ status: "not-yours" });
    await store.remove(id, ownerHash);
    forgetPool();
    return json({ status: "removed" });
  };

  const pray = async (request: Request, id: string): Promise<Response> => {
    const key = keyOf(request);
    if (!key) return fail("missing-key", 401);
    const row = await store.get(id);
    if (!row || row.status === "hidden") return json({ status: "not-found" });
    if (row.ownerHash === (await hashKey(key, "owner"))) return json({ status: "own" });
    const visitorHash = await hashKey(key, "prayer");
    const at = now();
    if ((await store.prayedSince(visitorHash, at - MINUTE_MS)) >= PRAYERS_PER_MINUTE) {
      return fail("slow-down", 429);
    }
    const result = await store.pray(id, visitorHash, at);
    if (result.inserted) forgetPool();
    return json({ status: result.inserted ? "prayed" : "already-prayed", prayers: result.prayers });
  };

  const report = async (request: Request, id: string): Promise<Response> => {
    const key = keyOf(request);
    if (!key) return fail("missing-key", 401);
    const row = await store.get(id);
    if (!row) return json({ status: "not-found" });
    if (row.ownerHash === (await hashKey(key, "owner"))) return json({ status: "own" });
    await store.report(id, await hashKey(key, "report"), now());
    forgetPool();
    return json({ status: "reported" });
  };

  return async (request) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return undefined;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const { method } = request;
    const { pathname } = url;
    if (method === "GET" && pathname === API_PATHS.sky) return sky(request, url);
    if (method === "GET" && pathname === API_PATHS.mine) return mine(request);
    if (method === "POST" && pathname === API_PATHS.petitions) return create(request);
    const match = /^\/api\/petitions\/([A-Za-z0-9-]{1,64})(?:\/(answer|pray|report))?$/.exec(
      pathname,
    );
    if (match) {
      const id = match[1] as string;
      const action = match[2];
      if (method === "DELETE" && action === undefined) return remove(request, id);
      if (method === "POST" && action === "answer") return answer(request, id);
      if (method === "POST" && action === "pray") return pray(request, id);
      if (method === "POST" && action === "report") return report(request, id);
    }
    return fail("not-found", 404);
  };
}
