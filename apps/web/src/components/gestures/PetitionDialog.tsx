"use client";

import { PETITION_MAX_LENGTH } from "@/data/limits";
import { es } from "@/i18n/es";
import { canElevate, limitPetition, petitionRemainingToAnnounce } from "@/petition/petition";
import type { NoteTarget } from "./FoldingNote";
import { PaperDialog, type PaperCopy, type PaperRules } from "./PaperDialog";

const COPY: PaperCopy = {
  title: es.petition.title,
  helper: es.petition.helper,
  placeholder: es.petition.placeholder,
  fieldLabel: es.petition.fieldLabel,
  submit: es.petition.submit,
  cancel: es.petition.cancel,
};

const RULES: PaperRules = {
  limit: limitPetition,
  canSubmit: canElevate,
  // Short enough that the count is always welcome.
  counter: (count) =>
    es.petition.counter
      .replace("{count}", String(count))
      .replace("{max}", String(PETITION_MAX_LENGTH)),
  announce: (count) => {
    const remaining = petitionRemainingToAnnounce(count);
    return remaining === undefined
      ? ""
      : es.petition.remaining.replace("{remaining}", String(remaining));
  },
};

/** The sheet with a gold edge where someone writes what they ask for, which becomes a star. */
export function PetitionDialog(props: {
  notice?: string | undefined;
  onSubmit: (text: string) => boolean | Promise<boolean>;
  getTarget: () => NoteTarget | undefined;
  onLaunch: () => boolean;
  onAbort: () => void;
  onClose: () => void;
}) {
  return <PaperDialog copy={COPY} rules={RULES} edge="gold" {...props} />;
}
