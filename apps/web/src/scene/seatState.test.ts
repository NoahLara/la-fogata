import { describe, expect, it } from "vitest";
import { createRandom } from "./random";
import {
  ARRIVAL_SECONDS,
  arrivalFrame,
  arrivalTimeline,
  DEPARTURE_SECONDS,
  HOP_SECONDS,
  leaveFrame,
  leaveTimeline,
  STAND_SECONDS,
  needsTurn,
  SETTLE_SECONDS,
  TURN_SECONDS,
  walkEase,
} from "./seatState";

describe("arrivalTimeline", () => {
  it("takes 3 to 4 seconds, a bit different for everyone", () => {
    const totals = new Set<number>();
    for (let seed = 1; seed <= 50; seed++) {
      const { total } = arrivalTimeline(createRandom(seed), {
        log: seed % 2 === 0,
        turn: seed % 3 !== 0,
      });
      expect(total).toBeGreaterThanOrEqual(ARRIVAL_SECONDS.min);
      expect(total).toBeLessThan(ARRIVAL_SECONDS.max);
      totals.add(total);
    }
    expect(totals.size).toBeGreaterThan(40);
  });

  it("adds up: walk, turn and hop make the whole arrival", () => {
    const t = arrivalTimeline(createRandom(9), { log: true, turn: true });
    expect(t.walk + t.turn + t.settle + t.hop).toBeCloseTo(t.total);
    expect(t.turn).toBe(TURN_SECONDS);
    expect(t.hop).toBe(HOP_SECONDS);
  });

  it("only hops onto a log", () => {
    expect(arrivalTimeline(createRandom(1), { log: false, turn: true }).hop).toBe(0);
    expect(arrivalTimeline(createRandom(1), { log: true, turn: true }).hop).toBeGreaterThan(0);
  });

  it("turns or settles, never both", () => {
    const turning = arrivalTimeline(createRandom(1), { log: false, turn: true });
    expect(turning.turn).toBe(TURN_SECONDS);
    expect(turning.settle).toBe(0);
    const settling = arrivalTimeline(createRandom(1), { log: false, turn: false });
    expect(settling.turn).toBe(0);
    expect(settling.settle).toBe(SETTLE_SECONDS);
    expect(settling.walk + settling.settle).toBeCloseTo(settling.total);
  });
});

describe("arrivalFrame", () => {
  const timeline = arrivalTimeline(createRandom(4), { log: true, turn: true });

  it("goes walking, turning, hopping, seated, in that order", () => {
    const phases: string[] = [];
    for (let t = 0; t <= timeline.total + 0.5; t += 0.01) {
      const { phase } = arrivalFrame(timeline, t);
      if (phases[phases.length - 1] !== phase) phases.push(phase);
    }
    expect(phases).toEqual(["walking", "turning", "hopping", "seated"]);
  });

  it("skips the hop on a plain seat", () => {
    const plain = arrivalTimeline(createRandom(4), { log: false, turn: true });
    const phases = new Set<string>();
    for (let t = 0; t <= plain.total + 0.5; t += 0.01) phases.add(arrivalFrame(plain, t).phase);
    expect(phases.has("hopping")).toBe(false);
  });

  it("settles instead of turning when there is no turn to make", () => {
    const settle = arrivalTimeline(createRandom(4), { log: false, turn: false });
    const phases: string[] = [];
    for (let t = 0; t <= settle.total + 0.5; t += 0.01) {
      const { phase } = arrivalFrame(settle, t);
      if (phases[phases.length - 1] !== phase) phases.push(phase);
    }
    expect(phases).toEqual(["walking", "settling", "seated"]);
  });

  it("reports progress through each phase and is seated from the end on", () => {
    expect(arrivalFrame(timeline, 0)).toEqual({ phase: "walking", progress: 0 });
    expect(arrivalFrame(timeline, timeline.walk / 2).progress).toBeCloseTo(0.5);
    expect(arrivalFrame(timeline, timeline.walk + timeline.turn / 2)).toMatchObject({
      phase: "turning",
    });
    expect(arrivalFrame(timeline, timeline.total)).toEqual({ phase: "seated", progress: 1 });
    expect(arrivalFrame(timeline, timeline.total + 100).phase).toBe("seated");
  });

  it("treats negative time as the start", () => {
    expect(arrivalFrame(timeline, -1)).toEqual({ phase: "walking", progress: 0 });
  });
});

describe("walkEase", () => {
  it("runs from 0 to 1 and never goes backwards", () => {
    expect(walkEase(0)).toBe(0);
    expect(walkEase(1)).toBeCloseTo(1);
    let previous = 0;
    for (let p = 0.01; p <= 1; p += 0.01) {
      expect(walkEase(p)).toBeGreaterThanOrEqual(previous);
      previous = walkEase(p);
    }
  });

  it("starts and ends slower than the middle", () => {
    expect(walkEase(0.1)).toBeLessThan(0.1);
    expect(walkEase(0.9)).toBeGreaterThan(0.9);
  });
});

describe("needsTurn", () => {
  it("skips the turn at a side seat when it arrives facing the way the seat does", () => {
    expect(needsTurn("side", 1, 1)).toBe(false);
    expect(needsTurn("side", -1, -1)).toBe(false);
  });

  it("turns at a side seat when it arrives facing the other way", () => {
    expect(needsTurn("side", -1, 1)).toBe(true);
  });

  it("always turns into a front or back view", () => {
    for (const heading of [1, -1] as const) {
      for (const facing of [1, -1] as const) {
        expect(needsTurn("front", heading, facing)).toBe(true);
        expect(needsTurn("back", heading, facing)).toBe(true);
      }
    }
  });
});

describe("leaveTimeline", () => {
  it("takes 2.5 to 3.5 seconds, a bit different for everyone", () => {
    const totals = new Set<number>();
    for (let seed = 1; seed <= 50; seed++) {
      const t = leaveTimeline(createRandom(seed), { log: seed % 2 === 0, turn: seed % 3 !== 0 });
      expect(t.total).toBeGreaterThanOrEqual(DEPARTURE_SECONDS.min);
      expect(t.total).toBeLessThan(DEPARTURE_SECONDS.max);
      expect(t.stand + t.hop + t.turn + t.walk).toBeCloseTo(t.total);
      expect(t.walk).toBeGreaterThan(1.5);
      totals.add(t.total);
    }
    expect(totals.size).toBeGreaterThan(40);
  });

  it("only hops down from a log, and only turns when it needs to", () => {
    const plain = leaveTimeline(createRandom(1), { log: false, turn: false });
    expect(plain.hop).toBe(0);
    expect(plain.turn).toBe(0);
    expect(plain.stand).toBe(STAND_SECONDS);
    const full = leaveTimeline(createRandom(1), { log: true, turn: true });
    expect(full.hop).toBe(HOP_SECONDS);
    expect(full.turn).toBe(TURN_SECONDS);
  });
});

describe("leaveFrame", () => {
  const phasesOf = (timeline: ReturnType<typeof leaveTimeline>) => {
    const phases: string[] = [];
    for (let t = 0; t <= timeline.total + 0.5; t += 0.01) {
      const { phase } = leaveFrame(timeline, t);
      if (phases[phases.length - 1] !== phase) phases.push(phase);
    }
    return phases;
  };

  it("runs the arrival backwards: stand, hop down, turn, walk, gone", () => {
    expect(phasesOf(leaveTimeline(createRandom(4), { log: true, turn: true }))).toEqual([
      "standing",
      "hopping",
      "turning",
      "walking",
      "gone",
    ]);
  });

  it("skips the hop and the turn when there is none", () => {
    expect(phasesOf(leaveTimeline(createRandom(4), { log: false, turn: false }))).toEqual([
      "standing",
      "walking",
      "gone",
    ]);
  });

  it("reports progress through each phase and stays gone", () => {
    const timeline = leaveTimeline(createRandom(4), { log: false, turn: true });
    expect(leaveFrame(timeline, 0)).toEqual({ phase: "standing", progress: 0 });
    expect(leaveFrame(timeline, -2)).toEqual({ phase: "standing", progress: 0 });
    expect(leaveFrame(timeline, timeline.total)).toEqual({ phase: "gone", progress: 1 });
    expect(leaveFrame(timeline, timeline.total + 50).phase).toBe("gone");
    const walking = leaveFrame(timeline, timeline.stand + timeline.turn + timeline.walk / 2);
    expect(walking.phase).toBe("walking");
    expect(walking.progress).toBeCloseTo(0.5);
  });
});
