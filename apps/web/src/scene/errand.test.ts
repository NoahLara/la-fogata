import { describe, expect, it } from "vitest";
import { ERRAND, errandFrame, errandTimeline, leanAt, returnTimeline } from "./errand";
import { computeLayout, seatPosition } from "./layout";
import { HOP_SECONDS, STAND_SECONDS, TURN_SECONDS } from "./seatState";
import { ringScaleFor, SEATS } from "./seatTable";
import { keepOutRadius, keepOutZone, planErrand, pointAt } from "./walk";

// A wide screen and a phone: the plan has to hold on both.
const LAYOUTS = [
  ["desktop", computeLayout(1280, 800, { top: 0, bottom: 72 })],
  ["phone", computeLayout(390, 780, { top: 0, bottom: 72 })],
] as const;

describe("errandTimeline", () => {
  it("adds up the stand, hop, turn and walk, then the lean", () => {
    const plain = errandTimeline({ log: false, turn: false });
    expect(plain.out.hop).toBe(0);
    expect(plain.out.turn).toBe(0);
    expect(plain.total).toBeCloseTo(plain.out.total + ERRAND.place);
    const full = errandTimeline({ log: true, turn: true });
    expect(full.out.hop).toBeGreaterThan(0);
    expect(full.out.turn).toBeGreaterThan(0);
    expect(full.total).toBeGreaterThan(plain.total);
  });

  it("is slow and unhurried, but not so long that the whole ritual passes eight seconds", () => {
    const out = errandTimeline({ log: true, turn: true }).total;
    const back = returnTimeline({ log: true, turn: true }).total;
    expect(out).toBeGreaterThan(2.5);
    expect(out).toBeLessThan(4);
    expect(back).toBeGreaterThan(1.8);
    expect(back).toBeLessThan(3);
  });

  it("is slower than an ordinary arrival or departure at every step", () => {
    expect(errandTimeline({ log: false, turn: false }).out.stand).toBeGreaterThan(STAND_SECONDS);
    expect(returnTimeline({ log: true, turn: true }).hop).toBeGreaterThan(HOP_SECONDS);
    expect(returnTimeline({ log: true, turn: true }).turn).toBeGreaterThan(TURN_SECONDS);
  });
});

describe("returnTimeline", () => {
  it("turns into the seat or settles, never both, and hops only onto a log", () => {
    const turning = returnTimeline({ log: false, turn: true });
    expect(turning.turn).toBeGreaterThan(0);
    expect(turning.settle).toBe(0);
    const settling = returnTimeline({ log: true, turn: false });
    expect(settling.turn).toBe(0);
    expect(settling.settle).toBeGreaterThan(0);
    expect(settling.hop).toBeGreaterThan(0);
    expect(returnTimeline({ log: false, turn: false }).hop).toBe(0);
  });
});

describe("errandFrame", () => {
  const timeline = errandTimeline({ log: true, turn: true });

  it("goes stand, hop, turn, walk, place, then done, in order", () => {
    const seen: string[] = [];
    for (let t = 0; t <= timeline.total + 0.5; t += 0.02) {
      const { phase } = errandFrame(timeline, t);
      if (seen[seen.length - 1] !== phase) seen.push(phase);
    }
    expect(seen).toEqual(["standing", "hopping", "turning", "walking", "placing", "done"]);
  });

  it("starts at the start and is done at the end", () => {
    expect(errandFrame(timeline, 0)).toEqual({ phase: "standing", progress: 0 });
    expect(errandFrame(timeline, timeline.total + 1).phase).toBe("done");
  });
});

describe("leanAt", () => {
  it("is upright before and after, and leans over the stones in between", () => {
    expect(leanAt(0)).toBe(0);
    expect(leanAt(1)).toBeLessThan(0.05);
    expect(Math.max(...[0.2, 0.4, 0.6].map(leanAt))).toBeGreaterThan(0.3);
  });
});

describe.each(LAYOUTS)("planErrand on a %s screen", (_, screen) => {
  const zone = keepOutZone(screen);
  const seats = SEATS.map((spec) => ({
    spec,
    seat: seatPosition(screen, spec.degrees, ringScaleFor(spec)),
  }));

  it.each(seats.map((place, index) => [index, place] as const))(
    "seat %i: goes from the seat to a spot beside the stones and back",
    (_i, place) => {
      const plan = planErrand(screen, place.seat, { log: place.spec.log === true });
      const { path } = plan.out;
      expect(path.points[0]).toEqual(plan.out.approach);
      expect(path.points[path.points.length - 1]).toEqual(plan.spot);
      // The way back is the way out reversed.
      expect(plan.back.path.points[0]).toEqual(plan.spot);
      expect(plan.back.path.points[plan.back.path.points.length - 1]).toEqual(plan.out.approach);
      expect(plan.back.path.length).toBeCloseTo(path.length);
    },
  );

  it.each(seats.map((place, index) => [index, place] as const))(
    "seat %i: the spot is outside the stones, inside the zone, and on a flank of the fire",
    (_i, place) => {
      const plan = planErrand(screen, place.seat, { log: place.spec.log === true });
      // The stones form a ring about 48 wide and 15 deep, and each reaches a little past that.
      const stoneRing = Math.hypot(
        (plan.spot.x - screen.cx) / (59 * screen.u),
        (plan.spot.y - screen.cy) / (22 * screen.u),
      );
      expect(stoneRing).toBeGreaterThan(1.1);
      expect(keepOutRadius(zone, plan.spot)).toBeLessThan(1);
      // Never straight in front of or behind the fire: it can lean toward it from the side.
      expect(Math.abs(plan.spot.x - screen.cx)).toBeGreaterThan(30 * screen.u * 0.7);
      expect(plan.heading).toBe(plan.spot.x < screen.cx ? 1 : -1);
    },
  );

  it.each(seats.map((place, index) => [index, place] as const))(
    "seat %i: stays out of the fire's zone until the last few steps",
    (_i, place) => {
      const plan = planErrand(screen, place.seat, { log: place.spec.log === true });
      const { path } = plan.out;
      // Everything but the final stretch is on open ground.
      const open = path.length - 90 * screen.u;
      for (let d = 0; d <= open; d += 4) {
        expect(keepOutRadius(zone, pointAt(path, d))).toBeGreaterThanOrEqual(0.98);
      }
    },
  );
});
