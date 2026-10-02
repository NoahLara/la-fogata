"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { LANGUAGE_GROUP_LABEL, LANGUAGE_OPTIONS } from "@/i18n/locale";

/** "ES | EN" small in the bottom-left corner, level with the gesture bar. Each button is named in its own language, whatever language the page is in. */
export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div
      role="group"
      aria-label={LANGUAGE_GROUP_LABEL}
      className="absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom))+0.625rem)] left-[max(0.75rem,env(safe-area-inset-left))] z-10 flex items-center rounded-full bg-bark/80 px-1 text-xs text-gold ring-1 ring-ember/40"
    >
      {LANGUAGE_OPTIONS.map(({ locale: option, short, name }, index) => (
        <span key={option} className="flex items-center">
          {index > 0 && (
            <span aria-hidden="true" className="text-gold/40">
              |
            </span>
          )}
          <button
            type="button"
            aria-pressed={locale === option}
            onClick={() => setLocale(option)}
            className="min-h-6 min-w-6 rounded-full px-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold aria-pressed:bg-ember/90 aria-pressed:text-ink"
          >
            <span aria-hidden="true">{short}</span>
            <span lang={option} className="sr-only">
              {name}
            </span>
          </button>
        </span>
      ))}
    </div>
  );
}
