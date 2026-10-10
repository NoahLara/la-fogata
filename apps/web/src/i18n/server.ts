import { cache } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locale";

/** The language for this request: the visitor's saved choice, else Spanish. Reading the cookie makes the page dynamic. */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  return resolveLocale({ cookie: cookieStore.get(LOCALE_COOKIE)?.value });
});
