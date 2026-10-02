import type { View } from "./characters";
import type { Species } from "./characters/species";
import { between, clamp, smoothstep } from "./math";
import { partsFor, type PartKind, type PartSpec } from "./parts";
import { createRandom, type Random } from "./random";

/** A seated character breathes slowly, each at its own pace. Amplitude is the share of its height. */
export interface Breath {
  period: number;
  phase: number;
  amplitude: number;
}

export const BREATH = {
  period: { min: 3.6, max: 5.6 },
  amplitude: { min: 0.01, max: 0.02 },
  /** With reduced motion: a barely visible, slower breath. */
  reducedAmplitude: 0.003,
  reducedSlowdown: 1.5,
} as const;

export function createBreath(rand: Random): Breath {
  return {
    period: between(rand, BREATH.period.min, BREATH.period.max),
    phase: between(rand, 0, Math.PI * 2),
    amplitude: between(rand, BREATH.amplitude.min, BREATH.amplitude.max),
  };
}

/** How far the chest is out at `time`, as a signed share of height: scale the body by one plus this. */
export function breathAt(breath: Breath, time: number, reduced: boolean): number {
  const period = reduced ? breath.period * BREATH.reducedSlowdown : breath.period;
  const amplitude = reduced
    ? Math.min(breath.amplitude, BREATH.reducedAmplitude)
    : breath.amplitude;
  return amplitude * Math.sin((time / period) * Math.PI * 2 + breath.phase);
}

export type GestureName =
  "earFlick" | "earTwitch" | "earTilt" | "tailTipFlick" | "tailSway" | "headTurn" | "headTilt";

interface GestureSpec {
  /** Which kind of part it moves. */
  kind: PartKind;
  /** Seconds it lasts, picked between these. */
  duration: { min: number; max: number };
  /** How often it is chosen among an animal's gestures. */
  weight: number;
  /** How much of the part's full amplitude it uses. */
  strength: number;
  /** Whether it may go either way. Flicks and twitches only go the way the part is built to move. */
  bothWays: boolean;
  /** The movement over its time, from 0 to 1, as a share of the part's amplitude. Starts and ends at 0. */
  envelope(u: number): number;
}

/** Two quick flicks the same way, the second a little smaller. */
export function earFlickEnvelope(u: number): number {
  return 0.5 * (1 - Math.cos(4 * Math.PI * u)) * (1 - 0.4 * u);
}

/** Three small quick twitches, fading. */
export function earTwitchEnvelope(u: number): number {
  return 0.5 * (1 - Math.cos(6 * Math.PI * u)) * (1 - 0.5 * u);
}

/** Slowly one way, then the other, and back to rest. */
export function tailSwayEnvelope(u: number): number {
  return Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u);
}

/** A quick flick out, back past rest, and out again, settling. */
export function tailTipFlickEnvelope(u: number): number {
  return Math.sin(3 * Math.PI * u) * Math.sin(Math.PI * u);
}

/** Eases out to a position, stays there a moment, and eases back. */
export function holdEnvelope(u: number): number {
  return smoothstep(0, 0.3, u) * (1 - smoothstep(0.65, 1, u));
}

/** Out and back in one smooth movement. */
export function bumpEnvelope(u: number): number {
  const s = Math.sin(Math.PI * u);
  return s * s;
}

export const GESTURES: Record<GestureName, GestureSpec> = {
  earFlick: {
    kind: "ear",
    duration: { min: 0.35, max: 0.5 },
    weight: 1,
    strength: 1,
    bothWays: false,
    envelope: earFlickEnvelope,
  },
  earTwitch: {
    kind: "ear",
    duration: { min: 0.3, max: 0.45 },
    weight: 2,
    strength: 0.4,
    bothWays: false,
    envelope: earTwitchEnvelope,
  },
  earTilt: {
    kind: "ear",
    duration: { min: 1.6, max: 2.4 },
    weight: 1,
    strength: 1,
    bothWays: true,
    envelope: holdEnvelope,
  },
  tailTipFlick: {
    kind: "tailTip",
    duration: { min: 0.5, max: 0.8 },
    weight: 3,
    strength: 1,
    bothWays: true,
    envelope: tailTipFlickEnvelope,
  },
  tailSway: {
    kind: "tail",
    duration: { min: 2.6, max: 3.4 },
    weight: 1,
    strength: 1,
    bothWays: true,
    envelope: tailSwayEnvelope,
  },
  headTurn: {
    kind: "head",
    duration: { min: 2.4, max: 3.4 },
    weight: 2,
    strength: 0.55,
    bothWays: true,
    envelope: holdEnvelope,
  },
  headTilt: {
    kind: "head",
    duration: { min: 2, max: 3 },
    weight: 1,
    strength: 1,
    bothWays: true,
    envelope: bumpEnvelope,
  },
};

/** What each animal does now and then. Which of these it can do in a given seat depends on the parts that show there. */
const REPERTOIRE: Record<Species, readonly GestureName[]> = {
  panda: ["earFlick"],
  bear: ["earFlick"],
  capybara: ["earFlick"],
  rabbit: ["earTwitch", "earTilt"],
  cat: ["tailTipFlick", "tailSway"],
  fox: ["tailSway"],
  owl: ["headTurn", "headTilt"],
};

/** Gestures come this long after the last one ended (or after sitting down), picked between these. */
export const GESTURE_GAP = { min: 4, max: 12 } as const;
/** No two characters start a gesture closer together than this. */
export const MIN_START_SPACING = 1.5;
/** After sitting down, how long movement takes to fade in. */
const FADE_IN = 1;

/** Keeps characters from gesturing at the same time. */
export interface GestureDirector {
  /** The first time at or after `wanted` when a gesture may start, and takes it. */
  claim(wanted: number): number;
}

export function createDirector(spacing = MIN_START_SPACING): GestureDirector {
  const starts: number[] = [];
  return {
    claim(wanted) {
      let time = wanted;
      for (let moved = true; moved;) {
        moved = false;
        for (const start of starts) {
          // A hair of slack: `start + spacing - start` can come out a little under `spacing`, which would never settle.
          if (Math.abs(start - time) < spacing - 1e-9) {
            time = start + spacing;
            moved = true;
          }
        }
      }
      starts.push(time);
      // Only the recent ones can matter.
      if (starts.length > 64) starts.shift();
      return time;
    },
  };
}

export interface Gesture {
  name: GestureName;
  /** Index into the parts it moves. */
  part: number;
  start: number;
  end: number;
  /** 1 or -1: which way it goes first. */
  direction: 1 | -1;
}

/** What to do with an animal's parts, in the order of `partsFor`. */
export interface IdlePose {
  /** Share of height to add to the body's height. See `breathAt`. */
  breath: number;
  /** Radians at the tip for each part. */
  angles: number[];
}

export interface Idle {
  parts: readonly PartSpec[];
  /**
   * Call every frame with the scene time. `seated` is true only once the character has sat down; nothing moves
   * before that. With `reduced` there are no gestures and the breath is barely there.
   */
  update(time: number, seated: boolean, reduced: boolean): IdlePose;
}

/** Picks what to do next from what an animal can do with the parts it shows. */
export function chooseGesture(
  species: Species,
  view: View,
  rand: Random,
  now: number,
): Gesture | undefined {
  const parts = partsFor(species, view);
  const options = REPERTOIRE[species].flatMap((name) => {
    const candidates = parts.flatMap((part, index) =>
      part.kind === GESTURES[name].kind ? [index] : [],
    );
    return candidates.length ? [{ name, candidates }] : [];
  });
  if (options.length === 0) return undefined;
  let roll = rand() * options.reduce((sum, option) => sum + GESTURES[option.name].weight, 0);
  const chosen = options.find((option) => (roll -= GESTURES[option.name].weight) < 0) ?? options[0];
  if (!chosen) return undefined;
  const spec = GESTURES[chosen.name];
  const duration = between(rand, spec.duration.min, spec.duration.max);
  const part = chosen.candidates[Math.floor(rand() * chosen.candidates.length)] ?? 0;
  return {
    name: chosen.name,
    part,
    start: now,
    end: now + duration,
    direction: spec.bothWays && rand() < 0.5 ? -1 : 1,
  };
}

export interface IdleOptions {
  species: Species;
  view: View;
  /** Makes this character different from the others. */
  seed: number;
  director: GestureDirector;
}

export function createIdle({ species, view, seed, director }: IdleOptions): Idle {
  const rand = createRandom(seed);
  const parts = partsFor(species, view);
  const breath = createBreath(rand);
  const canGesture = chooseGesture(species, view, createRandom(seed), 0) !== undefined;

  let seatedSince: number | undefined;
  let nextStart: number | undefined;
  let current: Gesture | undefined;

  const scheduleFrom = (time: number) => {
    nextStart = director.claim(time + between(rand, GESTURE_GAP.min, GESTURE_GAP.max));
  };

  return {
    parts,
    update(time, seated, reduced) {
      const angles = parts.map(() => 0);
      if (!seated) {
        seatedSince = undefined;
        nextStart = undefined;
        current = undefined;
        return { breath: 0, angles };
      }
      seatedSince ??= time;
      const fade = smoothstep(0, FADE_IN, time - seatedSince);
      const pose = { breath: breathAt(breath, time, reduced) * fade, angles };
      if (reduced || !canGesture) {
        current = undefined;
        nextStart = undefined;
        return pose;
      }

      if (nextStart === undefined && !current) scheduleFrom(time);
      if (current && time >= current.end) {
        scheduleFrom(current.end);
        current = undefined;
      }
      if (!current && nextStart !== undefined && time >= nextStart) {
        current = chooseGesture(species, view, rand, time);
        nextStart = undefined;
        if (!current) scheduleFrom(time);
      }
      if (current) {
        const spec = GESTURES[current.name];
        const u = clamp((time - current.start) / (current.end - current.start), 0, 1);
        const part = parts[current.part];
        if (part)
          angles[current.part] =
            part.amplitude * spec.strength * current.direction * spec.envelope(u) * fade;
      }
      return pose;
    },
  };
}
