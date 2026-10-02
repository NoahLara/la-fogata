/** The rules of petitions and prayers, shared by every implementation of the services. */
export const PETITION_MAX_LENGTH = 140;
export const PETITION_ANSWER_MAX_LENGTH = 140;
export const PETITIONS_PER_DAY = 1;
/** How many petition stars a sky shows at a time. */
export const SKY_SIZE = 30;
/** Prayer taps allowed in one session. */
export const PRAYERS_PER_SESSION = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
/** A petition expires after this long; an answered one stays golden for `ANSWERED_DAYS` more. */
export const PETITION_LIFETIME_MS = 30 * DAY_MS;
export const ANSWERED_LIFETIME_MS = 30 * DAY_MS;
export const DAY = DAY_MS;
