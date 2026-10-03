"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useServices } from "@/data/DataProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { LANGUAGE_GROUP_LABEL, LANGUAGE_OPTIONS } from "@/i18n/locale";
import { useSettings } from "@/preferences/SettingsProvider";
import type { FogataScene } from "@/scene/createScene";
import { DIALOG_PRIMARY, ModalDialog } from "../ModalDialog";
import { useInteraction } from "../scene/Interaction";
import { CharacterChoice } from "./CharacterChoice";

/** How long the card takes to fade once they sit down; their character starts walking in meanwhile. */
const FADE_MS = 500;

const CARD =
  "m-auto max-h-[calc(100dvh-2rem)] w-[min(92vw,28rem)] overflow-y-auto rounded-sheet bg-bark-deep p-6 text-gold shadow-2xl ring-1 ring-gold/60 transition-opacity duration-500 backdrop:bg-black/65 backdrop:transition-opacity backdrop:duration-500 data-handing:opacity-0 data-handing:backdrop:opacity-0";
const SMALL_LINK =
  "inline-flex min-h-8 items-center rounded-sm px-1 text-sm text-gold/90 underline underline-offset-4 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/**
 * The welcome card over the dimmed scene, shown once: the first time someone comes. Sitting down seats the
 * visitor with their saved character (a free one if it's taken here or they have none) and fades the card as the
 * character walks in. Esc does not close it. Anyone who has been before sits down at once, with no card; what the
 * card offered (character, language) is in the settings.
 */
export function Entrance({ scene, skipIntro }: { scene: FogataScene; skipIntro: boolean }) {
  const { t, locale, setLocale } = useI18n();
  const { presence } = useServices();
  const settings = useSettings();
  const { reportDialog } = useInteraction();
  const titleId = useId();
  const bodyId = useId();
  const [phase, setPhase] = useState<"card" | "leaving" | "done">("card");
  const [picking, setPicking] = useState(false);
  const entered = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const { animal, ready, visited, markVisited } = settings;
  const sitDown = useCallback(async () => {
    if (entered.current) return;
    entered.current = true;
    const me = await presence.join(animal === "random" ? undefined : animal);
    if (me) scene.setSelf(me.id);
  }, [presence, scene, animal]);

  const enter = () => {
    if (phase !== "card") return;
    setPhase("leaving");
    void sitDown().then(() => {
      timer.current = window.setTimeout(() => {
        // Only now: marking them earlier would take the card away before it has faded.
        markVisited();
        setPhase("done");
      }, FADE_MS);
    });
  };

  // ?skipIntro (development only), or been here before: no card.
  const skipCard = skipIntro || visited;
  useEffect(() => {
    if (ready && skipCard) void sitDown();
  }, [ready, skipCard, sitDown]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const showing = ready && !skipCard && phase !== "done";
  useEffect(() => {
    if (!showing) return;
    reportDialog("entrance", "dialog");
    return () => reportDialog("entrance", "none");
  }, [showing, reportDialog]);

  if (!showing) return null;

  return (
    <ModalDialog
      labelledBy={titleId}
      describedBy={bodyId}
      onClose={() => {}}
      persistent
      handing={phase === "leaving"}
      className={CARD}
    >
      {picking ? (
        <div className="flex flex-col gap-6">
          <h2 id={titleId} className="font-title text-xl font-medium">
            {t.entrance.pickerTitle}
          </h2>
          <p id={bodyId} className="sr-only">
            {t.entrance.pickerTitle}
          </p>
          <CharacterChoice value={animal} onChange={settings.setAnimal} autoFocus />
          <div className="flex justify-end">
            <button type="button" onClick={() => setPicking(false)} className={DIALOG_PRIMARY}>
              {t.entrance.pickerDone}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <h2 id={titleId} className="font-title text-3xl font-medium">
            {t.entrance.title}
          </h2>
          <p id={bodyId} className="text-base leading-relaxed">
            {t.entrance.tagline}
          </p>
          <button
            type="button"
            data-autofocus
            onClick={enter}
            className={`${DIALOG_PRIMARY} shadow-ember`}
          >
            {t.entrance.enter}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <button type="button" onClick={() => setPicking(true)} className={SMALL_LINK}>
              {t.entrance.chooseCharacter}
            </button>
            <div role="group" aria-label={LANGUAGE_GROUP_LABEL} className="flex items-center">
              {LANGUAGE_OPTIONS.map(({ locale: option, name }, index) => (
                <span key={option} className="flex items-center">
                  {index > 0 && (
                    <span aria-hidden="true" className="text-gold/50">
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    lang={option}
                    aria-pressed={locale === option}
                    onClick={() => setLocale(option)}
                    className={`${SMALL_LINK} aria-pressed:text-gold aria-pressed:no-underline`}
                  >
                    {name}
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
