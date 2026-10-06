import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSoundEngine } from "./engine";
import { FakeAudio, FakeContext } from "./fakeAudio";
import { MUSIC_LEVEL } from "./levels";
import { MUSIC_DEFAULT, trimMultiplier } from "./volumeTrim";
import { FADE_IN_SECONDS, FADE_OUT_SECONDS, MASTER_LEVEL } from "./levels";

function setup() {
  const contexts: FakeContext[] = [];
  const createContext = vi.fn(() => {
    const ctx = new FakeContext();
    contexts.push(ctx);
    return ctx as unknown as AudioContext;
  });
  const audios: FakeAudio[] = [];
  const createAudio = (url: string) => {
    const audio = new FakeAudio(url);
    audios.push(audio);
    return audio as unknown as HTMLAudioElement;
  };
  const engine = createSoundEngine({ createContext, createAudio, random: () => 0.5 });
  return { engine, createContext, contexts, audios };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("the sound engine", () => {
  it("creates no AudioContext before a user gesture, whatever else happens", () => {
    const { engine, createContext } = setup();
    engine.setEnabled(true);
    engine.setPeople(4);
    engine.play("wood");
    engine.suspend();
    engine.resume();
    expect(createContext).not.toHaveBeenCalled();
    expect(engine.started).toBe(false);
  });

  it("starts on the first gesture, with one context and a gentle fade-in from silence", () => {
    const { engine, createContext, contexts } = setup();
    engine.setEnabled(true);
    engine.start();
    engine.start();
    expect(createContext).toHaveBeenCalledTimes(1);
    const master = contexts[0]!.nodes[0]!;
    expect(master.gain.calls).toContainEqual(["ramp", MASTER_LEVEL, FADE_IN_SECONDS]);
    expect(MASTER_LEVEL).toBeLessThan(1);
    engine.destroy();
  });

  it("plays nothing at all, not even a fade, when sound is off at the first gesture", () => {
    const { engine, createContext } = setup();
    engine.setEnabled(true);
    engine.setEnabled(false);
    engine.start();
    expect(createContext).not.toHaveBeenCalled();
    engine.play("wood");
    expect(engine.started).toBe(false);
  });

  it("fades out over half a second when turned off, then suspends", () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    engine.start();
    const ctx = contexts[0]!;
    engine.setEnabled(false);
    expect(ctx.nodes[0]!.gain.calls).toContainEqual(["ramp", 0, FADE_OUT_SECONDS]);
    expect(ctx.suspend).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FADE_OUT_SECONDS * 1000 + 100);
    expect(ctx.suspend).toHaveBeenCalled();
    engine.destroy();
  });

  it("brings the sound back, with the same fade-in, when turned on again", () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    engine.start();
    engine.setEnabled(false);
    vi.advanceTimersByTime(1000);
    engine.setEnabled(true);
    engine.start();
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.resume).toHaveBeenCalled();
    engine.destroy();
  });

  it("suspends while the tab is hidden and resumes when it is back", () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    engine.start();
    const ctx = contexts[0]!;
    engine.suspend();
    expect(ctx.suspend).toHaveBeenCalled();
    ctx.resume.mockClear();
    engine.resume();
    expect(ctx.resume).toHaveBeenCalled();
    engine.destroy();
  });

  it("does not wake a muted engine when the tab comes back", () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    engine.start();
    engine.setEnabled(false);
    contexts[0]!.resume.mockClear();
    engine.resume();
    expect(contexts[0]!.resume).not.toHaveBeenCalled();
    engine.destroy();
  });

  it("caps the one-shots that sound together", () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    engine.start();
    const ctx = contexts[0]!;
    const before = ctx.nodes.length;
    // Five different voices in the same instant: only the cap's worth start.
    for (const event of ["wood", "ichthys", "starSettle", "burden", "petitionRise"] as const) {
      engine.play(event);
    }
    const gains = ctx.nodes
      .slice(before)
      .filter((node) => node.gain.value > 0 && node.gain.calls.length === 0);
    // One output gain per admitted one-shot: each has its level set directly.
    expect(gains.length).toBeLessThanOrEqual(3);
    engine.destroy();
  });

  it("ducks the ambience while a one-shot plays", () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    engine.start();
    const duck = contexts[0]!.nodes[1]!;
    engine.play("wood");
    const targets = duck.gain.calls.filter(([kind]) => kind === "target").map((call) => call[1]);
    expect(targets[0]).toBeLessThan(1);
    expect(targets.at(-1)).toBe(1);
    engine.destroy();
  });

  it("never touches the audio session type, so the silent switch is respected", () => {
    const touched: string[] = [];
    const audioSession = new Proxy(
      {},
      {
        get: (_target, key) => void touched.push(String(key)),
        set: (_target, key) => {
          touched.push(String(key));
          return true;
        },
      },
    );
    vi.stubGlobal("navigator", { audioSession });
    const { engine } = setup();
    engine.setEnabled(true);
    engine.start();
    engine.play("wood");
    engine.suspend();
    engine.resume();
    engine.destroy();
    vi.unstubAllGlobals();
    expect(touched).toEqual([]);
  });

  it("plays no music before a gesture, then streams it quietly and looping with a slow fade-in", () => {
    const { engine, audios, contexts } = setup();
    engine.setEnabled(true);
    expect(audios).toHaveLength(0);
    engine.start();
    expect(audios).toHaveLength(1);
    expect(audios[0]!.loop).toBe(true);
    expect(audios[0]!.playing).toBe(true);
    // Its gain is a node of its own, ramped up slowly to a level well under the fire's.
    const ramps = contexts[0]!.nodes
      .flatMap((node) => node.gain.calls)
      .filter(
        ([kind, value]) => kind === "ramp" && value === MUSIC_LEVEL * trimMultiplier(MUSIC_DEFAULT),
      );
    expect(ramps).toHaveLength(1);
    expect(ramps[0]![2]).toBeGreaterThan(3);
    engine.destroy();
  });

  it("pauses the music when sound is turned off or the tab is hidden, and carries on after", () => {
    const { engine, audios } = setup();
    engine.setEnabled(true);
    engine.start();
    engine.suspend();
    expect(audios[0]!.playing).toBe(false);
    engine.resume();
    expect(audios[0]!.playing).toBe(true);
    engine.setEnabled(false);
    vi.advanceTimersByTime(1000);
    expect(audios[0]!.playing).toBe(false);
    engine.destroy();
  });

  it("starts no music at all when sound is off at the first gesture", () => {
    const { engine, audios } = setup();
    engine.start();
    expect(audios).toHaveLength(0);
  });

  it("keeps the music's own volume, whatever the crackle is", () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    engine.setMusic(0);
    engine.start();
    engine.setCrackle(100);
    // Music at the bottom of its slider ramps to silence, not to its normal level.
    const ramps = contexts[0]!.nodes
      .flatMap((node) => node.gain.calls)
      .filter(([kind, value]) => kind === "ramp" && value === 0);
    expect(ramps.length).toBeGreaterThan(0);
    engine.destroy();
  });

  it("tells whether the browser let it run: false while held back, true once it is let go", async () => {
    FakeContext.blocked = true;
    const { engine } = setup();
    engine.setEnabled(true);
    expect(await engine.start()).toBe(false);
    expect(engine.running).toBe(false);
    FakeContext.blocked = false;
    expect(await engine.start()).toBe(true);
    expect(engine.running).toBe(true);
    FakeContext.blocked = false;
    engine.destroy();
  });

  it("does not start the music's fade-in over again on every try", async () => {
    const { engine, contexts } = setup();
    engine.setEnabled(true);
    await engine.start();
    await engine.start();
    await engine.start();
    const ramps = contexts[0]!.nodes
      .flatMap((node) => node.gain.calls)
      .filter(
        ([kind, value]) => kind === "ramp" && value === MUSIC_LEVEL * trimMultiplier(MUSIC_DEFAULT),
      );
    expect(ramps).toHaveLength(1);
    engine.destroy();
  });
});
