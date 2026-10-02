import { describe, expect, it } from "vitest";
import { toRadians } from "./math";
import { LOG, logShape } from "./logShape";

const SQUASH = 0.3;
const input = (degrees: number, toFire = { x: 0, y: 1 }) => ({
  angle: toRadians(degrees),
  squash: SQUASH,
  toFire,
});

describe("LOG", () => {
  it("is about 1.6 times a character's base width long and 44 units thick", () => {
    expect(LOG.length / LOG.baseWidth).toBeCloseTo(1.6);
    expect(LOG.radius * 2).toBe(44);
    expect(LOG.seatHeight).toBeLessThan(LOG.radius * 2);
  });
});

describe("logShape orientation", () => {
  it("lies level where it is closest to the viewer", () => {
    const { axis } = logShape(input(90));
    expect(Math.abs(axis.y)).toBeLessThan(1e-9);
    expect(Math.abs(axis.x)).toBeCloseTo(LOG.length);
  });

  it("lies almost level a little off the nearest point and slants more farther round", () => {
    const near = logShape(input(115)).axis;
    const side = logShape(input(150)).axis;
    expect(Math.abs(near.y / near.x)).toBeLessThan(0.2);
    expect(Math.abs(side.y / side.x)).toBeGreaterThan(Math.abs(near.y / near.x));
  });

  it("is foreshortened where it points toward the viewer", () => {
    const level = Math.hypot(logShape(input(90)).axis.x, logShape(input(90)).axis.y);
    const side = logShape(input(180)).axis;
    expect(Math.hypot(side.x, side.y)).toBeCloseTo(LOG.length * SQUASH);
    expect(Math.hypot(side.x, side.y)).toBeLessThan(level);
  });
});

describe("logShape cap", () => {
  it("shows no end when the log lies across the view", () => {
    expect(logShape(input(90)).cap).toBeUndefined();
  });

  it("shows the end that faces the viewer, which is the lower one on screen", () => {
    for (const degrees of [115, 225, 300, 165, 15]) {
      const shape = logShape(input(degrees));
      const cap = shape.cap;
      expect(cap).toBeDefined();
      // The middle of the log, on the axis.
      const middleY = shape.surface(0, 0).y + LOG.radius * Math.sqrt(1 - SQUASH * SQUASH);
      expect(cap!.center.y).toBeGreaterThan(middleY);
    }
  });

  it("is a full ellipse as thick as the log", () => {
    const cap = logShape(input(225)).cap!;
    expect(Math.hypot(cap.up.x, cap.up.y)).toBeCloseTo(LOG.radius * Math.sqrt(1 - SQUASH ** 2));
  });
});

describe("logShape strips", () => {
  it("shows about half of the way round the log", () => {
    const shape = logShape(input(115), 28);
    expect(shape.strips.length).toBeGreaterThan(10);
    expect(shape.strips.length).toBeLessThan(18);
  });

  it("is as thick on screen as the log is, for a log lying level", () => {
    const { strips } = logShape(input(90));
    const ys = strips.flatMap((strip) => strip.points.map((p) => p.y));
    const ground = 0;
    expect(Math.max(...ys)).toBeGreaterThan(ground - 1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(LOG.radius * 2 * 0.9);
  });

  it("is lit more on the side facing the fire", () => {
    const mean = (toFire: { x: number; y: number }) => {
      const { strips } = logShape(input(115, toFire));
      return strips.reduce((sum, strip) => sum + strip.lit, 0) / strips.length;
    };
    // A fire in front of the log lights the side the viewer sees more than one behind it.
    expect(mean({ x: 0, y: 1 })).toBeGreaterThan(mean({ x: 0, y: -1 }));
  });

  it("keeps every strip's light between 0 and 1", () => {
    for (const degrees of [15, 65, 115, 225, 300]) {
      for (const strip of logShape(input(degrees, { x: 0.6, y: -0.8 })).strips) {
        expect(strip.lit).toBeGreaterThanOrEqual(0);
        expect(strip.lit).toBeLessThanOrEqual(1);
      }
    }
  });
});
