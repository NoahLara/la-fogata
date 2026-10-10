import type { Db } from "./db";

/** How many different people must report a petition before it stops being shown, until it is reviewed. */
export const REPORTS_TO_HIDE = 3;

export interface PetitionRow {
  id: string;
  ownerHash: string;
  text: string;
  createdAt: number;
  createdOn: string;
  answeredAt: number | null;
  answeredOn: string | null;
  answerNote: string | null;
  prayers: number;
  status: "visible" | "hidden";
}

export interface NewPetition {
  id: string;
  ownerHash: string;
  text: string;
  createdAt: number;
  createdOn: string;
}

interface RawRow {
  id: string;
  owner_hash: string;
  text: string;
  created_at: number;
  created_on: string;
  answered_at: number | null;
  answered_on: string | null;
  answer_note: string | null;
  prayers: number;
  status: "visible" | "hidden";
}

const COLUMNS =
  "id, owner_hash, text, created_at, created_on, answered_at, answered_on, answer_note, prayers, status";

function toRow(raw: RawRow): PetitionRow {
  return {
    id: raw.id,
    ownerHash: raw.owner_hash,
    text: raw.text,
    createdAt: raw.created_at,
    createdOn: raw.created_on,
    answeredAt: raw.answered_at,
    answeredOn: raw.answered_on,
    answerNote: raw.answer_note,
    prayers: raw.prayers,
    status: raw.status,
  };
}

/**
 * Where the petitions are kept. Every query is made to read as few rows as it can (the free plan counts the rows a
 * query scans, not the ones it returns), which is what the indexes in the migration are for.
 */
export class PetitionStore {
  constructor(private readonly db: Db) {}

  async create(petition: NewPetition): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO petitions (id, owner_hash, text, created_at, created_on) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(petition.id, petition.ownerHash, petition.text, petition.createdAt, petition.createdOn)
      .run();
  }

  async get(id: string): Promise<PetitionRow | undefined> {
    const raw = await this.db
      .prepare(`SELECT ${COLUMNS} FROM petitions WHERE id = ?`)
      .bind(id)
      .first<RawRow>();
    return raw ? toRow(raw) : undefined;
  }

  /** The petitions of one owner, the newest first. */
  async mine(ownerHash: string): Promise<PetitionRow[]> {
    const { results } = await this.db
      .prepare(`SELECT ${COLUMNS} FROM petitions WHERE owner_hash = ? ORDER BY created_at DESC`)
      .bind(ownerHash)
      .all<RawRow>();
    return results.map(toRow);
  }

  /** The petitions that are shown, the ones with the fewest prayers first: only `limit` rows are read. */
  async pool(limit: number): Promise<PetitionRow[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM petitions WHERE status = 'visible' ORDER BY prayers ASC LIMIT ?`,
      )
      .bind(limit)
      .all<RawRow>();
    return results.map(toRow);
  }

  /** Marks it answered, once. False if it was not the owner's or was already answered. */
  async answer(
    id: string,
    ownerHash: string,
    at: number,
    on: string,
    note: string,
  ): Promise<boolean> {
    const { meta } = await this.db
      .prepare(
        "UPDATE petitions SET answered_at = ?, answered_on = ?, answer_note = ? WHERE id = ? AND owner_hash = ? AND answered_at IS NULL",
      )
      .bind(at, on, note, id, ownerHash)
      .run();
    return (meta.changes ?? 0) > 0;
  }

  /** Sends it back to the fire for good, with whoever was with it. False if it was not the owner's. */
  async remove(id: string, ownerHash: string): Promise<boolean> {
    const owned = await this.db
      .prepare("SELECT 1 AS found FROM petitions WHERE id = ? AND owner_hash = ?")
      .bind(id, ownerHash)
      .first();
    if (!owned) return false;
    await this.db.batch([
      this.db.prepare("DELETE FROM prayers WHERE petition_id = ?").bind(id),
      this.db.prepare("DELETE FROM reports WHERE petition_id = ?").bind(id),
      this.db.prepare("DELETE FROM petitions WHERE id = ? AND owner_hash = ?").bind(id, ownerHash),
    ]);
    return true;
  }

  /**
   * Someone is with a petition, once. The counter is always counted again from the rows, so it is right however the
   * calls interleave. Returns whether this was a new prayer, and how many there are.
   */
  async pray(
    id: string,
    visitorHash: string,
    now: number,
  ): Promise<{ inserted: boolean; prayers: number }> {
    const [added] = (await this.db.batch([
      this.db
        .prepare(
          "INSERT OR IGNORE INTO prayers (petition_id, visitor_hash, created_at) VALUES (?, ?, ?)",
        )
        .bind(id, visitorHash, now),
      this.db
        .prepare(
          "UPDATE petitions SET prayers = (SELECT COUNT(*) FROM prayers WHERE petition_id = ?) WHERE id = ?",
        )
        .bind(id, id),
    ])) as { meta: { changes?: number } }[];
    const row = await this.db
      .prepare("SELECT prayers FROM petitions WHERE id = ?")
      .bind(id)
      .first<{ prayers: number }>();
    return { inserted: (added?.meta.changes ?? 0) > 0, prayers: row?.prayers ?? 0 };
  }

  /** Saves a report, once per person, and hides the petition when enough different people have reported it. */
  async report(id: string, reporterHash: string, now: number): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(
          "INSERT OR IGNORE INTO reports (petition_id, reporter_hash, created_at) VALUES (?, ?, ?)",
        )
        .bind(id, reporterHash, now),
      this.db
        .prepare(
          "UPDATE petitions SET status = 'hidden' WHERE id = ? AND (SELECT COUNT(*) FROM reports WHERE petition_id = ?) >= ?",
        )
        .bind(id, id, REPORTS_TO_HIDE),
    ]);
  }

  /** The ids of the petitions this person is with. */
  async prayedBy(visitorHash: string): Promise<Set<string>> {
    const { results } = await this.db
      .prepare("SELECT petition_id FROM prayers WHERE visitor_hash = ?")
      .bind(visitorHash)
      .all<{ petition_id: string }>();
    return new Set(results.map((row) => row.petition_id));
  }

  /** The ids of the petitions this person reported. */
  async reportedBy(reporterHash: string): Promise<Set<string>> {
    const { results } = await this.db
      .prepare("SELECT petition_id FROM reports WHERE reporter_hash = ?")
      .bind(reporterHash)
      .all<{ petition_id: string }>();
    return new Set(results.map((row) => row.petition_id));
  }

  /** How many petitions an owner has made since `since`: a flood guard, not a limit. */
  async madeSince(ownerHash: string, since: number): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS total FROM petitions WHERE owner_hash = ? AND created_at >= ?")
      .bind(ownerHash, since)
      .first<{ total: number }>();
    return row?.total ?? 0;
  }

  /** How many times a visitor has been with a petition since `since`: a flood guard, not a limit. */
  async prayedSince(visitorHash: string, since: number): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS total FROM prayers WHERE visitor_hash = ? AND created_at >= ?")
      .bind(visitorHash, since)
      .first<{ total: number }>();
    return row?.total ?? 0;
  }
}
