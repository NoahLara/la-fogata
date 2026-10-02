import { burdenLength } from "@/burden/burden";
import { PETITION_MAX_LENGTH, PETITION_MIN_LENGTH } from "@/data/limits";

/** Cuts text down to the limit, never splitting a character in half. */
export function limitPetition(text: string): string {
  return burdenLength(text) <= PETITION_MAX_LENGTH
    ? text
    : Array.from(text).slice(0, PETITION_MAX_LENGTH).join("");
}

/** A petition can be raised with at least `PETITION_MIN_LENGTH` characters (spaces at the ends don't count) that fit. */
export function canElevate(text: string): boolean {
  const length = burdenLength(text.trim());
  return length >= PETITION_MIN_LENGTH && length <= PETITION_MAX_LENGTH;
}

/** What a screen reader is told about the limit, only at a few points so it isn't read on every keystroke. */
export function petitionRemainingToAnnounce(count: number): number | undefined {
  const remaining = PETITION_MAX_LENGTH - count;
  return remaining === 50 || remaining === 10 || remaining === 0 ? remaining : undefined;
}
