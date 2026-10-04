import { describe, expect, it } from "vitest";
import { createRandom } from "@/scene/random";
import { ANSWERED_LIFETIME_MS, DAY, PETITION_LIFETIME_MS, SKY_SIZE } from "./limits";
import { expiresAt, isAlive, pickSky, skyLimit } from "./sky";

const star = (prayers: number, createdAt = 0, answered?: { at: number }) => ({
  createdAt,
  prayers,
  ...(answered ? { answered } : {}),
});

describe("expiry", () => {
  it("lasts 30 days, and an answered one 30 more from when it was answered", () => {
    expect(expiresAt(star(0, 100))).toBe(100 + PETITION_LIFETIME_MS);
    expect(expiresAt(star(0, 100, { at: 10 * DAY }))).toBe(10 * DAY + ANSWERED_LIFETIME_MS);
  });

  it("is alive until the moment it expires", () => {
    const petition = star(0, 0);
    expect(isAlive(petition, PETITION_LIFETIME_MS - 1)).toBe(true);
    expect(isAlive(petition, PETITION_LIFETIME_MS)).toBe(false);
  });
});

describe("pickSky", () => {
  it("leaves out expired petitions", () => {
    const sky = pickSky([star(0, 0), star(5, 40 * DAY)], 40 * DAY, createRandom(1));
    expect(sky).toHaveLength(1);
    expect(sky[0]?.prayers).toBe(5);
  });

  it("shows at most the size of a sky, preferring those with fewer prayers", () => {
    const all = Array.from({ length: SKY_SIZE + 20 }, (_, i) => star(i));
    const sky = pickSky(all, 0, createRandom(2));
    expect(sky).toHaveLength(SKY_SIZE);
    expect(Math.max(...sky.map((petition) => petition.prayers))).toBe(SKY_SIZE - 1);
  });

  it("is sorted from the least prayed for", () => {
    const sky = pickSky([star(3), star(0), star(2), star(1)], 0, createRandom(3));
    expect(sky.map((petition) => petition.prayers)).toEqual([0, 1, 2, 3]);
  });

  it("mixes petitions with the same count, so other stars pass over time", () => {
    const all = Array.from({ length: 60 }, (_, i) => ({ ...star(0), id: i }));
    const firsts = new Set<number>();
    for (let seed = 1; seed <= 10; seed++)
      firsts.add(pickSky(all, 0, createRandom(seed))[0]?.id ?? -1);
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("does not change the list it is given", () => {
    const all = [star(2), star(1)];
    pickSky(all, 0, createRandom(4));
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
