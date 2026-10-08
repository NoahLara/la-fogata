"use client";

import {
  canHandOver,
  limitBurden,
  MAX_BURDEN_LENGTH,
  remainingToAnnounce,
  showCounter,
} from "@/burden/burden";
import { format, plural } from "@/i18n/format";
import { useI18n } from "@/i18n/I18nProvider";
import { PaperDialog, type PaperCopy, type PaperRules } from "./PaperDialog";
import type { NoteTarget } from "./FoldingNote";

/** The sheet where someone writes what weighs on them, which then burns. Nothing written is ever kept. */
export function BurdenDialog(props: {
  notice?: string | undefined;
  onSubmit: (text: string) => boolean;
  getTarget: () => NoteTarget | undefined;
  onLaunch: () => boolean;
  onAbort: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const copy: PaperCopy = {
    title: t.burden.title,
    helper: t.burden.helper,
    placeholder: t.burden.placeholder,
    fieldLabel: t.burden.fieldLabel,
    submit: t.burden.submit,
    cancel: t.burden.cancel,
  };
  const rules: PaperRules = {
    limit: limitBurden,
    canSubmit: canHandOver,
    // The counter appears only near the limit, so it never nags someone who is writing freely.
    counter: (count) =>
      showCounter(count) ? format(t.burden.counter, { count, max: MAX_BURDEN_LENGTH }) : "",
    announce: (count) => {
      const remaining = remainingToAnnounce(count);
      return remaining === undefined
        ? ""
        : format(plural(locale, t.burden.remaining, remaining), { remaining });
    },
  };
  return <PaperDialog copy={copy} rules={rules} {...props} />;
}
