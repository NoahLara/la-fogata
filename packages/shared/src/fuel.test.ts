import { describe, expect, it } from "vitest";
import { addLog, burn, Fire, FUEL } from "./fuel";

describe("fuel", () => {
  it("never holds more than the ceiling", () => {
    let fuel = 0;
    for (let i = 0; i < 100; i++) fuel = addLog(fuel);
    expect(fuel).toBe(FUEL.maxFuel);
  });

  it("burns down on its own, a third left after burnSeconds", () => {
    expect(burn(1, FUEL.burnSeconds)).toBeCloseTo(Math.exp(-1));
    expect(burn(0.00005, 1)).toBe(0);
  });
});

describe("Fire", () => {
  it("starts out cold", () => {
    expect(new Fire(() => 0).level()).toBe(0);
  });

  it("gets fuel from each log and burns it down with the clock", () => {
    let now = 0;
    const fire = new Fire(() => now);
    expect(fire.throwLog()).toBeCloseTo(FUEL.logFuel);
    expect(fire.throwLog()).toBeCloseTo(2 * FUEL.logFuel);
    now = FUEL.burnSeconds * 1000;
    expect(fire.level()).toBeCloseTo(2 * FUEL.logFuel * Math.exp(-1));
  });

  it("adds a log to what is left, not to what there was", () => {
    let now = 0;
    const fire = new Fire(() => now);
    fire.throwLog();
    now = 30_000;
    expect(fire.throwLog()).toBeCloseTo(burn(FUEL.logFuel, 30) + FUEL.logFuel);
  });

  it("stops at the ceiling however many logs fly", () => {
    const fire = new Fire(() => 0);
    for (let i = 0; i < 50; i++) fire.throwLog();
    expect(fire.level()).toBe(FUEL.maxFuel);
  });

  it("is back to nothing in a few minutes alone", () => {
    let now = 0;
    const fire = new Fire(() => now);
    for (let i = 0; i < 10; i++) fire.throwLog();
    now = 10 * 60 * 1000;
    expect(fire.level()).toBeLessThan(0.001);
  });
});
