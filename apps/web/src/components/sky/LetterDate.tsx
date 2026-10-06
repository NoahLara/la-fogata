"use client";

import { formatLetterDate } from "@/data/dates";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/I18nProvider";
import { SpikedStar } from "./glyphs";

/**
 * The day, as it heads a letter ("5 de octubre de 2026"), written by hand. A screen reader hears what the day is
 * for ("Escrita el ..."), the eye just sees the date; an answered one carries the small spiked star.
 */
export function LetterDate({ day, kind }: { day: string; kind: "written" | "answered" }) {
  const { t, locale } = useI18n();
  const date = formatLetterDate(day, locale);
  const spoken = format(kind === "written" ? t.sky.writtenOn : t.sky.answeredOn, { date });
  return (
    <p className="font-hand text-[1.5rem] leading-7 text-ink-soft">
      {kind === "answered" && (
        <>
          <SpikedStar />{" "}
        </>
      )}
      <time dateTime={day}>
        <span className="sr-only">{spoken}</span>
        <span aria-hidden="true">{date}</span>
      </time>
    </p>
  );
}
