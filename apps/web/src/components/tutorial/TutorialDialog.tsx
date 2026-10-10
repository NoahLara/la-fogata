"use client";

import { useEffect, useId, useRef, useState } from "react";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/I18nProvider";
import { nextStep, previousStep, TUTORIAL_STEPS } from "@/tutorial/tutorial";
import { DIALOG_PRIMARY, DIALOG_SECONDARY, ModalDialog } from "../ModalDialog";
import { useInteraction } from "../scene/Interaction";
import { TutorialArt } from "./TutorialArt";

/** A bottom sheet on phones, a centred card from `sm` up. The backdrop is light, so the fire shows through it. */
const PANEL =
  "m-auto flex max-h-[calc(100dvh-2rem)] w-[min(94vw,30rem)] flex-col overflow-y-auto rounded-sheet bg-bark-deep p-0 text-gold shadow-2xl ring-1 ring-ember/40 backdrop:bg-black/55 max-sm:mb-0 max-sm:mt-auto max-sm:max-h-[94dvh] max-sm:w-full max-sm:rounded-b-none";

/** How far a finger must travel sideways, and no more than this up or down, to turn the page. */
const SWIPE_MIN = 48;
const SWIPE_SLACK = 40;

/**
 * What La Fogata is and what can be done in it, one thing at a time, each with a small drawing of what it looks
 * like. It can be gone through with the buttons, the arrow keys, a swipe or the dots, and skipped at any point.
 * The words are announced as they change; the drawings are decoration.
 */
export function TutorialDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { reportDialog } = useInteraction();
  const titleId = useId();
  const [step, setStep] = useState(0);
  const touch = useRef<{ x: number; y: number } | undefined>(undefined);
  const last = step === TUTORIAL_STEPS.length - 1;
  const key = TUTORIAL_STEPS[step] ?? TUTORIAL_STEPS[0];
  const copy = t.tutorial.steps[key];

  // Tells the page something is open over the fire, so the fire doesn't speak over it.
  useEffect(() => {
    reportDialog("tutorial", "dialog");
    return () => reportDialog("tutorial", "none");
  }, [reportDialog]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") setStep(nextStep);
    else if (event.key === "ArrowLeft") setStep(previousStep);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = touch.current;
    touch.current = undefined;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dy) > SWIPE_SLACK) return;
    setStep(dx < 0 ? nextStep : previousStep);
  };

  return (
    <ModalDialog labelledBy={titleId} onClose={onClose} className={PANEL}>
      <div onKeyDown={onKeyDown} className="flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-3">
          <h2 id={titleId} className="font-title text-sm text-ember-soft">
            {t.tutorial.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full px-3 text-sm text-gold/80 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {t.tutorial.skip}
          </button>
        </div>

        {/* What changes with each step is announced; the page around it stays put. */}
        <div aria-live="polite" aria-atomic="true" className="px-5">
          <div
            key={step}
            onPointerDown={(event) => {
              touch.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              touch.current = undefined;
            }}
            className="tutorial-step flex touch-pan-y flex-col gap-4 pt-1 pb-2 select-none"
          >
            <TutorialArt step={key} />
            <div className="flex flex-col gap-2">
              <p className="text-xs tracking-wide text-ember-soft/80 uppercase">
                {format(t.tutorial.progress, { current: step + 1, total: TUTORIAL_STEPS.length })}
              </p>
              <h3 className="font-title text-2xl leading-tight font-medium text-gold">
                {copy.title}
              </h3>
              <p className="text-base leading-relaxed text-gold/90">{copy.body}</p>
            </div>
          </div>
        </div>

        <nav aria-label={t.tutorial.stepsLabel} className="px-5 pt-1">
          <ol className="flex items-center justify-center gap-0.5">
            {TUTORIAL_STEPS.map((name, index) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  aria-label={format(t.tutorial.goTo, { step: index + 1 })}
                  aria-current={index === step ? "step" : undefined}
                  className="flex size-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                      index === step ? "w-5 bg-ember" : "w-2 bg-gold/35"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setStep(previousStep)}
            disabled={step === 0}
            aria-hidden={step === 0 ? true : undefined}
            tabIndex={step === 0 ? -1 : undefined}
            className={`${DIALOG_SECONDARY} ${step === 0 ? "invisible" : ""}`}
          >
            {t.tutorial.back}
          </button>
          <button
            type="button"
            data-autofocus
            onClick={last ? onClose : () => setStep(nextStep)}
            className={`${DIALOG_PRIMARY} min-w-36`}
          >
            {last ? t.tutorial.finish : t.tutorial.next}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
