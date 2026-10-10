"use client";

import { useState } from "react";
import { useSettings } from "@/preferences/SettingsProvider";
import { hasSeenTutorial, saveTutorialSeen } from "@/tutorial/tutorial";
import { TutorialDialog } from "./TutorialDialog";

/**
 * Shows the tutorial the first time, once the visitor has agreed to the terms (it is rendered inside the terms'
 * gate, so it never comes before them), and remembers that they have seen it. Skipping it counts as having seen it.
 * It can be opened again from the settings.
 */
export function TutorialGate() {
  const { ready } = useSettings();
  // What was saved is read once the page is up, like the terms and the settings.
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  if (ready && !checked) {
    setChecked(true);
    setOpen(!hasSeenTutorial());
  }
  if (!open) return null;
  return (
    <TutorialDialog
      unlocksSound
      onClose={() => {
        saveTutorialSeen();
        setOpen(false);
      }}
    />
  );
}
