import type { Species } from "./characters/species";

export interface MemberSpec {
  id: string;
  species: Species;
  /** Index of the seat they sit in. */
  seat: number;
}

export type MemberStatus = "arriving" | "seated" | "leaving";

export interface MemberInfo extends MemberSpec {
  status: MemberStatus;
}

export type AddResult = "added" | "duplicate-id" | "seat-taken" | "no-such-seat";

/** Who is in the campfire and where. Knows nothing about drawing. */
export class Roster {
  private readonly entries = new Map<string, MemberSpec & { status: MemberStatus }>();

  constructor(private readonly seatCount: number) {}

  add(member: MemberSpec, status: MemberStatus): AddResult {
    if (!Number.isInteger(member.seat) || member.seat < 0 || member.seat >= this.seatCount) {
      return "no-such-seat";
    }
    if (this.entries.has(member.id)) return "duplicate-id";
    if (this.takenSeats().has(member.seat)) return "seat-taken";
    this.entries.set(member.id, { ...member, status });
    return "added";
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  markSeated(id: string): void {
    const entry = this.entries.get(id);
    if (entry) entry.status = "seated";
  }

  markAllSeated(): void {
    for (const entry of this.entries.values()) entry.status = "seated";
  }

  /** Marks someone as on their way out. They stop counting toward the fire, but their seat stays taken until they are gone. */
  markLeaving(id: string): void {
    const entry = this.entries.get(id);
    if (entry) entry.status = "leaving";
  }

  /** Drops everyone who was on their way out. */
  removeLeaving(): void {
    for (const [id, entry] of this.entries) if (entry.status === "leaving") this.entries.delete(id);
  }

  /** One member by id, without building the whole list (this runs every frame). */
  get(id: string): Readonly<MemberInfo> | undefined {
    return this.entries.get(id);
  }

  members(): MemberInfo[] {
    return [...this.entries.values()].map(({ id, species, seat, status }) => ({
      id,
      species,
      seat,
      status,
    }));
  }

  takenSeats(): Set<number> {
    return new Set([...this.entries.values()].map((entry) => entry.seat));
  }

  /** Only those who have reached their seat count toward the fire. */
  get seatedCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) if (entry.status === "seated") count++;
    return count;
  }
}
