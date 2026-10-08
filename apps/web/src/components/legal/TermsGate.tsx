"use client";

import { useState, type ReactNode } from "react";
import { hasAcceptedTerms, saveTermsAccepted } from "@/legal/terms";
import { useSettings } from "@/preferences/SettingsProvider";
import { TermsDialog } from "./TermsDialog";

/**
 * Asks for the terms once, the first time (and again only if they change). Its children, which seat the visitor,
 * wait until they have agreed. Where the browser keeps nothing, it asks every visit.
 */
export function TermsGate({ children }: { children: ReactNode }) {
  const { ready } = useSettings();
  // The saved agreement is read once the page is up, like the settings.
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  if (ready && !checked) {
    setChecked(true);
    setAccepted(hasAcceptedTerms());
  }

  if (!ready || !checked) return null;
  if (!accepted) {
    return (
      <TermsDialog
        mode="accept"
        onAccept={() => {
          saveTermsAccepted();
          setAccepted(true);
        }}
        onClose={() => {}}
      />
    );
  }
  return <>{children}</>;
}
