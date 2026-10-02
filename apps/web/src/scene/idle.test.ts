import { describe, expect, it } from "vitest";
import {
  BREATH,
  breathAt,
  chooseGesture,
  createBreath,
  createDirector,
  createIdle,
  bumpEnvelope,
  earFlickEnvelope,
  earTwitchEnvelope,
  holdEnvelope,
  tailTipFlickEnvelope,
  GESTURE_GAP,
  GESTURES,
  MIN_START_SPACING,
  tailSwayEnvelope,
} from "./idle";
import { SPECIES } from "./characters/species";
import { createRandom } from "./random";

describe("breath", () => {
  it("is different for every character and within the allowed range", () => {
    const periods = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const breath = createBreath(createRandom(seed));
      expect(breath.period).toBeGreaterThanOrEqual(BREATH.period.min);
      expect(breath.period).toBeLessThan(BREATH.period.max);
      expect(breath.amplitude).toBeGreaterThanOrEqual(BREATH.amplitude.min);
      expect(breath.amplitude).toBeLessThan(BREATH.amplitude.max);
      periods.add(breath.period);
    }
    expect(periods.size).toBe(40);
  });

  it("never swells by more than 2% of the height", () => {
    const breath = createBreath(createRandom(3));
    for (let t = 0; t < 30; t += 0.05)
      expect(Math.abs(breathAt(breath, t, false))).toBeLessThanOrEqual(0.02);
  });

  it("is barely there with reduced motion", () => {
    const breath = createBreath(createRandom(3));
    for (let t = 0; t < 30; t += 0.05)
      expect(Math.abs(breathAt(breath, t, true))).toBeLessThanOrEqual(0.003);
  });
});

describe("envelopes", () => {
  it("start and end at rest and never go past the part's amplitude", () => {
    for (const envelope of [
      earFlickEnvelope,
      earTwitchEnvelope,
      tailSwayEnvelope,
      tailTipFlickEnvelope,
      holdEnvelope,
      bumpEnvelope,
    ]) {
      expect(Math.abs(envelope(0))).toBeLessThan(1e-12);
      expect(Math.abs(envelope(1))).toBeLessThan(1e-12);
      for (let u = 0; u <= 1; u += 0.01) expect(Math.abs(envelope(u))).toBeLessThanOrEqual(1);
    }
  });

  it("flicks an ear twice, the same way each time", () => {
    const values = Array.from({ length: 101 }, (_, i) => earFlickEnvelope(i / 100));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    const peaks = values.filter(
      (v, i) => i > 0 && i < 100 && v > (values[i - 1] ?? 0) && v >= (values[i + 1] ?? 0),
    );
    expect(peaks).toHaveLength(2);
    expect(peaks[1]!).toBeLessThan(peaks[0]!);
  });

  it("twitches an ear three times, the same way each time", () => {
    const values = Array.from({ length: 201 }, (_, i) => earTwitchEnvelope(i / 200));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    const peaks = values.filter(
      (v, i) => i > 0 && i < 200 && v > (values[i - 1] ?? 0) && v >= (values[i + 1] ?? 0),
    );
    expect(peaks).toHaveLength(3);
  });

  it("holds a head position for a while before coming back", () => {
    expect(holdEnvelope(0.5)).toBe(1);
    expect(holdEnvelope(0.4)).toBe(1);
    expect(holdEnvelope(0.05)).toBeLessThan(0.2);
    expect(holdEnvelope(0.95)).toBeLessThan(0.1);
  });

  it("flicks a tail tip out, back past rest and out again", () => {
    expect(tailTipFlickEnvelope(1 / 6)).toBeGreaterThan(0.4);
    expect(tailTipFlickEnvelope(0.5)).toBeLessThan(-0.9);
    expect(tailTipFlickEnvelope(5 / 6)).toBeGreaterThan(0.4);
  });

  it("sways the tail one way and then the other", () => {
    expect(tailSwayEnvelope(0.25)).toBeGreaterThan(0.4);
    expect(tailSwayEnvelope(0.75)).toBeLessThan(-0.4);
  });
});

describe("chooseGesture", () => {
  it("makes a panda flick one of the ears it shows", () => {
    const front = chooseGesture("panda", "front", createRandom(1), 10)!;
    expect(front.name).toBe("earFlick");
    expect([0, 1]).toContain(front.part);
    expect(chooseGesture("panda", "side", createRandom(1), 10)!.part).toBe(0);
  });

  it("makes every animal gesture in every view it can be seated in", () => {
    for (const species of SPECIES) {
      for (const view of ["front", "back", "side"] as const) {
        expect(
          chooseGesture(species, view, createRandom(1), 0),
          `${species} ${view}`,
        ).toBeDefined();
      }
    }
  });

  it("makes a bear and a capybara flick an ear", () => {
    expect(chooseGesture("bear", "front", createRandom(1), 0)!.name).toBe("earFlick");
    expect(chooseGesture("capybara", "side", createRandom(1), 0)!.name).toBe("earFlick");
  });

  it("makes a rabbit twitch or tilt one long ear, either of the two it shows in profile", () => {
    const names = new Set<string>();
    const sideEars = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      names.add(chooseGesture("rabbit", "front", createRandom(seed), 0)!.name);
      sideEars.add(chooseGesture("rabbit", "side", createRandom(seed), 0)!.part);
    }
    expect([...names].sort()).toEqual(["earTilt", "earTwitch"]);
    expect([...sideEars].sort()).toEqual([0, 1]);
  });

  it("makes a cat flick its tail tip often and sway the whole tail now and then", () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 400; seed++) {
      const name = chooseGesture("cat", "side", createRandom(seed), 0)!.name;
      counts[name] = (counts[name] ?? 0) + 1;
    }
    expect(counts.tailTipFlick).toBeGreaterThan(counts.tailSway! * 2);
    expect(counts.tailSway).toBeGreaterThan(40);
  });

  it("only flicks a cat's tail tip where the tail lies across its feet", () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(chooseGesture("cat", "front", createRandom(seed), 0)!.name).toBe("tailTipFlick");
    }
  });

  it("makes an owl turn or tilt its head", () => {
    const names = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      names.add(chooseGesture("owl", "front", createRandom(seed), 0)!.name);
    }
    expect([...names].sort()).toEqual(["headTilt", "headTurn"]);
  });

  it("flicks and twitches ears only the way they are built to move, and lets tilts and sways go either way", () => {
    const direction = (species: "panda" | "rabbit" | "fox", name: string) => {
      const seen = new Set<number>();
      for (let seed = 1; seed <= 80; seed++) {
        const gesture = chooseGesture(species, "front", createRandom(seed), 0)!;
        if (gesture.name === name) seen.add(gesture.direction);
      }
      return [...seen].sort();
    };
    expect(direction("panda", "earFlick")).toEqual([1]);
    expect(direction("rabbit", "earTwitch")).toEqual([1]);
    expect(direction("rabbit", "earTilt")).toEqual([-1, 1]);
    expect(direction("fox", "tailSway")).toEqual([-1, 1]);
  });

  it("makes a fox sway its tail in every view", () => {
    for (const view of ["front", "back", "side"] as const) {
      expect(chooseGesture("fox", view, createRandom(2), 0)!.name).toBe("tailSway");
    }
  });

  it("lasts as long as its kind of gesture does, starting when asked", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const gesture = chooseGesture("fox", "side", createRandom(seed), 5)!;
      const { min, max } = GESTURES.tailSway.duration;
      expect(gesture.start).toBe(5);
      expect(gesture.end - gesture.start).toBeGreaterThanOrEqual(min);
      expect(gesture.end - gesture.start).toBeLessThan(max);
    }
  });
});

describe("gesture strength", () => {
  it("never turns a part further than its amplitude, and a head turn less than a head tilt", () => {
    const peak = (seed: number, species: "owl" | "panda") => {
      const idle = createIdle({ species, view: "front", seed, director: createDirector() });
      const part = idle.parts[0]!;
      let most = 0;
      for (let t = 0; t < 400; t += 1 / 30) {
        for (const angle of idle.update(t, true, false).angles)
          most = Math.max(most, Math.abs(angle));
      }
      return { most, amplitude: Math.abs(part.amplitude) };
    };
    for (let seed = 1; seed <= 5; seed++) {
      for (const species of ["owl", "panda"] as const) {
        const { most, amplitude } = peak(seed, species);
        expect(most).toBeLessThanOrEqual(amplitude + 1e-9);
        expect(most).toBeGreaterThan(0.4 * amplitude);
      }
    }
  });
});

describe("createDirector", () => {
  it("leaves times alone when they are apart", () => {
    const director = createDirector(1.5);
    expect(director.claim(10)).toBe(10);
    expect(director.claim(12)).toBe(12);
  });

  it("moves a start later when it would be too close to another", () => {
    const director = createDirector(1.5);
    director.claim(10);
    expect(director.claim(10.4)).toBeCloseTo(11.5);
    expect(director.claim(10.2)).toBeCloseTo(13);
  });

  it("settles even when times are not round numbers", () => {
    const director = createDirector(1.5);
    const rand = createRandom(99);
    const starts: number[] = [];
    for (let i = 0; i < 500; i++) starts.push(director.claim(0.1 + rand() * 0.3 + i * 0.01));
    expect(starts).toHaveLength(500);
    expect(director.claim(1 / 3)).toBeGreaterThanOrEqual(1 / 3);
  });

  it("keeps every pair of starts apart however they are asked for", () => {
    const director = createDirector(1.5);
    const rand = createRandom(7);
    const starts = Array.from({ length: 40 }, () => director.claim(rand() * 20));
    for (let i = 0; i < starts.length; i++) {
      for (let j = i + 1; j < starts.length; j++) {
        expect(Math.abs(starts[i]! - starts[j]!)).toBeGreaterThanOrEqual(1.5 - 1e-9);
      }
    }
  });
});

/** Runs a character's idle for `seconds`, 30 times a second, and lists the gestures it makes. */
function run(
  seed: number,
  species: "panda" | "fox" | "owl",
  seconds: number,
  director = createDirector(),
) {
  const idle = createIdle({ species, view: "front", seed, director });
  const bursts: { start: number; end: number }[] = [];
  let open: { start: number; end: number } | undefined;
  for (let t = 0; t <= seconds; t += 1 / 30) {
    const moving = idle.update(t, true, false).angles.some((a) => a !== 0);
    if (moving && !open) {
      open = { start: t, end: t };
      bursts.push(open);
    }
    if (moving && open) open.end = t;
    if (!moving) open = undefined;
  }
  // A gesture passes through rest in the middle (a sway, a flick and its return), which is not the end of it.
  return bursts.reduce<{ start: number; end: number }[]>((merged, burst) => {
    const last = merged[merged.length - 1];
    if (last && burst.start - last.end < 0.5) last.end = burst.end;
    else merged.push(burst);
    return merged;
  }, []);
}

describe("createIdle", () => {
  it("makes gestures every 4 to 12 seconds, one at a time", () => {
    const bursts = run(11, "panda", 600);
    expect(bursts.length).toBeGreaterThan(40);
    for (let i = 1; i < bursts.length; i++) {
      const gap = bursts[i]!.start - bursts[i - 1]!.end;
      expect(gap).toBeGreaterThanOrEqual(GESTURE_GAP.min - 0.2);
      expect(gap).toBeLessThanOrEqual(GESTURE_GAP.max + 0.2);
    }
  });

  it("waits 4 to 12 seconds before the first one", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const [first] = run(seed, "panda", 40);
      expect(first!.start).toBeGreaterThanOrEqual(GESTURE_GAP.min);
      expect(first!.start).toBeLessThanOrEqual(GESTURE_GAP.max + 0.5);
    }
  });

  it("is the same for the same seed and different for another", () => {
    expect(run(5, "fox", 100)).toEqual(run(5, "fox", 100));
    expect(run(5, "fox", 100)).not.toEqual(run(6, "fox", 100));
  });

  it("never has two characters start together when they share a director", () => {
    // Stepped together in time, as the scene does, so the director sees the starts in order.
    const director = createDirector();
    const species = ["panda", "fox", "owl", "panda", "fox", "owl", "panda"] as const;
    const idles = species.map((name, i) =>
      createIdle({ species: name, view: "front", seed: i + 1, director }),
    );
    const wasMoving = idles.map(() => false);
    const lastEnd = idles.map(() => -Infinity);
    const starts: number[] = [];
    for (let t = 0; t <= 300; t += 1 / 30) {
      idles.forEach((idle, i) => {
        const moving = idle.update(t, true, false).angles.some((a) => Math.abs(a) > 1e-9);
        // Passing through rest in the middle of a gesture is not a new start.
        if (moving && !wasMoving[i] && t - lastEnd[i]! > 0.5) starts.push(t);
        if (moving) lastEnd[i] = t;
        wasMoving[i] = moving;
      });
    }
    expect(starts.length).toBeGreaterThan(30);
    starts.sort((a, b) => a - b);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]! - starts[i - 1]!).toBeGreaterThanOrEqual(MIN_START_SPACING - 1 / 30 - 1e-9);
    }
  });

  it("does nothing until the character has sat down, and starts its waiting then", () => {
    const idle = createIdle({
      species: "panda",
      view: "front",
      seed: 3,
      director: createDirector(),
    });
    for (let t = 0; t < 60; t += 0.1) {
      const pose = idle.update(t, false, false);
      expect(pose.breath).toBe(0);
      expect(pose.angles.every((a) => a === 0)).toBe(true);
    }
    expect(idle.update(60, true, false).angles.every((a) => a === 0)).toBe(true);
    let first: number | undefined;
    for (let t = 60; t < 100 && first === undefined; t += 0.05) {
      if (idle.update(t, true, false).angles.some((a) => a !== 0)) first = t;
    }
    expect(first! - 60).toBeGreaterThanOrEqual(GESTURE_GAP.min);
  });

  it("stops at once when the character gets up", () => {
    const idle = createIdle({ species: "fox", view: "back", seed: 4, director: createDirector() });
    let t = 0;
    while (!idle.update(t, true, false).angles.some((a) => a !== 0)) t += 0.05;
    const pose = idle.update(t + 0.01, false, false);
    expect(pose.angles.every((a) => a === 0)).toBe(true);
    expect(pose.breath).toBe(0);
  });

  it("makes no gestures with reduced motion, and only a faint breath", () => {
    const idle = createIdle({
      species: "panda",
      view: "front",
      seed: 9,
      director: createDirector(),
    });
    for (let t = 0; t < 300; t += 0.05) {
      const pose = idle.update(t, true, true);
      expect(pose.angles.every((a) => a === 0)).toBe(true);
      expect(Math.abs(pose.breath)).toBeLessThanOrEqual(0.003);
    }
  });

  it("eases in over the first second after sitting", () => {
    const idle = createIdle({ species: "owl", view: "front", seed: 2, director: createDirector() });
    expect(idle.update(5, true, false).breath).toBe(0);
    const pose = (t: number) => Math.abs(idle.update(t, true, false).breath);
    expect(pose(5.1)).toBeLessThan(0.0021);
  });
});
