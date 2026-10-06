"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { LANGUAGE_OPTIONS } from "@/i18n/locale";
import { SegmentedChoice } from "./SegmentedChoice";

/** Español / English, each named in its own language. */
export function LanguageChoice() {
  const { locale, setLocale, t } = useI18n();
  return (
    <SegmentedChoice
      legend={t.settings.language.legend}
      value={locale}
      onChange={setLocale}
      options={LANGUAGE_OPTIONS.map(({ locale: option, name }) => ({
        value: option,
        label: name,
        lang: option,
      }))}
    />
  );
}
