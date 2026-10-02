"use client";

import { PETITION_MAX_LENGTH } from "@/data/limits";
import { format, plural } from "@/i18n/format";
import { useI18n } from "@/i18n/I18nProvider";
import { canElevate, limitPetition, petitionRemainingToAnnounce } from "@/petition/petition";
import type { NoteTarget } from "./FoldingNote";
import { PaperDialog, type PaperCopy, type PaperRules } from "./PaperDialog";

/** The sheet with a gold edge where someone writes what they ask for, which becomes a star. */
export function PetitionDialog(props: {
  notice?: string | undefined;
  onSubmit: (text: string) => boolean | Promise<boolean>;
  getTarget: () => NoteTarget | undefined;
  onLaunch: () => boolean;
  onAbort: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const copy: PaperCopy = {
    title: t.petition.title,
    helper: t.petition.helper,
    placeholder: t.petition.placeholder,
    fieldLabel: t.petition.fieldLabel,
    submit: t.petition.submit,
    cancel: t.petition.cancel,
  };
  const rules: PaperRules = {
    limit: limitPetition,
    canSubmit: canElevate,
    // Short enough that the count is always welcome.
    counter: (count) => format(t.petition.counter, { count, max: PETITION_MAX_LENGTH }),
    announce: (count) => {
      const remaining = petitionRemainingToAnnounce(count);
      return remaining === undefined
        ? ""
        : format(plural(locale, t.petition.remaining, remaining), { remaining });
    },
  };
  return <PaperDialog copy={copy} rules={rules} edge="gold" {...props} />;
}
