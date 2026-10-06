import { describe, expect, it } from "vitest";
import { Roster } from "./roster";

describe("Roster", () => {
  it("adds people to free seats", () => {
    const roster = new Roster(7);
    expect(roster.add({ id: "a", species: "fox", seat: 2 }, "arriving")).toBe("added");
    expect(roster.members()).toEqual([{ id: "a", species: "fox", seat: 2, status: "arriving" }]);
    expect(roster.takenSeats()).toEqual(new Set([2]));
  });

  it("refuses a taken seat, a repeated id and a seat that does not exist", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 2 }, "seated");
    expect(roster.add({ id: "b", species: "owl", seat: 2 }, "seated")).toBe("seat-taken");
    expect(roster.add({ id: "a", species: "owl", seat: 3 }, "seated")).toBe("duplicate-id");
    expect(roster.add({ id: "c", species: "owl", seat: 7 }, "seated")).toBe("no-such-seat");
    expect(roster.add({ id: "d", species: "owl", seat: -1 }, "seated")).toBe("no-such-seat");
    expect(roster.add({ id: "e", species: "owl", seat: 1.5 }, "seated")).toBe("no-such-seat");
    expect(roster.members()).toHaveLength(1);
  });

  it("finds one member by id", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 2 }, "arriving");
    expect(roster.get("a")).toEqual({ id: "a", species: "fox", seat: 2, status: "arriving" });
    expect(roster.get("nobody")).toBeUndefined();
  });

  it("counts only those who have sat down", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 0 }, "seated");
    roster.add({ id: "b", species: "owl", seat: 1 }, "arriving");
    expect(roster.seatedCount).toBe(1);
    roster.markSeated("b");
    expect(roster.seatedCount).toBe(2);
  });

  it("sits everyone down at once", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 0 }, "arriving");
    roster.add({ id: "b", species: "owl", seat: 1 }, "arriving");
    roster.markAllSeated();
    expect(roster.seatedCount).toBe(2);
  });

  it("frees the seat of whoever is removed", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 0 }, "seated");
    roster.remove("a");
    expect(roster.takenSeats().size).toBe(0);
    expect(roster.add({ id: "b", species: "owl", seat: 0 }, "seated")).toBe("added");
  });
});

describe("Roster leaving", () => {
  it("stops counting someone who is leaving, but keeps their seat taken", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 0 }, "seated");
    roster.add({ id: "b", species: "owl", seat: 1 }, "seated");
    roster.markLeaving("a");
    expect(roster.seatedCount).toBe(1);
    expect(roster.takenSeats()).toEqual(new Set([0, 1]));
    expect(roster.add({ id: "c", species: "cat", seat: 0 }, "seated")).toBe("seat-taken");
    expect(roster.members().find((m) => m.id === "a")?.status).toBe("leaving");
  });

  it("frees the seat once they are removed", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 0 }, "seated");
    roster.markLeaving("a");
    roster.remove("a");
    expect(roster.add({ id: "c", species: "cat", seat: 0 }, "seated")).toBe("added");
  });

  it("drops everyone who is leaving at once", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 0 }, "seated");
    roster.add({ id: "b", species: "owl", seat: 1 }, "seated");
    roster.markLeaving("a");
    roster.removeLeaving();
    expect(roster.members().map((m) => m.id)).toEqual(["b"]);
  });

  it("does not let someone who left be marked as seated again by sitting everyone down", () => {
    const roster = new Roster(7);
    roster.add({ id: "a", species: "fox", seat: 0 }, "seated");
    roster.markLeaving("a");
    roster.removeLeaving();
    roster.markAllSeated();
    expect(roster.seatedCount).toBe(0);
  });
});
