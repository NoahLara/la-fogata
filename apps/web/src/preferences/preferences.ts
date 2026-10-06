import { clampTrim, CRACKLE_DEFAULT, MUSIC_DEFAULT } from "@/sound/volumeTrim";
import { SPECIES, type Species } from "@/scene/characters/species";

/** A species, or "random": whoever is free when the visitor sits down. */
export type AnimalChoice = Species | "random";
export type TextSize = "small" | "normal" | "large";

export interface Preferences {
  animal: AnimalChoice;
  textSize: TextSize;
  /** Sound is on. It is on by default, and the visitor can turn it off in the settings. */
  sound: boolean;
  /** How loud the fire's crackle is, 0 to 100; the middle is the normal level. */
  crackle: number;
  /** How loud the background music is, 0 to 100; the middle is the normal level. */
  music: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  animal: "random",
  textSize: "small",
  sound: true,
  crackle: CRACKLE_DEFAULT,
  music: MUSIC_DEFAULT,
};

/** The part of `Storage` this module needs, so tests can break it on purpose. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEYS = {
  animal: "fogata:animal",
  textSize: "fogata:text-size",
  sound: "fogata:sound",
  crackle: "fogata:crackle",
  music: "fogata:music",
} as const;

/** The root font size for each text size (a share of the browser's); every rem size in the UI follows it. */
export const TEXT_SIZE_PERCENT: Record<TextSize, number> = { small: 90, normal: 100, large: 125 };
export const TEXT_SIZE_ATTRIBUTE = "data-text-size";

/** localStorage, or nothing when the browser refuses it (private windows, blocked site data). */
export function browserStorage(): StorageLike | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function isAnimalChoice(value: unknown): value is AnimalChoice {
  return value === "random" || (SPECIES as readonly unknown[]).includes(value);
}

export function isTextSize(value: unknown): value is TextSize {
  return value === "small" || value === "normal" || value === "large";
}

function read(storage: StorageLike | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: StorageLike | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Nowhere to keep it: the choice still holds for this visit.
  }
}

/** What the visitor chose before; anything missing or unknown falls back to the default. */
export function readPreferences(storage: StorageLike | undefined = browserStorage()): Preferences {
  const animal = read(storage, STORAGE_KEYS.animal);
  const textSize = read(storage, STORAGE_KEYS.textSize);
  return {
    animal: isAnimalChoice(animal) ? animal : DEFAULT_PREFERENCES.animal,
    textSize: isTextSize(textSize) ? textSize : DEFAULT_PREFERENCES.textSize,
    // Only an explicit "0" turns it off: anything else (missing, unknown) is the default, on.
    sound: read(storage, STORAGE_KEYS.sound) !== "0",
    crackle: clampTrim(read(storage, STORAGE_KEYS.crackle), CRACKLE_DEFAULT),
    music: clampTrim(read(storage, STORAGE_KEYS.music), MUSIC_DEFAULT),
  };
}

export function saveAnimal(
  animal: AnimalChoice,
  storage: StorageLike | undefined = browserStorage(),
) {
  write(storage, STORAGE_KEYS.animal, animal);
}

export function saveTextSize(size: TextSize, storage: StorageLike | undefined = browserStorage()) {
  write(storage, STORAGE_KEYS.textSize, size);
}

export function saveSound(sound: boolean, storage: StorageLike | undefined = browserStorage()) {
  write(storage, STORAGE_KEYS.sound, sound ? "1" : "0");
}

export function saveCrackle(level: number, storage: StorageLike | undefined = browserStorage()) {
  write(storage, STORAGE_KEYS.crackle, String(clampTrim(level, CRACKLE_DEFAULT)));
}

export function saveMusic(level: number, storage: StorageLike | undefined = browserStorage()) {
  write(storage, STORAGE_KEYS.music, String(clampTrim(level, MUSIC_DEFAULT)));
}

/** Marks the page with the text size; `globals.css` turns "large" into a bigger root font size. */
export function applyTextSize(size: TextSize, root: HTMLElement = document.documentElement) {
  root.setAttribute(TEXT_SIZE_ATTRIBUTE, size);
}

/** Runs before the first paint so a visitor who chose "Grande" never sees the page jump. */
export const TEXT_SIZE_SCRIPT = `try{var s=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.textSize,
)});if(s==="normal"||s==="large")document.documentElement.setAttribute(${JSON.stringify(TEXT_SIZE_ATTRIBUTE)},s)}catch(e){}`;
