"use client";

import { useEffect, useId, useState } from "react";
import { useServices } from "@/data/DataProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { applyAnimalChoice } from "@/preferences/applyAnimalChoice";
import type { AnimalChoice } from "@/preferences/preferences";
import { useSettings } from "@/preferences/SettingsProvider";
import { DIALOG_SECONDARY, ModalDialog } from "../ModalDialog";
import { useInteraction } from "../scene/Interaction";
import { CharacterChoice } from "./CharacterChoice";
import { LanguageChoice } from "./LanguageChoice";
import { PillChoice } from "./PillChoice";

/** A bottom sheet on phones, a centred panel from `sm` up. It can scroll, for large text on a short screen. */
const PANEL =
  "m-auto max-h-[calc(100dvh-2rem)] w-[min(92vw,30rem)] overflow-y-auto rounded-sheet bg-bark-deep p-5 text-gold shadow-2xl ring-1 ring-ember/40 backdrop:bg-black/65 max-sm:mb-0 max-sm:mt-auto max-sm:max-h-[90dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]";

/** The three settings: character, language and text size. Everything saves as soon as it is chosen. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { presence } = useServices();
  const settings = useSettings();
  const { reportDialog } = useInteraction();
  const titleId = useId();
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    reportDialog("settings", "dialog");
    return () => reportDialog("settings", "none");
  }, [reportDialog]);

  const chooseCharacter = async (choice: AnimalChoice) => {
    settings.setAnimal(choice);
    // Seated: the new one takes the seat if it's free; if it's taken here, it waits for next time.
    setTaken((await applyAnimalChoice(choice, presence)) === "taken");
  };

  return (
    <ModalDialog labelledBy={titleId} onClose={onClose} className={PANEL}>
      <div className="flex flex-col gap-5">
        <h2 id={titleId} className="font-title text-xl font-medium">
          {t.settings.title}
        </h2>
        <CharacterChoice value={settings.animal} onChange={chooseCharacter} autoFocus />
        <p role="status" className="min-h-0 text-sm leading-relaxed text-gold/90">
          {taken ? t.settings.characterTaken : ""}
        </p>
        <LanguageChoice />
        <PillChoice
          legend={t.settings.textSize.legend}
          value={settings.textSize}
          onChange={settings.setTextSize}
          options={[
            { value: "small", label: t.settings.textSize.small },
            { value: "normal", label: t.settings.textSize.normal },
            { value: "large", label: t.settings.textSize.large },
          ]}
        />
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={DIALOG_SECONDARY}>
            {t.common.close}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
