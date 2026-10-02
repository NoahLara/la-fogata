"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DICTIONARIES } from "./dictionaries";
import { localeCookie, type Locale } from "./locale";
import type { Messages } from "./messages";

interface I18n {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n | undefined>(undefined);

/**
 * Gives the UI the dictionary for the active language. The server picks `initialLocale`, so the first paint is
 * already right; switching is client state only, so nothing remounts and what someone has typed stays.
 */
export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const t = DICTIONARIES[locale];

  const setLocale = useCallback((next: Locale) => {
    try {
      document.cookie = localeCookie(next);
    } catch {
      // Cookies blocked: the language still changes for this visit.
    }
    setLocaleState(next);
  }, []);

  // The parts of the page React doesn't render: <html lang> and the metadata.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.meta.description);
  }, [locale, t]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside an I18nProvider");
  return value;
}
