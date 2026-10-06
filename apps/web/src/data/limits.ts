/** The rules of petitions and prayers, shared by every implementation of the services. */
/** Long enough for a letter: a petition and how it was answered are read in full, in a panel of their own. */
export const PETITION_MAX_LENGTH = 2000;
export const PETITION_ANSWER_MAX_LENGTH = 2000;
export const PETITIONS_PER_DAY = 1;
/** "Paz" and "Fe" are petitions. */
export const PETITION_MIN_LENGTH = 2;
/** How many petition stars a sky shows at a time. */
export const SKY_SIZE = 30;
/** Prayer taps allowed in one session. */
export const PRAYERS_PER_SESSION = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
/** A petition expires after this long; an answered one stays golden for `ANSWERED_DAYS` more. */
export const PETITION_LIFETIME_MS = 30 * DAY_MS;
export const ANSWERED_LIFETIME_MS = 30 * DAY_MS;
export const DAY = DAY_MS;

/**
 * When someone may leave their next petition: the moment the oldest petition in their last day is a day old, or
 * `now` if they can already. `perDay` is how many a day they get.
 */
export function petitionAvailableAt(
  createdAts: readonly number[],
  now: number,
  perDay = PETITIONS_PER_DAY,
): number {
  const recent = createdAts.filter((at) => now - at < DAY_MS).sort((a, b) => a - b);
  if (recent.length < perDay) return now;
  // The (recent.length - perDay + 1)th oldest has to age out first.
  return (recent[recent.length - perDay] as number) + DAY_MS;
}
