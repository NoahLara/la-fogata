import { format, plural } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import type { Messages } from "@/i18n/messages";

/** How many stars the visitor has in their sky, and how many of those are answered. */
export function skyCounts(petitions: readonly { answered?: unknown }[]): {
  stars: number;
  answered: number;
} {
  return {
    stars: petitions.length,
    answered: petitions.filter((petition) => petition.answered !== undefined).length,
  };
}

/** "Tus peticiones: 3 estrellas, 1 respondida": the name of the group of the visitor's stars, each count in its own plural form. */
export function groupName(
  locale: Locale,
  t: Messages["sky"],
  counts: { stars: number; answered: number },
): string {
  return format(t.groupLabel, {
    stars: format(plural(locale, t.starCount, counts.stars), { count: counts.stars }),
    answered: format(plural(locale, t.answeredCount, counts.answered), { count: counts.answered }),
  });
}
