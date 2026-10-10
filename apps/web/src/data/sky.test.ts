import { describe, expect, it } from "vitest";
import { createRandom } from "@/scene/random";
import { SKY_SIZE } from "./limits";
import { pickSky, skyLimit } from "./sky";

const DAY = 24 * 60 * 60 * 1000;

const star = (prayers: number, createdAt = 0, answered?: { at: number }) => ({
  createdAt,
  prayers,
  ...(answered ? { answered } : {}),
});

describe("pickSky", () => {
  it("never leaves a petition out for being old: they do not expire", () => {
    const old = [star(0, 0), star(5, 400 * DAY), star(1, 3000 * DAY, { at: 3100 * DAY })];
    const sky = pickSky(old, createRandom(1));
    expect(sky).toHaveLength(3);
    expect(sky.map((petition) => petition.prayers)).toEqual([0, 1, 5]);
  });

  it("shows at most the size of a sky, preferring those with fewer prayers", () => {
    const all = Array.from({ length: SKY_SIZE + 20 }, (_, i) => star(i));
    const sky = pickSky(all, createRandom(2));
    expect(sky).toHaveLength(SKY_SIZE);
    expect(Math.max(...sky.map((petition) => petition.prayers))).toBe(SKY_SIZE - 1);
  });

  it("is sorted from the least prayed for", () => {
    const sky = pickSky([star(3), star(0), star(2), star(1)], createRandom(3));
    expect(sky.map((petition) => petition.prayers)).toEqual([0, 1, 2, 3]);
  });

  it("mixes petitions with the same count, so other stars pass over time", () => {
    const all = Array.from({ length: 60 }, (_, i) => ({ ...star(0), id: i }));
    const firsts = new Set<number>();
    for (let seed = 1; seed <= 10; seed++)
      firsts.add(pickSky(all, createRandom(seed))[0]?.id ?? -1);
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("does not change the list it is given", () => {
    const all = [star(2), star(1)];
    pickSky(all, createRandom(4));
    expect(all.map((petition) => petition.prayers)).toEqual([2, 1]);
  });
});

describe("skyLimit", () => {
  it("is about thirty for every screen width of the panorama", () => {
    expect(skyLimit(4000, 1000)).toBe(SKY_SIZE * 4);
    expect(skyLimit(1560, 390)).toBe(SKY_SIZE * 4);
  });

  it("never drops under one screen's worth, and copes with no size yet", () => {
    expect(skyLimit(500, 1000)).toBe(SKY_SIZE);
    expect(skyLimit(0, 0)).toBe(SKY_SIZE);
  });
});
