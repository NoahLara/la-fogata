import { describe, expect, it } from "vitest";
import { SPECIES, type Species } from "./characters/species";
import { pickArrival, pickLeaver } from "./demo";
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
