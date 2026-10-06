import { MUSIC_FADE_IN_SECONDS, MUSIC_LEVEL } from "./levels";

/** The background music, streamed from `public/sounds`. */
export const MUSIC_URL =
  "/sounds/denis-pavlov-musiac-worship-piano-instrumental-peaceful-prayer-music-223373.mp3";

export interface Music {
  /** Starts it (or carries on) and fades it in. */
  play(): void;
  /** Stops where it is, so it carries on from there. */
  pause(): void;
  /** The visitor's own volume for the music alone, as a multiplier (1 is normal). */
  setTrim(multiplier: number): void;
  stop(): void;
}

/**
 * The music plays from an audio element (streamed, never decoded whole: it is minutes long) through the context,
 * so it follows the master gain, the ducking, and the sound being off. It loops. Nothing here if the browser has
 * no `Audio`, or if the file can't be played.
 */
export function createMusic(
  ctx: AudioContext,
  out: AudioNode,
  createAudio: (url: string) => HTMLAudioElement | undefined,
): Music | undefined {
  const element = createAudio(MUSIC_URL);
  if (!element) return undefined;
  element.loop = true;
  element.preload = "none";
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const source = ctx.createMediaElementSource(element);
  source.connect(gain);
  gain.connect(out);
  let trim = 1;
  /** The slow fade-in has been set going. */
  let scheduled = false;
  /** It has begun to move: the browser let the context run. */
  let fading = false;

  return {
    play() {
      // A blocked or missing file is not worth a message: the fire carries on without it.
      void Promise.resolve(element.play()).catch(() => {});
      // Once the slow fade-in is under way it is left alone: coming back from a pause doesn't fade again.
      if (fading) return;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(MUSIC_LEVEL * trim, now + MUSIC_FADE_IN_SECONDS);
      scheduled = true;
      // While the browser holds the context back its clock stands still, so the fade starts when it is let go.
      if (ctx.state === "running") fading = true;
    },
    pause() {
      element.pause();
    },
    setTrim(multiplier) {
      trim = multiplier;
      if (scheduled) gain.gain.setTargetAtTime(MUSIC_LEVEL * trim, ctx.currentTime, 0.2);
    },
    stop() {
      element.pause();
      element.removeAttribute("src");
      source.disconnect();
    },
  };
}
