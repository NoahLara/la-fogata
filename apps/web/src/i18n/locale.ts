export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** A functional preference (not personal data): the language the visitor picked. */
export const LOCALE_COOKIE = "lang";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** The same in every language on purpose: the switch must be readable by someone who can't read the current one. */
export const LANGUAGE_GROUP_LABEL = "Idioma / Language";
export const LANGUAGE_OPTIONS: readonly { locale: Locale; short: string; name: string }[] = [
  { locale: "es", short: "ES", name: "Español" },
  { locale: "en", short: "EN", name: "English" },
];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The best supported language in an Accept-Language header: highest q first, then the order written. */
export function parseAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  let best: { locale: Locale; q: number } | undefined;
  for (const part of header.split(",")) {
    const [tag = "", ...params] = part.trim().split(";");
    const language = tag.trim().toLowerCase().split("-")[0];
    if (!isLocale(language)) continue;
    const qParam = params.map((param) => param.trim()).find((param) => /^q=/i.test(param));
    const q = qParam === undefined ? 1 : Number(qParam.slice(2));
    if (!(q > 0)) continue;
    if (!best || q > best.q) best = { locale: language, q };
  }
  return best?.locale;
}

/** The saved choice wins; then the browser's language; Spanish when neither is Spanish or English. */
export function resolveLocale(input: {
  cookie?: string | null | undefined;
  acceptLanguage?: string | null | undefined;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  return parseAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}

/** The value for `document.cookie` that remembers the choice. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
