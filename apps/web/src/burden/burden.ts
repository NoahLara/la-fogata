/** The most characters a burden can have. */
export const MAX_BURDEN_LENGTH = 400;

/** How long the soft line stays on screen after a burden has burned, in seconds, before any help screen. */
export const AFTERGLOW_SECONDS = 2;

/** Characters as people count them: an emoji or an accented letter is one, not two. */
export function burdenLength(text: string): number {
  return Array.from(text).length;
}

/** Cuts text down to `max` characters, never splitting a character in half. */
export function limitText(text: string, max: number): string {
  return burdenLength(text) <= max ? text : Array.from(text).slice(0, max).join("");
}

/** Cuts a burden down to the limit. */
export function limitBurden(text: string): string {
  return limitText(text, MAX_BURDEN_LENGTH);
}

/** The fewest characters a burden can have, so a stray tap doesn't throw an empty sheet into the fire. */
export const MIN_BURDEN_LENGTH = 5;

/** A burden can be handed over when it has at least `MIN_BURDEN_LENGTH` characters (spaces at the ends don't count) and fits. */
export function canHandOver(text: string): boolean {
  const length = burdenLength(text.trim());
  return length >= MIN_BURDEN_LENGTH && length <= MAX_BURDEN_LENGTH;
}

/** The counter appears only when this few characters are left. */
export const COUNTER_FROM_REMAINING = 50;

/** Whether to show the character counter: only near the limit, so it never nags someone who is writing freely. */
export function showCounter(count: number): boolean {
  return MAX_BURDEN_LENGTH - count <= COUNTER_FROM_REMAINING;
}

/**
 * What a screen reader should be told about the limit, only at a few points so it isn't read on every
 * keystroke: the number of characters left when it is 50, 10 or none, and nothing otherwise.
 */
export function remainingToAnnounce(count: number): number | undefined {
  const remaining = MAX_BURDEN_LENGTH - count;
  return remaining === COUNTER_FROM_REMAINING || remaining === 10 || remaining === 0
    ? remaining
    : undefined;
}
