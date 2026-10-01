import { describe, expect, it } from "vitest";
import { between, clamp, randomInt, smoothstep, TAU, toRadians } from "./math";
import { createRandom } from "./random";

describe("clamp", () => {
  it("keeps a value inside the range", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});

describe("between", () => {
  it("maps the generator's 0..1 onto min..max", () => {
    expect(between(() => 0, 2, 6)).toBe(2);
    expect(between(() => 0.5, 2, 6)).toBe(4);
  });
});

describe("randomInt", () => {
  it("reaches both ends of the range and never leaves it", () => {
    expect(randomInt(() => 0, 3, 7)).toBe(3);
    expect(randomInt(() => 0.999999, 3, 7)).toBe(7);
    const rand = createRandom(11);
    for (let i = 0; i < 500; i++) {
      const value = randomInt(rand, 2, 4);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(4);
    }
  });

  it("draws from the generator exactly once, so seeded scenery stays the same", () => {
    let calls = 0;
    randomInt(() => (calls++, 0.3), 0, 9);
    expect(calls).toBe(1);
  });

  it("returns the only choice of a one-value range", () => {
    expect(randomInt(createRandom(1), 5, 5)).toBe(5);
  });
});

describe("smoothstep", () => {
  it("is 0 before the range and 1 after it", () => {
    expect(smoothstep(0.4, 1, 0)).toBe(0);
    expect(smoothstep(0.4, 1, 0.4)).toBe(0);
    expect(smoothstep(0.4, 1, 1)).toBe(1);
    expect(smoothstep(0.4, 1, 3)).toBe(1);
  });

  it("is 0.5 halfway and eases in and out", () => {
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 0.1)).toBeLessThan(0.1);
    expect(smoothstep(0, 1, 0.9)).toBeGreaterThan(0.9);
  });
});

describe("toRadians", () => {
  it("converts degrees", () => {
    expect(toRadians(0)).toBe(0);
    expect(toRadians(180)).toBe(Math.PI);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 12);
    expect(toRadians(360)).toBeCloseTo(TAU, 12);
  });
});
