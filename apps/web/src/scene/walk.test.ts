import { describe, expect, it } from "vitest";
import { computeLayout, seatPosition } from "./layout";
import { createRandom } from "./random";
import { SEATS } from "./seatTable";
import {
  keepOutRadius,
  keepOutZone,
  pathFromPoints,
  planArrival,
  planDeparture,
  pointAt,
  pushOut,
  scaleRatioAt,
  smoothCurve,
} from "./walk";

const layouts = [
  computeLayout(1200, 800, { top: 0, bottom: 0 }),
  computeLayout(390, 760, { top: 60, bottom: 120 }),
];

describe("pathFromPoints / pointAt", () => {
  const path = pathFromPoints([
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ]);

  it("measures the path", () => {
    expect(path.length).toBe(20);
  });

  it("finds a point at a distance, with its heading, clamped to the ends", () => {
    expect(pointAt(path, 5)).toEqual({ x: 5, y: 0, dx: 1, dy: 0 });
    expect(pointAt(path, 15)).toEqual({ x: 10, y: 5, dx: 0, dy: 1 });
    expect(pointAt(path, -3).x).toBe(0);
    expect(pointAt(path, 99)).toMatchObject({ x: 10, y: 10 });
  });
});

describe("smoothCurve", () => {
  it("starts and ends on the control points", () => {
    const curve = smoothCurve([
      { x: 0, y: 0 },
      { x: 5, y: 8 },
      { x: 10, y: 0 },
    ]);
    expect(curve[0]).toEqual({ x: 0, y: 0 });
    expect(curve[curve.length - 1]).toEqual({ x: 10, y: 0 });
  });
});

describe("pushOut", () => {
  const zone = keepOutZone(layouts[0]!);

  it("leaves points outside the zone alone", () => {
    const outside = { x: zone.cx + zone.rx * 2, y: zone.cy };
    expect(pushOut(zone, outside)).toBe(outside);
  });

  it("moves points inside the zone onto its edge, even at the centre", () => {
    expect(keepOutRadius(zone, pushOut(zone, { x: zone.cx + 5, y: zone.cy + 2 }))).toBeCloseTo(1);
    expect(keepOutRadius(zone, pushOut(zone, { x: zone.cx, y: zone.cy }))).toBeCloseTo(1);
  });
});

describe("planArrival", () => {
  for (const layout of layouts) {
    const zone = keepOutZone(layout);
    SEATS.forEach((spec, index) => {
      const seat = seatPosition(layout, spec.degrees, spec.view === "back" ? 1 : 0.8);
      const label = `seat ${index} at ${layout.width}px`;

      it(`never goes through the fire (${label})`, () => {
        for (let seed = 1; seed <= 20; seed++) {
          const { path } = planArrival(layout, seat, {
            log: spec.log === true,
            rand: createRandom(seed),
          });
          for (const point of path.points) {
            expect(keepOutRadius(zone, point)).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        }
      });

      it(`goes around the fire from the opposite side too (${label})`, () => {
        const from = { x: seat.x < layout.cx ? layout.width + 20 : -20, y: layout.cy };
        const { path } = planArrival(layout, seat, {
          log: spec.log === true,
          rand: createRandom(3),
          from,
        });
        for (const point of path.points) {
          expect(keepOutRadius(zone, point)).toBeGreaterThanOrEqual(1 - 1e-9);
        }
      });
    });
  }

  it("brings far seats out of the tree line and everyone else in from the nearest edge", () => {
    const layout = layouts[0]!;
    SEATS.forEach((spec, index) => {
      const seat = seatPosition(layout, spec.degrees, spec.view === "back" ? 1 : 0.8);
      const plan = planArrival(layout, seat, { log: false, rand: createRandom(index + 1) });
      const start = plan.path.points[0]!;
      if (seat.y < layout.cy) {
        expect(plan.fromTrees).toBe(true);
        expect(start.y).toBeLessThan(layout.horizon + 10 * layout.u);
      } else {
        expect(plan.fromTrees).toBe(false);
        expect(start.x < 0 || start.x > layout.width).toBe(true);
        // Nearest edge: on the same side of the fire as the seat.
        expect(start.x < layout.cx).toBe(seat.x < layout.cx);
      }
    });
  });

  it("ends at the seat, or in front of its log", () => {
    const layout = layouts[0]!;
    const seat = seatPosition(layout, 115);
    const plain = planArrival(layout, seat, { log: false, rand: createRandom(1) });
    expect(plain.approach).toEqual({ x: seat.x, y: seat.y });
    const onLog = planArrival(layout, seat, { log: true, rand: createRandom(1) });
    expect(onLog.approach.x).toBe(seat.x);
    expect(onLog.approach.y).toBeGreaterThan(seat.y);
    const end = onLog.path.points[onLog.path.points.length - 1];
    expect(end).toEqual(onLog.approach);
  });

  it("is the same for the same random numbers and different for others", () => {
    const layout = layouts[0]!;
    const seat = seatPosition(layout, 15, 0.8);
    const a = planArrival(layout, seat, { log: false, rand: createRandom(5) });
    const b = planArrival(layout, seat, { log: false, rand: createRandom(5) });
    const c = planArrival(layout, seat, { log: false, rand: createRandom(6) });
    expect(a).toEqual(b);
    expect(a.path.length).not.toBe(c.path.length);
  });

  it("walks the last stretch straight toward the fire at a side seat, so it arrives facing it", () => {
    for (const layout of layouts) {
      SEATS.forEach((spec, index) => {
        if (spec.view !== "side") return;
        const seat = seatPosition(layout, spec.degrees, 0.8);
        const toward = seat.x < layout.cx ? 1 : -1;
        for (let seed = 1; seed <= 10; seed++) {
          const plan = planArrival(layout, seat, {
            log: false,
            rand: createRandom(seed + index),
            faceFire: true,
          });
          expect(plan.endHeading).toBe(toward);
          // The final character-height of walking is level and heads straight at the fire.
          const { path } = plan;
          for (const point of path.points) {
            if (
              path.length - (path.cumulative[path.points.indexOf(point)] ?? 0) <
              layout.characterHeight * 0.9
            ) {
              expect(point.y).toBeCloseTo(seat.y);
            }
          }
          const last = sampleLast(path);
          expect(Math.sign(last.dx)).toBe(toward);
          expect(last.dy).toBeCloseTo(0);
        }
      });
    }
  });

  it("still keeps out of the fire when it finishes straight, even from the other side", () => {
    const layout = layouts[0]!;
    const zone = keepOutZone(layout);
    for (const degrees of [165, 15]) {
      const seat = seatPosition(layout, degrees, 0.8);
      const from = { x: seat.x < layout.cx ? layout.width + 20 : -20, y: layout.cy };
      const { path, endHeading } = planArrival(layout, seat, {
        log: false,
        rand: createRandom(3),
        from,
        faceFire: true,
      });
      expect(endHeading).toBe(seat.x < layout.cx ? 1 : -1);
      for (const point of path.points) {
        expect(keepOutRadius(zone, point)).toBeGreaterThanOrEqual(1 - 1e-9);
      }
    }
  });

  it("reports which way a plain walk ends", () => {
    const layout = layouts[0]!;
    const seat = seatPosition(layout, 255, 0.8);
    const plan = planArrival(layout, seat, { log: false, rand: createRandom(1) });
    expect([1, -1]).toContain(plan.endHeading);
  });

  it("is a curve, not a straight line", () => {
    const layout = layouts[0]!;
    const seat = seatPosition(layout, 165, 0.8);
    const { path } = planArrival(layout, seat, { log: false, rand: createRandom(2) });
    const first = path.points[0]!;
    const last = path.points[path.points.length - 1]!;
    const straight = Math.hypot(last.x - first.x, last.y - first.y);
    expect(path.length).toBeGreaterThan(straight * 1.0005);
  });
});

const sampleLast = (path: ReturnType<typeof planArrival>["path"]) => pointAt(path, path.length);

describe("scaleRatioAt", () => {
  const layout = layouts[0]!;

  it("is exactly 1 at the seat and smaller farther from the viewer", () => {
    expect(scaleRatioAt(layout, 300, 300)).toBe(1);
    expect(scaleRatioAt(layout, layout.horizon, layout.cy)).toBeLessThan(1);
    expect(scaleRatioAt(layout, layout.cy + layout.ry, layout.cy)).toBeGreaterThan(1);
  });
});

describe("planDeparture", () => {
  for (const layout of layouts) {
    const zone = keepOutZone(layout);
    SEATS.forEach((spec, index) => {
      const seat = seatPosition(layout, spec.degrees, spec.view === "back" ? 1 : 0.8);
      const options = (seed: number) => ({
        log: spec.log === true,
        rand: createRandom(seed),
        faceFire: spec.view === "side",
      });

      it(`is the way in run backwards (seat ${index} at ${layout.width}px)`, () => {
        for (let seed = 1; seed <= 10; seed++) {
          const arrival = planArrival(layout, seat, options(seed));
          const departure = planDeparture(layout, seat, options(seed));
          expect(departure.path.points).toEqual([...arrival.path.points].reverse());
          expect(departure.path.length).toBeCloseTo(arrival.path.length);
          expect(departure.approach).toEqual(arrival.approach);
          expect(departure.toTrees).toBe(arrival.fromTrees);
          expect(departure.path.points[0]).toEqual(departure.approach);
        }
      });

      it(`never goes through the fire (seat ${index} at ${layout.width}px)`, () => {
        for (let seed = 1; seed <= 10; seed++) {
          for (const point of planDeparture(layout, seat, options(seed)).path.points) {
            expect(keepOutRadius(zone, point)).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        }
      });
    });
  }

  it("goes into the trees from far seats and off the nearest edge from the rest", () => {
    const layout = layouts[0]!;
    SEATS.forEach((spec, index) => {
      const seat = seatPosition(layout, spec.degrees, spec.view === "back" ? 1 : 0.8);
      const plan = planDeparture(layout, seat, { log: false, rand: createRandom(index + 1) });
      const end = plan.path.points[plan.path.points.length - 1]!;
      if (seat.y < layout.cy) {
        expect(plan.toTrees).toBe(true);
        expect(end.y).toBeLessThan(layout.horizon + 10 * layout.u);
      } else {
        expect(plan.toTrees).toBe(false);
        expect(end.x < 0 || end.x > layout.width).toBe(true);
        expect(end.x < layout.cx).toBe(seat.x < layout.cx);
      }
    });
  });

  it("starts a side seat walking straight away from the fire", () => {
    for (const layout of layouts) {
      for (const degrees of [165, 15]) {
        const seat = seatPosition(layout, degrees, 0.8);
        const away = seat.x < layout.cx ? -1 : 1;
        const plan = planDeparture(layout, seat, {
          log: false,
          rand: createRandom(2),
          faceFire: true,
        });
        expect(plan.startHeading).toBe(away);
        const start = pointAt(plan.path, 0);
        expect(Math.sign(start.dx)).toBe(away);
        expect(start.dy).toBeCloseTo(0);
      }
    }
  });
});
