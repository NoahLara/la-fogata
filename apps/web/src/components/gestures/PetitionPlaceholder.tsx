"use client";

import { useId } from "react";
import { es } from "@/i18n/es";
import { DIALOG_SECONDARY, ModalDialog } from "../ModalDialog";

/** Stands in for the petition form until petitions exist. */
export function PetitionPlaceholder({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  return (
    <ModalDialog labelledBy={titleId} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="text-xl font-medium">
          {es.petition.title}
        </h2>
        <p className="text-sm text-gold/80">{es.petition.comingSoon}</p>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={DIALOG_SECONDARY}>
            {es.common.close}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
