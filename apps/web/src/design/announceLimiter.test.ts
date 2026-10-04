import { describe, expect, it } from "vitest";
import { ANNOUNCE_GAP_MS, createAnnounceLimiter } from "./announceLimiter";

describe("the announcement rate limit", () => {
  it("lets the first through and drops the ones inside the window", () => {
    let now = 1000;
    const limiter = createAnnounceLimiter(10_000, () => now);
    expect(limiter.take()).toBe(true);
    now += 3000;
    expect(limiter.take()).toBe(false);
    now += 6999;
    expect(limiter.take()).toBe(false);
  });

  it("lets another through once the window has passed, counted from the last one said", () => {
    let now = 0;
    const limiter = createAnnounceLimiter(10_000, () => now);
    expect(limiter.take()).toBe(true);
    now = 10_000;
    expect(limiter.take()).toBe(true);
    now = 15_000;
    expect(limiter.take()).toBe(false);
    now = 20_000;
    expect(limiter.take()).toBe(true);
  });

  it("is one every ten seconds by default", () => {
    expect(ANNOUNCE_GAP_MS).toBe(10_000);
  });
});
