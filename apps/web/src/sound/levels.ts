/**
 * Every level in the soundscape, in one place so it can be tuned by ear. Gains are linear (1 is full scale) and
 * everything is deliberately on the quiet side.
 */

/** The master gain once the fade-in is over. */
export const MASTER_LEVEL = 0.5;
/** How long the sound fades in when it starts, and how long it takes to fade out when it is turned off. */
export const FADE_IN_SECONDS = 3;
export const FADE_OUT_SECONDS = 0.5;

/** The loudest the three ambience layers get together; one-shots are held under it. */
export const AMBIENCE_PEAK = 0.14;
export const AMBIENCE = {
  /** The crackle bed at full fire volume (see `fireVolume`). */
  crackle: 0.07,
  /** Random pops over the bed. */
  pop: 0.05,
  /** The recorded crackle (`public/sounds/fire-crackle.mp3`), at full fire volume. */
  recording: 0.5,
  wind: 0.05,
} as const;

/** The background music (`public/sounds`) at its normal level: well under the fire, which is what it plays over. */
export const MUSIC_LEVEL = 0.07;
/** The music fades in slowly, after the fire has. */
export const MUSIC_FADE_IN_SECONDS = 5;

/** One-shots are never louder, all together, than the ambience. */
export const MAX_ONE_SHOTS = 3;
export const ONE_SHOT_CEILING = AMBIENCE_PEAK;
/** The most any single one-shot may be, so that `MAX_ONE_SHOTS` of them still stay under the ceiling. */
export const ONE_SHOT_MAX_GAIN = ONE_SHOT_CEILING / MAX_ONE_SHOTS;

/** While a one-shot plays the ambience dips to this share of its level, then comes back. */
export const DUCK_LEVEL = 0.8;
