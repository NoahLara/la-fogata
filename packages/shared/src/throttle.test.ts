import { describe, expect, it } from "vitest";
import { Throttle } from "./throttle";

describe("Throttle", () => {
  it("lets a burst through and drops the rest", () => {
    const throttle = new Throttle({ burst: 5, perSecond: 2 }, () => 0);
    const results = Array.from({ length: 8 }, () => throttle.allow("a"));
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it("earns more over time, up to the burst", () => {
    let now = 0;
    const throttle = new Throttle({ burst: 3, perSecond: 2 }, () => now);
    for (let i = 0; i < 3; i++) throttle.allow("a");
    expect(throttle.allow("a")).toBe(false);
    now = 500;
    expect(throttle.allow("a")).toBe(true);
    expect(throttle.allow("a")).toBe(false);
    now = 60_000;
    expect(Array.from({ length: 5 }, () => throttle.allow("a")).filter(Boolean)).toHaveLength(3);
  });

  it("keeps each key apart, and forgets those who leave", () => {
    const throttle = new Throttle({ burst: 1, perSecond: 0 }, () => 0);
    expect(throttle.allow("a")).toBe(true);
    expect(throttle.allow("a")).toBe(false);
    expect(throttle.allow("b")).toBe(true);
    throttle.forget("a");
    expect(throttle.allow("a")).toBe(true);
  });
});
