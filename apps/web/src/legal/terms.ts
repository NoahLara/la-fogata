import { browserStorage, type StorageLike } from "@/preferences/preferences";

/**
 * The version of the terms people agree to. Raise it when they change in a way that matters and everyone is asked
 * once more; a small fix to the wording does not need a new version.
 */
export const TERMS_VERSION = "2";

export const TERMS_STORAGE_KEY = "fogata:terms";

/** The youngest age the terms are written for. */
export const MINIMUM_AGE = 16;

/** Whether this browser already agreed to the current terms. Nothing but the version is kept: no date, no id. */
export function hasAcceptedTerms(storage: StorageLike | undefined = browserStorage()): boolean {
  try {
    return storage?.getItem(TERMS_STORAGE_KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

export function saveTermsAccepted(storage: StorageLike | undefined = browserStorage()): void {
  try {
    storage?.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
  } catch {
    // Nowhere to keep it: it holds for this visit and they are asked again next time.
  }
}
