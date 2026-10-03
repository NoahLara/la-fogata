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
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
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
