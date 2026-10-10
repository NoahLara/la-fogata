import { browserStorage, type StorageLike } from "@/preferences/preferences";

/**
 * The version of the tutorial the visitor has seen. Raise it when it changes so much that everyone should see it
 * once more; a small fix to the wording does not need a new version.
 */
export const TUTORIAL_VERSION = "1";

export const TUTORIAL_STORAGE_KEY = "fogata:tutorial";

/** The steps, in order. Each one is a key of `tutorial.steps` in the messages, and has its own drawing. */
export const TUTORIAL_STEPS = [
  "forest",
  "wood",
  "burden",
  "petition",
  "sky",
  "answered",
  "company",
  "word",
] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** Whether this browser has already seen the tutorial. Nothing but the version is kept: no date, no id. */
export function hasSeenTutorial(storage: StorageLike | undefined = browserStorage()): boolean {
  try {
    return storage?.getItem(TUTORIAL_STORAGE_KEY) === TUTORIAL_VERSION;
  } catch {
    return false;
  }
}

export function saveTutorialSeen(storage: StorageLike | undefined = browserStorage()): void {
  try {
    storage?.setItem(TUTORIAL_STORAGE_KEY, TUTORIAL_VERSION);
  } catch {
    // Nowhere to keep it: it shows again next visit, which is harmless.
  }
}

/** The step after `current` (or the same one at the end), and the one before it (or the same one at the start). */
export function nextStep(current: number): number {
  return Math.min(current + 1, TUTORIAL_STEPS.length - 1);
}

export function previousStep(current: number): number {
  return Math.max(current - 1, 0);
}
