import { format, plural } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import type { Messages } from "@/i18n/messages";
import type { Petition } from "@/data/types";

/** What a star's card shows for a petition: all of it a symbol, a count or the person's own words. */
export interface CardState {
  /** The visitor wrote it: the fish is only a count, with nothing to press. */
  own: boolean;
  answered: boolean;
  /** How it happened, when the author wrote a line. */
  note: string | undefined;
  /** How many people are with it (one counter, waiting or answered). */
  count: number;
  /** The count is shown from one person on. */
  showCount: boolean;
  /** The fish can be pressed (someone else's star). */
  pressable: boolean;
  /** The visitor is already with it: the fish is drawn pressed. */
  pressed: boolean;
}

export function cardState(petition: Petition): CardState {
  const note = petition.answered?.note?.trim();
  return {
    own: petition.mine,
    answered: petition.answered !== undefined,
    note: note ? note : undefined,
    count: petition.prayers,
    showCount: petition.prayers > 0,
    pressable: !petition.mine,
    pressed: !petition.mine && petition.prayed,
  };
}

/** What a screen reader hears for the count ("3 personas acompañan esto"), or nothing at zero. */
export function countLabel(
  locale: Locale,
  t: Messages["sky"],
  state: Pick<CardState, "own" | "count">,
): string | undefined {
  if (state.count <= 0) return undefined;
  const forms = state.own ? t.ownAccompanyCount : t.accompanyCount;
  return format(plural(locale, forms, state.count), { count: state.count });
}

/** The name of a star's button for a screen reader. */
export function starName(
  t: Messages["sky"],
  petition: Pick<Petition, "mine" | "answered" | "text">,
  shorten: (text: string) => string,
): string {
  const text = shorten(petition.text);
  const key = petition.mine
    ? petition.answered
      ? t.starAnswered
      : t.star
    : petition.answered
      ? t.starOtherAnswered
      : t.starOther;
  return format(key, { text });
}
