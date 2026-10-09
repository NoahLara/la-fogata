import { describe, expect, it } from "vitest";
import { SEAT_COUNT, SPECIES } from "./presence";
import { Roster } from "./roster";

describe("Roster", () => {
  it("gives the preferred animal when it is free", () => {
    expect(new Roster().join("a", "owl")?.species).toBe("owl");
  });

  it("gives another animal when the preferred one is taken", () => {
    const roster = new Roster();
    roster.join("a", "owl");
    const second = roster.join("b", "owl");
    expect(second?.species).not.toBe("owl");
  });

  it("seats seven people with seven different animals and seats, then refuses", () => {
    const roster = new Roster();
    for (let i = 0; i < SEAT_COUNT; i++) expect(roster.join(`p${i}`, "panda")).toBeDefined();
    expect(roster.isFull()).toBe(true);
    expect(roster.join("late")).toBeUndefined();
    expect(new Set(roster.people().map((p) => p.species))).toEqual(new Set(SPECIES));
    expect(new Set(roster.people().map((p) => p.seat)).size).toBe(SEAT_COUNT);
  });

  it("returns the same person when joining twice", () => {
    const roster = new Roster();
    expect(roster.join("a")).toEqual(roster.join("a", "fox"));
    expect(roster.people()).toHaveLength(1);
  });

  it("frees the seat and the animal when someone leaves", () => {
    const roster = new Roster();
    roster.join("a", "cat");
    expect(roster.leave("a")).toBe(true);
    expect(roster.leave("a")).toBe(false);
    expect(roster.join("b", "cat")?.species).toBe("cat");
  });

  it("changes animal only when nobody else has it", () => {
    const roster = new Roster();
    roster.join("a", "cat");
    roster.join("b", "fox");
    expect(roster.changeSpecies("a", "fox")).toEqual({ status: "taken" });
    expect(roster.changeSpecies("a", "cat")).toEqual({ status: "unchanged" });
    expect(roster.changeSpecies("zz", "owl")).toEqual({ status: "not-seated" });
    const changed = roster.changeSpecies("a", "owl");
    expect(changed.status).toBe("changed");
    expect(roster.people().find((p) => p.id === "a")?.species).toBe("owl");
  });
});

describe("Roster silence", () => {
  it("gives up only those who stopped giving signs of life", () => {
    let now = 0;
    const roster = new Roster(Math.random, () => now);
    const quiet = roster.join("quiet");
    const alive = roster.join("alive");
    expect(quiet && alive).toBeTruthy();
    now = 50_000;
    roster.touch("alive");
    now = 60_000;
    expect(roster.expired(60_000)).toEqual(["quiet"]);
  });

  it("ignores a sign of life from someone who is not sitting", () => {
    let now = 0;
    const roster = new Roster(Math.random, () => now);
    roster.touch("stranger");
    now = 1_000_000;
    expect(roster.expired(1)).toEqual([]);
  });

  it("forgets whoever leaves", () => {
    let now = 0;
    const roster = new Roster(Math.random, () => now);
    roster.join("a");
    roster.leave("a");
    now = 1_000_000;
    expect(roster.expired(1)).toEqual([]);
  });
});

describe("Roster has", () => {
  it("knows who is sitting", () => {
    const roster = new Roster();
    roster.join("a");
    expect(roster.has("a")).toBe(true);
    expect(roster.has("b")).toBe(false);
    roster.leave("a");
    expect(roster.has("a")).toBe(false);
  });
});
