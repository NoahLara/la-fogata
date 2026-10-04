import { format, plural } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import type { Messages } from "@/i18n/messages";

/**
 * Whether the visitor gets the gentle line about being alone: only when nobody else sits at this fire, and only
 * the first time in a visit.
 */
export function shouldSayAlone(state: { people: number; alreadySaid: boolean }): boolean {
  return state.people === 1 && !state.alreadySaid;
}

/** What a screen reader hears about the scene: how many other fires burn. */
export function otherFiresDescription(
  locale: Locale,
  t: Messages["company"],
  otherFires: number,
): string {
  if (otherFires <= 0) return t.noOtherFires;
  return format(plural(locale, t.otherFires, otherFires), { count: otherFires });
}

/** The line itself: how many other fires burn, or that the fire keeps them company when none does. It never says anyone will come. */
export function aloneLine(locale: Locale, t: Messages["company"], otherFires: number): string {
  return otherFires <= 0 ? t.keepsCompany : otherFiresDescription(locale, t, otherFires);
}
