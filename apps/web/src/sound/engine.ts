import { startAmbience, type Ambience } from "./ambience";
import { clampTrim, CRACKLE_DEFAULT, MUSIC_DEFAULT, trimMultiplier } from "./volumeTrim";
import { fireVolume } from "./fireVolume";
import { DUCK_LEVEL, FADE_IN_SECONDS, FADE_OUT_SECONDS, MASTER_LEVEL } from "./levels";
import { createLimiter } from "./limiter";
import { createMusic, type Music } from "./music";
import { createNoiseBuffer } from "./noise";
import { cueFor, playedGain, type SoundEvent } from "./soundEvents";
import { VOICES } from "./voices";

/** Recordings live in `public/sounds`. Each one is optional: the synthesized sound stands in until it loads. */
const FIRE_RECORDING = "/sounds/fire-crackle.mp3";

async function loadFromNetwork(ctx: AudioContext, url: string): Promise<AudioBuffer | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return await ctx.decodeAudioData(await response.arrayBuffer());
  } catch {
    return undefined;
  }
}

function defaultAudio(url: string): HTMLAudioElement | undefined {
  return typeof Audio === "undefined" ? undefined : new Audio(url);
}

export interface SoundEngine {
  /**
   * Starts the sound (while it is on): creates the AudioContext the first time, and fades the sound in. Call it as
   * soon as the page loads, to hear it at once where the browser allows, and again from every user gesture until it
   * is running: browsers hold sound back until the visitor has touched the page. Nothing exists while sound is off.
   * Resolves to whether the sound is running now.
   */
  start(): Promise<boolean>;
  /** The AudioContext exists and is running (the browser let it start). */
  readonly running: boolean;
  /** Sound on or off. Off fades out over half a second; on is a gesture of the visitor, so `start()` follows. */
  setEnabled(enabled: boolean): void;
  /** The visitor's own volume for the fire crackle, from the settings (0 to 100; 50 is normal). */
  setCrackle(level: number): void;
  /** The visitor's own volume for the background music, from the settings (0 to 100; 50 is normal). */
  setMusic(level: number): void;
  /** Everyone around the fire, the visitor included: the crackle follows. */
  setPeople(count: number): void;
  play(event: SoundEvent): void;
  /** The tab is hidden: nothing keeps running. */
  suspend(): void;
  resume(): void;
  /** Whether the AudioContext exists yet. */
  readonly started: boolean;
  destroy(): void;
}

interface Parts {
  ctx: AudioContext;
  master: GainNode;
  ambienceDuck: GainNode;
  oneShots: GainNode;
  ambience: Ambience;
  noise: AudioBuffer;
  music: Music | undefined;
}

/**
 * The whole soundscape, in one AudioContext with a master gain. It never touches the audio session type, so on a
 * phone the silent switch is respected. `createContext` is injectable for tests.
 */
export function createSoundEngine({
  createContext = () => new AudioContext(),
  random = Math.random,
  loadSample = loadFromNetwork,
  createAudio = defaultAudio,
}: {
  createContext?: () => AudioContext;
  random?: () => number;
  /** Fetches and decodes a recording; undefined when it isn't there. Injectable for tests. */
  loadSample?: (ctx: AudioContext, url: string) => Promise<AudioBuffer | undefined>;
  /** Makes the audio element the music streams from; undefined where there is none. Injectable for tests. */
  createAudio?: (url: string) => HTMLAudioElement | undefined;
} = {}): SoundEngine {
  let parts: Parts | undefined;
  let enabled = false;
  let hidden = false;
  let people = 0;
  let crackle = CRACKLE_DEFAULT;
  let musicLevel = MUSIC_DEFAULT;
  let offTimer: ReturnType<typeof setTimeout> | undefined;
  const limiter = createLimiter();
  const voices = new Map<number, GainNode>();

  const fadeIn = (built: Parts) => {
    const now = built.ctx.currentTime;
    built.master.gain.cancelScheduledValues(now);
    built.master.gain.setValueAtTime(built.master.gain.value, now);
    built.master.gain.linearRampToValueAtTime(MASTER_LEVEL, now + FADE_IN_SECONDS);
  };

  const build = (): Parts => {
    const ctx = createContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const ambienceDuck = ctx.createGain();
    ambienceDuck.connect(master);
    const oneShots = ctx.createGain();
    oneShots.connect(master);
    const noise = createNoiseBuffer(ctx);
    const ambience = startAmbience(ctx, ambienceDuck, noise, random);
    ambience.setFire(fireVolume(people));
    ambience.setTrim(trimMultiplier(crackle));
    // The recording of a real fire replaces the synthesized crackle once it has loaded; if it can't, nothing changes.
    void loadSample(ctx, FIRE_RECORDING).then((buffer) => {
      if (buffer && parts?.ctx === ctx) ambience.useRecording(buffer);
    });
    const music = createMusic(ctx, ambienceDuck, createAudio);
    music?.setTrim(trimMultiplier(musicLevel));
    return { ctx, master, ambienceDuck, oneShots, ambience, noise, music };
  };

  const running = () => (enabled && !hidden ? parts : undefined);

  const wake = async (): Promise<boolean> => {
    const built = running();
    if (!built) return false;
    clearTimeout(offTimer);
    fadeIn(built);
    built.music?.play();
    try {
      await built.ctx.resume();
    } catch {
      // The browser is holding it back until the visitor touches the page.
    }
    return built.ctx.state === "running";
  };

  return {
    get started() {
      return parts !== undefined;
    },
    get running() {
      return parts?.ctx.state === "running";
    },
    start() {
      if (!enabled) return Promise.resolve(false);
      parts ??= build();
      return wake();
    },
    setEnabled(next) {
      if (next === enabled) return;
      enabled = next;
      if (!parts) return;
      if (next) {
        void wake();
        return;
      }
      const { ctx, master } = parts;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + FADE_OUT_SECONDS);
      clearTimeout(offTimer);
      offTimer = setTimeout(
        () => {
          parts?.music?.pause();
          void ctx.suspend();
        },
        FADE_OUT_SECONDS * 1000 + 50,
      );
    },
    setMusic(level) {
      musicLevel = clampTrim(level, MUSIC_DEFAULT);
      parts?.music?.setTrim(trimMultiplier(musicLevel));
    },
    setCrackle(level) {
      crackle = clampTrim(level, CRACKLE_DEFAULT);
      parts?.ambience.setTrim(trimMultiplier(crackle));
    },
    setPeople(count) {
      people = count;
      parts?.ambience.setFire(fireVolume(count));
    },
    play(event) {
      const built = running();
      if (!built || built.ctx.state === "suspended") return;
      const cue = cueFor(event);
      if (cue.kind === "swell") {
        built.ambience.swell();
        return;
      }
      const { ctx } = built;
      const now = ctx.currentTime;
      const admission = limiter.admit(cue, now);
      if (!admission.play) return;
      if (admission.evict !== undefined) {
        const gone = voices.get(admission.evict);
        gone?.gain.cancelScheduledValues(now);
        gone?.gain.setTargetAtTime(0, now, 0.05);
        voices.delete(admission.evict);
      }
      // The voice plays through its own gain, set to this cue's level.
      const out = ctx.createGain();
      out.gain.value = playedGain(cue);
      out.connect(built.oneShots);
      voices.set(admission.id, out);
      VOICES[cue.voice]({ ctx, out, at: now + 0.01, noise: built.noise, random });
      // The ambience steps back a little while it plays, and returns.
      built.ambienceDuck.gain.cancelScheduledValues(now);
      built.ambienceDuck.gain.setTargetAtTime(DUCK_LEVEL, now, 0.06);
      built.ambienceDuck.gain.setTargetAtTime(1, now + cue.duration, 0.5);
      setTimeout(() => voices.delete(admission.id), cue.duration * 1000 + 200);
    },
    suspend() {
      hidden = true;
      parts?.music?.pause();
      if (parts) void parts.ctx.suspend();
    },
    resume() {
      hidden = false;
      if (parts && enabled) {
        void wake();
      }
    },
    destroy() {
      clearTimeout(offTimer);
      parts?.ambience.stop();
      parts?.music?.stop();
      void parts?.ctx.close();
      parts = undefined;
    },
  };
}
