import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locale";

/** The language for this request: the saved choice, else the browser's. Reading them makes the page dynamic. */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get("accept-language"),
  });
});
