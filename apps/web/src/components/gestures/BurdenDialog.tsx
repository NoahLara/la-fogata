"use client";

import {
  canHandOver,
  limitBurden,
  MAX_BURDEN_LENGTH,
  remainingToAnnounce,
  showCounter,
} from "@/burden/burden";
import { es } from "@/i18n/es";
import { PaperDialog, type PaperCopy, type PaperRules } from "./PaperDialog";
import type { NoteTarget } from "./FoldingNote";

const COPY: PaperCopy = {
  title: es.burden.title,
  helper: es.burden.helper,
  placeholder: es.burden.placeholder,
  fieldLabel: es.burden.fieldLabel,
  submit: es.burden.submit,
  cancel: es.burden.cancel,
};

const RULES: PaperRules = {
  limit: limitBurden,
  canSubmit: canHandOver,
  // The counter appears only near the limit, so it never nags someone who is writing freely.
  counter: (count) =>
    showCounter(count)
      ? es.burden.counter
          .replace("{count}", String(count))
          .replace("{max}", String(MAX_BURDEN_LENGTH))
      : "",
  announce: (count) => {
    const remaining = remainingToAnnounce(count);
    return remaining === undefined
      ? ""
      : es.burden.remaining.replace("{remaining}", String(remaining));
  },
};

/** The sheet where someone writes what weighs on them, which then burns. Nothing written is ever kept. */
export function BurdenDialog(props: {
  onSubmit: (text: string) => boolean;
  getTarget: () => NoteTarget | undefined;
  onLaunch: () => boolean;
  onAbort: () => void;
  onClose: () => void;
}) {
  return <PaperDialog copy={COPY} rules={RULES} {...props} />;
}
