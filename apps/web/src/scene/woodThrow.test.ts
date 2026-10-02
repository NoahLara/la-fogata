import { describe, expect, it } from "vitest";
import { arcAt, spinAt, swingAt, THROW } from "./woodThrow";

describe("arcAt", () => {
  const from = { x: 100, y: 300 };
  const to = { x: 400, y: 200 };

  it("starts at the thrower and ends in the fire", () => {
    expect(arcAt(from, to, 80, 0)).toEqual(from);
    expect(arcAt(from, to, 80, 1)).toEqual(to);
  });

  it("rises above the straight line in the middle, by the height asked for", () => {
    const middle = arcAt(from, to, 80, 0.5);
    expect(middle.x).toBe(250);
    expect(middle.y).toBe(250 - 80);
  });

  it("goes straight across at an even pace", () => {
    for (const u of [0.1, 0.4, 0.8]) expect(arcAt(from, to, 50, u).x).toBeCloseTo(100 + 300 * u);
  });

  it("is a straight line with no height", () => {
    expect(arcAt(from, to, 0, 0.5)).toEqual({ x: 250, y: 250 });
  });
});

describe("spinAt", () => {
  it("turns the log one and a half times over the flight, either way", () => {
    expect(spinAt(0)).toBe(0);
    expect(spinAt(1)).toBeCloseTo(THROW.turns * 2 * Math.PI);
    expect(spinAt(1, -1)).toBeCloseTo(-THROW.turns * 2 * Math.PI);
  });
});

describe("swingAt", () => {
  it("stretches the thrower up and back to nothing", () => {
    expect(swingAt(0)).toBe(0);
    expect(swingAt(THROW.swing.seconds)).toBeCloseTo(0);
    expect(swingAt(THROW.swing.seconds / 2)).toBeCloseTo(THROW.swing.amount);
    expect(swingAt(-1)).toBe(0);
    expect(swingAt(10)).toBeCloseTo(0);
  });

  it("lets go of the log while the arm is still moving", () => {
    expect(THROW.release).toBeLessThan(THROW.swing.seconds);
    expect(THROW.release).toBeGreaterThan(0);
  });
});
