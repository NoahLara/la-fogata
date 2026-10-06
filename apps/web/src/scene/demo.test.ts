import { describe, expect, it } from "vitest";
import { SPECIES, type Species } from "./characters/species";
import { pickArrival } from "./demo";
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
