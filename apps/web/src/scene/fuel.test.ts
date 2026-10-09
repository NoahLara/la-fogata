import { describe, expect, it } from "vitest";
import { addLog, burn, FIRE, fireIntensityFor, fuelAfterLanding } from "./fuel";

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

  it("lets one log fade within about a minute, so the fire goes down soon after the wood stops", () => {
    const afterAMinute = burn(addLog(0), 60);
    expect(afterAMinute).toBeGreaterThan(FIRE.logFuel * 0.1);
    expect(afterAMinute).toBeLessThan(FIRE.logFuel * 0.5);
  });
});

describe("a log at any moment", () => {
  it("always adds fuel up to the ceiling, and never past it", () => {
    let fuel = 0;
    for (let i = 0; i < 30; i++) fuel = addLog(fuel);
    expect(fuel).toBe(FIRE.maxFuel);
    const topLight = fireIntensityFor(7, fuel);
    expect(topLight).toBeLessThanOrEqual(FIRE.max);
    expect(fireIntensityFor(7, addLog(fuel))).toBe(topLight);
  });

  it("lets a fire at its top die down to its small self once they stop", () => {
    let fuel: number = FIRE.maxFuel;
    for (let second = 0; second < 400; second++) fuel = burn(fuel, 1);
    expect(fireIntensityFor(7, fuel)).toBeCloseTo(fireIntensityFor(7, 0), 2);
  });
});

describe("fuelAfterLanding", () => {
  it("adds a log to what there is when the log is the visitor's own", () => {
    expect(fuelAfterLanding(0.3, undefined, 1)).toBeCloseTo(0.3 + FIRE.logFuel);
  });

  it("takes the campfire's fuel, burnt down for the flight, when the log is somebody else's", () => {
    expect(fuelAfterLanding(0.05, 0.6, 0)).toBe(0.6);
    expect(fuelAfterLanding(0.9, 0.6, 1)).toBeCloseTo(burn(0.6, 1));
  });

  it("is the same fire for everyone whatever they had before", () => {
    expect(fuelAfterLanding(0, 0.5, 0.5)).toBeCloseTo(fuelAfterLanding(1, 0.5, 0.5));
  });
});
