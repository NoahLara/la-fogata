import { ONE_SHOT_MAX_GAIN } from "./levels";

/** Everything in the scene that has a sound. None of them carries anything a person wrote. */
export type SoundEvent =
  | "wood"
  | "burden"
  | "petitionRise"
  | "starSettle"
  | "shootingStar"
  | "ichthys"
  | "arrive"
  | "leave"
  | "fireWord";

export type VoiceName = "thump" | "paper" | "rise" | "bell" | "shimmer" | "tone" | "steps";

/** A short sound with its own voice. */
export interface OneShotCue {
  kind: "one-shot";
  voice: VoiceName;
  /** How loud, from 0 to `ONE_SHOT_MAX_GAIN`. */
  gain: number;
  /** When there is no room, the lower one gives way. */
  priority: number;
  /** How long it lasts, in seconds. */
  duration: number;
  /** The same voice is not played again within this many seconds. */
  minGap: number;
}

/** No new sound: the fire's crackle swells for a moment. */
export interface SwellCue {
  kind: "swell";
}

export type Cue = OneShotCue | SwellCue;

const CUES: Record<SoundEvent, Cue> = {
  wood: { kind: "one-shot", voice: "thump", gain: 0.045, priority: 3, duration: 0.9, minGap: 0.4 },
  burden: { kind: "one-shot", voice: "paper", gain: 0.035, priority: 2, duration: 1.9, minGap: 2 },
  petitionRise: {
    kind: "one-shot",
    voice: "rise",
    gain: 0.03,
    priority: 2,
    duration: 2.2,
    minGap: 2,
  },
  starSettle: {
    kind: "one-shot",
    voice: "bell",
    gain: 0.03,
    priority: 2,
    duration: 1.8,
    minGap: 1,
  },
  shootingStar: {
    kind: "one-shot",
    voice: "shimmer",
    gain: 0.025,
    priority: 1,
    duration: 2.4,
    minGap: 3,
  },
  ichthys: { kind: "one-shot", voice: "tone", gain: 0.04, priority: 3, duration: 1.5, minGap: 0.6 },
  arrive: { kind: "one-shot", voice: "steps", gain: 0.02, priority: 0, duration: 1.6, minGap: 3 },
  leave: { kind: "one-shot", voice: "steps", gain: 0.02, priority: 0, duration: 1.6, minGap: 3 },
  fireWord: { kind: "swell" },
};

/** What to play for an event. */
export function cueFor(event: SoundEvent): Cue {
  return CUES[event];
}

/** The gain a cue is actually played at: never above the cap, whatever the table says. */
export function playedGain(cue: OneShotCue): number {
  return Math.min(Math.max(cue.gain, 0), ONE_SHOT_MAX_GAIN);
}

export const SOUND_EVENTS = Object.keys(CUES) as SoundEvent[];
