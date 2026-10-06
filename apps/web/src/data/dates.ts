import type { Locale } from "@/i18n/locale";

/**
 * The day a petition was written or answered, as `YYYY-MM-DD` in the visitor's own calendar. Only the day is
 * kept for people to read, never the hour, and it says nothing about who wrote it.
 */
export function dateKey(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A day as it heads a letter: "5 de octubre de 2026" or "October 5, 2026". */
export function formatLetterDate(key: string, locale: Locale): string {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    // The key is already a calendar day: read it as one, whatever the visitor's time zone.
    timeZone: "UTC",
  }).format(Date.UTC(year, month - 1, day));
}
