"use client";

import { useEffect, useId, useState } from "react";
import { useServices } from "@/data/DataProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { applyAnimalChoice } from "@/preferences/applyAnimalChoice";
import type { AnimalChoice } from "@/preferences/preferences";
import { useSettings } from "@/preferences/SettingsProvider";
import { useSound } from "@/sound/SoundProvider";
import { TermsDialog } from "../legal/TermsDialog";
import { ModalDialog } from "../ModalDialog";
import { useInteraction } from "../scene/Interaction";
import { CharacterChoice } from "./CharacterChoice";
import { LanguageChoice } from "./LanguageChoice";
import { SegmentedChoice } from "./SegmentedChoice";
import { SoundSwitch } from "./SoundSwitch";
import { VolumeSlider } from "./VolumeSlider";

/**
 * A bottom sheet on phones, a wide centred panel from `sm` up. It is built so nothing needs scrolling: two columns
 * on a wide screen, and on a phone compact tiles with the choices that fit on one row sharing it. It can still
 * scroll, for large text on a short screen.
 */
const PANEL =
  "m-auto max-h-[calc(100dvh-2rem)] w-[min(94vw,46rem)] overflow-y-auto settings-cream rounded-sheet p-0 backdrop:bg-black/65 max-sm:mb-0 max-sm:mt-auto max-sm:max-h-[92dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none";

/** The settings: character, language, text size, sound and its two volumes. Everything saves as soon as it is chosen. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { presence } = useServices();
  const settings = useSettings();
  const sound = useSound();
  const { reportDialog } = useInteraction();
  const titleId = useId();
  const [taken, setTaken] = useState(false);
  const [terms, setTerms] = useState(false);

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
      <div className="flex flex-col">
        <div className="wood-plank flex items-center justify-between gap-3 px-5 py-2.5 max-sm:px-4">
          <h2 id={titleId} className="font-title text-xl font-medium">
            {t.settings.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="btn-wood flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="grid gap-5 p-5 max-sm:p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-[1.15fr_1fr] sm:gap-x-8">
          <div className="flex flex-col gap-5">
            <CharacterChoice value={settings.animal} onChange={chooseCharacter} autoFocus compact />
            <p role="status" className="text-sm leading-relaxed text-ink-soft empty:sr-only">
              {taken ? t.settings.characterTaken : ""}
            </p>
            <LanguageChoice />
          </div>
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-3 rounded-sheet bg-paper-shade p-4 shadow-[inset_0_2px_4px_rgb(0_0_0/0.12)]">
              <SoundSwitch
                legend={t.settings.sound.legend}
                on={settings.sound}
                onWord={t.settings.sound.on}
                offWord={t.settings.sound.off}
                onChange={sound.setEnabled}
              />
              <VolumeSlider
                legend={t.settings.crackle.legend}
                value={settings.crackle}
                onChange={settings.setCrackle}
                disabled={!settings.sound}
              />
              <VolumeSlider
                legend={t.settings.music.legend}
                value={settings.music}
                onChange={settings.setMusic}
                disabled={!settings.sound}
              />
            </section>
            <SegmentedChoice
              legend={t.settings.textSize.legend}
              value={settings.textSize}
              onChange={settings.setTextSize}
              options={[
                { value: "small", label: t.settings.textSize.small, className: "text-xs" },
                { value: "normal", label: t.settings.textSize.normal, className: "text-sm" },
                { value: "large", label: t.settings.textSize.large, className: "text-base" },
              ]}
            />
            <button
              type="button"
              onClick={() => setTerms(true)}
              className="self-start text-sm text-ink-soft underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-deep"
            >
              {t.terms.open}
            </button>
          </div>
        </div>
      </div>
      {terms && <TermsDialog mode="read" onClose={() => setTerms(false)} />}
    </ModalDialog>
  );
}
