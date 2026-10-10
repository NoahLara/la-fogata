export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** A functional preference (not personal data): the language the visitor picked. */
export const LOCALE_COOKIE = "lang";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Each language is named in itself, in every language: the switch must be readable by someone who can't read the current one. */
export const LANGUAGE_OPTIONS: readonly { locale: Locale; short: string; name: string }[] = [
  { locale: "es", short: "ES", name: "Español" },
  { locale: "en", short: "EN", name: "English" },
];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * The saved choice wins; with none, Spanish, whatever language the browser says it speaks. English is only for
 * whoever picks it in the settings.
 */
export function resolveLocale(input: { cookie?: string | null | undefined }): Locale {
  return isLocale(input.cookie) ? input.cookie : DEFAULT_LOCALE;
}

/** The value for `document.cookie` that remembers the choice. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
