import { burdenLength, limitText } from "@/burden/burden";
import {
  PETITION_ANSWER_MAX_LENGTH,
  PETITION_MAX_LENGTH,
  PETITION_MIN_LENGTH,
} from "@/data/limits";

/** Cuts text down to the limit, never splitting a character in half. */
export function limitPetition(text: string): string {
  return limitText(text, PETITION_MAX_LENGTH);
}

/** A petition can be raised with at least `PETITION_MIN_LENGTH` characters (spaces at the ends don't count) that fit. */
export function canElevate(text: string): boolean {
  const length = burdenLength(text.trim());
  return length >= PETITION_MIN_LENGTH && length <= PETITION_MAX_LENGTH;
}

/** What a screen reader is told about the limit, only at a few points so it isn't read on every keystroke. */
export function petitionRemainingToAnnounce(count: number): number | undefined {
  const remaining = PETITION_MAX_LENGTH - count;
  return remaining === 100 || remaining === 20 || remaining === 0 ? remaining : undefined;
}

/** Cuts the line that says how a petition was answered down to the limit, never splitting a character in half. */
export function limitAnswer(text: string): string {
  return limitText(text, PETITION_ANSWER_MAX_LENGTH);
}
