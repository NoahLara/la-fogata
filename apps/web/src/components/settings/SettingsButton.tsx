"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { SettingsPanel } from "./SettingsPanel";

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.27 4.80 L10.72 2.49 L13.28 2.49 L13.73 4.80 L15.87 5.69 L17.82 4.37 L19.63 6.18 L18.31 8.13 L19.20 10.27 L21.51 10.72 L21.51 13.28 L19.20 13.73 L18.31 15.87 L19.63 17.82 L17.82 19.63 L15.87 18.31 L13.73 19.20 L13.28 21.51 L10.72 21.51 L10.27 19.20 L8.13 18.31 L6.18 19.63 L4.37 17.82 L5.69 15.87 L4.80 13.73 L2.49 13.28 L2.49 10.72 L4.80 10.27 L5.69 8.13 L4.37 6.18 L6.18 4.37 L8.13 5.69 Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

/** The gear in the bottom-left corner (where the language switch used to be): 44 px, opens the settings. */
export function SettingsButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={t.settings.open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-10 flex size-11 items-center justify-center rounded-full bg-bark/90 text-gold ring-1 ring-ember/50 hover:bg-ember/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <GearIcon />
      </button>
      {open && (
        <SettingsPanel
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
        />
      )}
    </>
  );
}
