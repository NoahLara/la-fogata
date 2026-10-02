"use client";

import { useId } from "react";
import { es } from "@/i18n/es";
import { DIALOG_SECONDARY, ModalDialog } from "../ModalDialog";

/** Shown instead of the form when they have already raised a petition today. */
export function PetitionLimit({ onClose }: { onClose: () => void }) {
  const messageId = useId();
  return (
    <ModalDialog labelledBy={messageId} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p id={messageId} className="text-base">
          {es.petition.alreadyToday}
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={DIALOG_SECONDARY}>
            {es.common.close}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
