import { describe, expect, it } from "vitest";
import { addLog, burn, FIRE, fireIntensityFor, WOOD_COOLDOWN_SECONDS, WoodCooldowns } from "./fuel";

describe("fireIntensityFor", () => {
  it("is really low with nobody there and no wood, but never out", () => {
    expect(fireIntensityFor(0, 0)).toBe(FIRE.min);
    expect(FIRE.min).toBeGreaterThan(0);
    expect(FIRE.min).toBeLessThan(0.3);
  });

  it("grows a little with each person and a lot with wood", () => {
    expect(fireIntensityFor(1, 0)).toBeGreaterThan(fireIntensityFor(0, 0));
    expect(fireIntensityFor(7, 0)).toBeCloseTo(FIRE.min + 7 * FIRE.perMember);
    expect(fireIntensityFor(7, 0)).toBeLessThan(fireIntensityFor(0, 0.5));
    expect(fireIntensityFor(3, 0.6)).toBeGreaterThan(fireIntensityFor(3, 0.2));
  });

  it("never goes past the biggest the fire gets, however much wood or how many people", () => {
    expect(fireIntensityFor(7, FIRE.maxFuel)).toBeLessThanOrEqual(FIRE.max);
    expect(fireIntensityFor(100, 50)).toBe(FIRE.max);
    expect(fireIntensityFor(0, -3)).toBe(FIRE.min);
  });

  it("can reach the top with a full room throwing wood", () => {
    expect(fireIntensityFor(7, FIRE.maxFuel)).toBeGreaterThan(1.3);
  });
});

describe("addLog", () => {
  it("adds fuel for each log, up to a limit", () => {
    let fuel = 0;
    for (let i = 0; i < 3; i++) fuel = addLog(fuel);
    expect(fuel).toBeCloseTo(3 * FIRE.logFuel);
    for (let i = 0; i < 50; i++) fuel = addLog(fuel);
    expect(fuel).toBe(FIRE.maxFuel);
  });

  it("takes more than a few logs to fill the fire", () => {
    expect(FIRE.maxFuel / FIRE.logFuel).toBeGreaterThan(4);
  });
});

describe("burn", () => {
  it("burns fuel down over time, a third left after the burn time", () => {
    expect(burn(1, FIRE.burnSeconds)).toBeCloseTo(Math.exp(-1));
    expect(burn(0.5, 10)).toBeLessThan(0.5);
    expect(burn(0.5, 0)).toBe(0.5);
  });

  it("gives the same result however the time is cut up", () => {
    let fuel = 0.8;
    for (let i = 0; i < 600; i++) fuel = burn(fuel, 1 / 60);
    expect(fuel).toBeCloseTo(burn(0.8, 10), 8);
  });

  it("burns out to nothing in the end instead of lingering", () => {
    let fuel = 1;
    for (let i = 0; i < 2000; i++) fuel = burn(fuel, 1);
    expect(fuel).toBe(0);
  });

  it("holds about one log's fuel for a couple of minutes, so one person alone keeps a small fire", () => {
    const afterAMinute = burn(addLog(0), WOOD_COOLDOWN_SECONDS);
    expect(afterAMinute).toBeGreaterThan(FIRE.logFuel * 0.4);
    expect(afterAMinute).toBeLessThan(FIRE.logFuel);
  });
});

describe("WoodCooldowns", () => {
  it("lets anyone throw the first time", () => {
    expect(new WoodCooldowns().canThrow("a", 0)).toBe(true);
    expect(new WoodCooldowns().remaining("a", 1234)).toBe(0);
  });

  it("blocks someone for a minute after they throw", () => {
    const cooldowns = new WoodCooldowns();
    cooldowns.record("a", 10);
    expect(cooldowns.canThrow("a", 10)).toBe(false);
    expect(cooldowns.remaining("a", 10)).toBe(WOOD_COOLDOWN_SECONDS);
    expect(cooldowns.remaining("a", 40)).toBe(30);
    expect(cooldowns.canThrow("a", 69.9)).toBe(false);
    expect(cooldowns.canThrow("a", 70)).toBe(true);
    expect(cooldowns.remaining("a", 500)).toBe(0);
  });

  it("keeps everyone's wait to themselves", () => {
    const cooldowns = new WoodCooldowns();
    cooldowns.record("a", 0);
    expect(cooldowns.canThrow("b", 1)).toBe(true);
  });

  it("forgets someone who has gone", () => {
    const cooldowns = new WoodCooldowns();
    cooldowns.record("a", 0);
    cooldowns.forget("a");
    expect(cooldowns.canThrow("a", 1)).toBe(true);
  });

  it("can use another wait", () => {
    const cooldowns = new WoodCooldowns(5);
    cooldowns.record("a", 0);
    expect(cooldowns.canThrow("a", 4.9)).toBe(false);
    expect(cooldowns.canThrow("a", 5)).toBe(true);
  });

  it("makes a full room's logs hold the fire at its top only while they keep throwing", () => {
    // Seven people each throw once a minute: the fuel climbs to its limit and stays there.
    const cooldowns = new WoodCooldowns();
    let fuel = 0;
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    for (let second = 0; second < 600; second++) {
      fuel = burn(fuel, 1);
      ids.forEach((id, i) => {
        if (second >= i * 8 && cooldowns.canThrow(id, second)) {
          cooldowns.record(id, second);
          fuel = addLog(fuel);
        }
      });
    }
    expect(fuel).toBeGreaterThan(0.85);
    expect(fuel).toBeLessThanOrEqual(FIRE.maxFuel);
    // Then they stop, and the fire dies down to its small self.
    for (let second = 0; second < 900; second++) fuel = burn(fuel, 1);
    expect(fireIntensityFor(7, fuel)).toBeCloseTo(fireIntensityFor(7, 0), 2);
  });
});
