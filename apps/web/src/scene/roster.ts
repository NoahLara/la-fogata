import type { Species } from "./characters/species";

export interface MemberSpec {
  id: string;
  species: Species;
  /** Index of the seat they sit in. */
  seat: number;
}

export type MemberStatus = "arriving" | "seated";

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

  members(): MemberSpec[] {
    return [...this.entries.values()].map(({ id, species, seat }) => ({ id, species, seat }));
  }

  takenSeats(): Set<number> {
    return new Set([...this.entries.values()].map((entry) => entry.seat));
  }

  /** Only those who have reached their seat count toward the fire. */
  get seatedCount(): number {
    return [...this.entries.values()].filter((entry) => entry.status === "seated").length;
  }
}

const FIRE_BASE = 0.72;
const FIRE_PER_MEMBER = 0.06;

/** The fire's strength for a number of seated people: it grows a little with each one. Seven give the old fixed value. */
export function fireIntensityFor(seatedCount: number): number {
  return FIRE_BASE + FIRE_PER_MEMBER * seatedCount;
}
