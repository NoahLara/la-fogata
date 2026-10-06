import { describe, expect, it } from "vitest";
import { MAX_ONE_SHOTS, ONE_SHOT_CEILING, ONE_SHOT_MAX_GAIN } from "./levels";
import { cueFor, playedGain, SOUND_EVENTS, type OneShotCue, type VoiceName } from "./soundEvents";
import { VOICES } from "./voices";

const oneShot = (event: Parameters<typeof cueFor>[0]): OneShotCue => {
  const cue = cueFor(event);
  if (cue.kind !== "one-shot") throw new Error(`${event} is not a one-shot`);
  return cue;
};

describe("the event to sound mapping", () => {
  it("maps each event to the sound the design asks for", () => {
    const voices: Partial<Record<(typeof SOUND_EVENTS)[number], VoiceName>> = {
      wood: "thump",
      burden: "paper",
      petitionRise: "rise",
      starSettle: "bell",
      shootingStar: "shimmer",
      ichthys: "tone",
      arrive: "steps",
      leave: "steps",
    };
    for (const [event, voice] of Object.entries(voices)) {
      expect(oneShot(event as keyof typeof voices).voice).toBe(voice);
    }
  });

  it("makes the word from the fire a swell of the fire, with no new sound", () => {
    expect(cueFor("fireWord")).toEqual({ kind: "swell" });
  });

  it("has a real voice for every one-shot", () => {
    for (const event of SOUND_EVENTS) {
      const cue = cueFor(event);
      if (cue.kind === "one-shot") expect(VOICES[cue.voice]).toBeTypeOf("function");
    }
  });

  it("keeps every one-shot soft: all of them together stay under the ambience", () => {
    for (const event of SOUND_EVENTS) {
      const cue = cueFor(event);
      if (cue.kind !== "one-shot") continue;
      expect(cue.gain).toBeLessThanOrEqual(ONE_SHOT_MAX_GAIN);
      expect(cue.duration).toBeGreaterThan(0);
    }
    expect(MAX_ONE_SHOTS * ONE_SHOT_MAX_GAIN).toBeLessThanOrEqual(ONE_SHOT_CEILING);
  });

  it("never plays a cue louder than the cap, whatever its table says", () => {
    expect(playedGain({ ...oneShot("wood"), gain: 5 })).toBe(ONE_SHOT_MAX_GAIN);
    expect(playedGain({ ...oneShot("wood"), gain: -1 })).toBe(0);
  });
});
