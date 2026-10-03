import { describe, expect, it } from "vitest";
import { SPECIES, type Species } from "./characters/species";
import { pickArrival, pickLeaver, pickThrower } from "./demo";
import type { MemberInfo } from "./roster";
import { createRandom } from "./random";

describe("pickArrival", () => {
  it("picks a free seat and an animal not around the fire yet", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const arrival = pickArrival(
        createRandom(seed),
        7,
        new Set([0, 1, 2]),
        new Set<Species>(["fox", "owl"]),
      );
      expect(arrival).toBeDefined();
      expect([3, 4, 5, 6]).toContain(arrival?.seat);
      expect(["fox", "owl"]).not.toContain(arrival?.species);
    }
  });

  it("returns nothing when every seat is taken", () => {
    const all = new Set([0, 1, 2, 3, 4, 5, 6]);
    expect(pickArrival(createRandom(1), 7, all, new Set())).toBeUndefined();
  });

  it("still picks an animal when all of them are already around the fire", () => {
    const arrival = pickArrival(createRandom(1), 8, new Set(), new Set(SPECIES));
    expect(arrival && SPECIES.includes(arrival.species)).toBe(true);
  });
});

describe("pickLeaver", () => {
  const member = (id: string, status: MemberInfo["status"]): MemberInfo => ({
    id,
    species: "fox",
    seat: 0,
    status,
  });

  it("picks one of those sitting by the fire", () => {
    const members = [member("a", "seated"), member("b", "arriving"), member("c", "leaving")];
    for (let seed = 1; seed <= 20; seed++) {
      expect(pickLeaver(createRandom(seed), members)).toBe("a");
    }
  });

  it("can pick any of them", () => {
    const members = [member("a", "seated"), member("b", "seated"), member("c", "seated")];
    const picked = new Set<string | undefined>();
    for (let seed = 1; seed <= 60; seed++) picked.add(pickLeaver(createRandom(seed), members));
    expect(picked).toEqual(new Set(["a", "b", "c"]));
  });

  it("returns nothing when no one is sitting there", () => {
    expect(pickLeaver(createRandom(1), [])).toBeUndefined();
    expect(pickLeaver(createRandom(1), [member("a", "arriving")])).toBeUndefined();
  });
});

describe("pickThrower", () => {
  const member = (id: string, status: MemberInfo["status"] = "seated"): MemberInfo => ({
    id,
    species: "fox",
    seat: 0,
    status,
  });

  it("picks someone who can throw, never someone who is waiting or not sitting", () => {
    const members = [member("a"), member("b"), member("c", "leaving"), member("d", "arriving")];
    const waiting: Record<string, number> = { a: 30, b: 0, c: 0, d: 0 };
    for (let seed = 1; seed <= 20; seed++) {
      expect(pickThrower(createRandom(seed), members, (id) => waiting[id] ?? 0)).toEqual({
        id: "b",
      });
    }
  });

  it("says how long until someone can when everyone is waiting", () => {
    const members = [member("a"), member("b")];
    const waiting: Record<string, number> = { a: 42, b: 17 };
    expect(pickThrower(createRandom(1), members, (id) => waiting[id] ?? 0)).toEqual({ wait: 17 });
  });

  it("returns nothing when no one is sitting there", () => {
    expect(pickThrower(createRandom(1), [], () => 0)).toBeUndefined();
    expect(pickThrower(createRandom(1), [member("a", "arriving")], () => 0)).toBeUndefined();
  });
});

describe("pickArrival with a preferred animal", () => {
  it("gives it when it is free and a different one when it is not", () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(
        pickArrival(createRandom(seed), 7, new Set(), new Set<Species>(["owl"]), "cat")?.species,
      ).toBe("cat");
      expect(
        pickArrival(createRandom(seed), 7, new Set(), new Set<Species>(["owl"]), "owl")?.species,
      ).not.toBe("owl");
    }
  });
});
