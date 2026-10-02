"use client";

import { useId } from "react";
import { es, HELPLINE_URL } from "@/i18n/es";
import { DIALOG_PRIMARY, DIALOG_SECONDARY, ModalDialog } from "../ModalDialog";

/** Shown, gently, after a burden that had signs of someone being at risk. */
export function HelpScreen({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <ModalDialog labelledBy={titleId} describedBy={bodyId} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="text-xl font-medium">
          {es.help.title}
        </h2>
        <p id={bodyId} className="text-sm leading-relaxed text-gold/90">
          {es.help.body}
        </p>
        <a
          href={HELPLINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${DIALOG_PRIMARY} inline-flex items-center justify-center text-center`}
        >
          {es.help.link}
        </a>
        <p className="text-xs text-gold/60">{es.common.notProfessionalHelp}</p>
        <button type="button" onClick={onClose} className={DIALOG_SECONDARY}>
          {es.help.back}
        </button>
      </div>
    </ModalDialog>
  );
}
