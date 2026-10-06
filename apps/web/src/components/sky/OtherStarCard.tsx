"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Petition } from "@/data/types";
import { useI18n } from "@/i18n/I18nProvider";
import { cardState, countLabel } from "./cardState";
import { FlagIcon, Ichthys, SpikedStar } from "./glyphs";
import { PaperCard } from "./PaperCard";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const ICON_BUTTON = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full btn-press text-ink-soft hover:text-ink ${FOCUS_RING}`;
const PRIMARY = `min-h-11 rounded-full btn-ember px-5 text-base font-medium disabled:opacity-60 ${FOCUS_RING}`;

/** How long the thanks stays before the card goes. */
const THANKS_MS = 3500;

/** What pressing the fish came to: the visitor is with the star, or the taps of a session have run out. */
export type AccompanyOutcome = "done" | "limited" | "failed";

type View = "details" | "reporting" | "thanks";

/**
 * Another person's star: what they wrote on paper, and nothing about them. The card has no words of its own: the
 * fish (the ichthys) says "I'm with you" and its count shows from one person on, a spiked star marks an answered
 * one, and a flag reports it. Only reporting, a safety feature, uses words. Screen readers hear everything through
 * labels.
 */
export function OtherStarCard({
  petition,
  star,
  scene,
  onClose,
  onAccompany,
  onReport,
}: {
  petition: Petition;
  star: { x: number; y: number };
  scene: { width: number; height: number };
  /** `refocus` is false when focus is already going somewhere else (tabbing out, a tap elsewhere). */
  onClose: (refocus: boolean) => void;
  onAccompany: () => Promise<AccompanyOutcome>;
  /** Reports it and hides its star: true when that was done. */
  onReport: () => Promise<boolean>;
}) {
  const { t, locale } = useI18n();
  const state = cardState(petition);
  const [view, setView] = useState<View>("details");
  const [working, setWorking] = useState(false);
  const [shake, setShake] = useState(0);
  const [spoken, setSpoken] = useState<string>();
  const textId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const flagRef = useRef<HTMLButtonElement>(null);
  const thanksRef = useRef<HTMLParagraphElement>(null);
  // Set when the report view is left, so focus lands on the flag instead of being lost with the button it was on.
  const restoreFocus = useRef(false);
  const timers = useRef(new Set<number>());
  const count = countLabel(locale, t.sky, state);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
    };
  }, []);

  // The thanks stays a moment, then the card goes (the star is already hidden).
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (view !== "thanks") return;
    const timer = window.setTimeout(() => close.current(true), THANKS_MS);
    return () => window.clearTimeout(timer);
  }, [view]);

  useEffect(() => {
    if (view === "reporting") confirmRef.current?.focus();
    if (view === "thanks") thanksRef.current?.focus();
    if (view === "details" && restoreFocus.current) {
      restoreFocus.current = false;
      flagRef.current?.focus();
    }
  }, [view]);

  const backToDetails = () => {
    restoreFocus.current = true;
    setView("details");
  };

  // Read out (and never shown): cleared first so the same line twice in a row is read twice.
  const say = (text: string) => {
    setSpoken(undefined);
    timers.current.add(window.setTimeout(() => setSpoken(text), 50));
  };

  const accompany = async () => {
    if (working || state.pressed) return;
    setWorking(true);
    try {
      const outcome = await onAccompany();
      // The fish gives a tiny shake (none with reduced motion, which the style takes care of) and a word to listen to.
      if (outcome === "limited") {
        setShake((n) => n + 1);
        say(t.sky.tooMany);
      } else if (outcome === "failed") {
        say(t.sky.failed);
      }
    } finally {
      setWorking(false);
    }
  };

  const report = async () => {
    if (working) return;
    setWorking(true);
    try {
      if (await onReport()) setView("thanks");
      else {
        backToDetails();
        say(t.sky.failed);
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <PaperCard
      petitionId={petition.id}
      star={star}
      scene={scene}
      label={t.sky.otherCardLabel}
      onClose={onClose}
    >
      <p id={textId} className="font-hand text-[1.65rem] leading-8 break-words text-ink">
        {state.answered && (
          <>
            <SpikedStar /> <span className="sr-only">{t.sky.answered}: </span>
          </>
        )}
        {petition.text}
      </p>
      {state.answered && state.note && (
        <p className="font-hand text-[1.5rem] leading-8 break-words text-ink">
          <span className="sr-only">{t.sky.answerFieldLabel} </span>
          {state.note}
        </p>
      )}

      {view === "details" && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={state.pressed}
              aria-label={t.sky.accompany}
              disabled={working}
              onClick={() => void accompany()}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full btn-press ${FOCUS_RING}`}
            >
              <span
                key={shake}
                className={shake ? "motion-safe:animate-[fish-shake_0.45s_ease-in-out]" : undefined}
              >
                <Ichthys pressed={state.pressed} />
              </span>
            </button>
            {state.showCount && (
              <>
                <span aria-hidden="true" className="text-base text-ink-soft tabular-nums">
                  {state.count}
                </span>
                <span className="sr-only">{count}</span>
              </>
            )}
          </div>
          <button
            ref={flagRef}
            type="button"
            aria-label={t.sky.report}
            aria-expanded={false}
            onClick={() => setView("reporting")}
            className={ICON_BUTTON}
          >
            <FlagIcon />
          </button>
        </div>
      )}

      {view === "reporting" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-ink">{t.sky.reportQuestion}</p>
          <div className="flex items-center gap-1">
            <button
              ref={confirmRef}
              type="button"
              disabled={working}
              onClick={() => void report()}
              className={PRIMARY}
            >
              {t.sky.reportConfirm}
            </button>
            <button
              type="button"
              aria-label={t.sky.report}
              aria-expanded={true}
              onClick={backToDetails}
              className={ICON_BUTTON}
            >
              <FlagIcon />
            </button>
          </div>
        </div>
      )}

      {view === "thanks" && (
        <p ref={thanksRef} tabIndex={-1} className="text-base text-ink outline-none">
          {t.sky.reportDone}
        </p>
      )}

      <p role="status" className="sr-only">
        {spoken}
      </p>
    </PaperCard>
  );
}
