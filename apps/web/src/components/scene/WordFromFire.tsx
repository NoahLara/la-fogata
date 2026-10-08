"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useServices } from "@/data/DataProvider";
import { createPausableTimer, type PausableTimer } from "@/fire/pausableTimer";
import { browserSeenStore, createWordBag, type WordBag } from "@/fire/wordBag";
import { createTriggers, type Triggers } from "@/fire/triggers";
import { TRIGGER_THEME, type TriggerEvent } from "@/fire/triggerPolicy";
import {
  contextualWordsFor,
  fullVerseNumber,
  textOf,
  verseNumber,
  wordsFor,
  type Word,
} from "@/fire/words";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene } from "@/scene/createScene";
import { prefersReducedMotion } from "@/scene/motion";
import { useSound } from "@/sound/SoundProvider";
import { useInteraction } from "./Interaction";

/** How long a word stays, not counting the time it is being read (hovered, focused or with its reference open). */
const SHOWN_MS = 10_000;
/** How long it takes to fade out, which also keeps the fire from being touched again too soon. */
const FADE_MS = 1000;
/** A beat between putting the word on the page and starting its rise, so the transition has a start to leave from. */
const APPEAR_DELAY_MS = 30;
/** Stars this close to the word (or its halo) are dimmed while it shows. */
const STAR_MARGIN = 32;

type Phase = "start" | "shown" | "out";

const SHADOW = "[text-shadow:0_0_6px_var(--color-night),0_0_16px_var(--color-night)]";

/** What the word looks like in each phase: it rises from the fire like smoke, settles, and fades where it is. */
function motionStyle(phase: Phase, rise: number, reduced: boolean): React.CSSProperties {
  if (reduced) {
    return { opacity: phase === "shown" ? 1 : 0, transition: "opacity 600ms ease" };
  }
  if (phase === "start") {
    return {
      opacity: 0,
      transform: `translateY(${rise}px) scale(0.92)`,
      filter: "blur(6px)",
    };
  }
  if (phase === "shown") {
    return {
      opacity: 1,
      transform: "none",
      filter: "blur(0)",
      transition:
        "opacity 900ms ease-out, transform 1200ms cubic-bezier(0.22, 0.8, 0.3, 1), filter 1200ms ease-out",
    };
  }
  return { opacity: 0, transition: `opacity ${FADE_MS}ms ease` };
}

/**
 * The fire as a button: an invisible target over the flames. Touching it flares the fire and a short word rises
 * from it, as real text floating in the sky above the trees. Only a tiny verse number shows; the full reference
 * and the translation notice appear when the visitor taps that number.
 */
export function WordFromFire({ scene }: { scene: FogataScene }) {
  const { t, locale } = useI18n();
  const { presence } = useServices();
  const sound = useSound();
  const { busy, announce, onFire, dialogState } = useInteraction();
  const [bounds, setBounds] = useState(() => scene.fireBounds());
  const [bottom, setBottom] = useState(() => scene.wordBottom());
  const [word, setWord] = useState<Word>();
  const [phase, setPhase] = useState<Phase>("start");
  const [reduced, setReduced] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // One bag per language: not every word exists in both, and each keeps track of what it has said.
  const bags = useRef<Record<string, WordBag>>({});
  const timer = useRef<PausableTimer | undefined>(undefined);
  const timeouts = useRef(new Set<number>());
  const leaving = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setBounds(scene.fireBounds());
      setBottom(scene.wordBottom());
    };
    update();
    return scene.onLayout(update);
  }, [scene]);

  const later = useCallback((action: () => void, ms: number) => {
    const handle = window.setTimeout(() => {
      timeouts.current.delete(handle);
      action();
    }, ms);
    timeouts.current.add(handle);
  }, []);

  useEffect(() => {
    const pending = timeouts.current;
    return () => {
      timer.current?.cancel();
      for (const handle of pending) window.clearTimeout(handle);
      pending.clear();
    };
  }, []);

  /** Fades the word out, and only then lets the fire be touched again. */
  const dismiss = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    timer.current?.cancel();
    setPhase("out");
    later(() => {
      setWord(undefined);
      setRevealed(false);
      setHovered(false);
      setFocused(false);
      leaving.current = false;
    }, FADE_MS);
  }, [later]);

  /** The next word of `pool`, never one already said until all have been; `key` names the bag that tracks that. */
  const draw = (pool: readonly Word[], key: string): { word: Word; text: string } | undefined => {
    if (pool.length === 0) return undefined;
    const bag = (bags.current[key] ??= createWordBag(
      pool.map((entry) => entry.id),
      browserSeenStore(key),
      Math.random,
    ));
    const id = bag.next();
    const picked = pool.find((entry) => entry.id === id);
    const pickedText = picked ? textOf(picked, locale) : undefined;
    return picked && pickedText !== undefined ? { word: picked, text: pickedText } : undefined;
  };

  /** Flares the fire and lets the word rise from it. */
  const present = ({ word: next, text: nextText }: { word: Word; text: string }) => {
    scene.touchFire();
    sound.play("fireWord");
    setReduced(prefersReducedMotion());
    setPhase("start");
    setWord(next);
    announce(nextText);
    later(() => setPhase("shown"), APPEAR_DELAY_MS);
    timer.current = createPausableTimer(SHOWN_MS, dismiss);
  };

  const listen = () => {
    if (word || busy) return;
    const next = draw(wordsFor(locale), locale);
    if (next) present(next);
  };

  // Something happened by the fire (a burden burned, a star settled, the visitor is alone): it answers with a word
  // of that kind, unless the way is blocked, in which case `createTriggers` waits and tries again. Tap-only words
  // (such as Rev 3:20) are left out of these.
  const speakRef = useRef<(event: TriggerEvent) => boolean>(() => false);
  const blockersRef = useRef({ word: false, busy: false });
  useEffect(() => {
    blockersRef.current = { word: word !== undefined, busy };
    speakRef.current = (event) => {
      if (blockersRef.current.word) return false;
      const theme = TRIGGER_THEME[event];
      const next = draw(
        contextualWordsFor(locale).filter((entry) => entry.theme === theme),
        `${locale}.${theme}`,
      );
      if (!next) return false;
      present(next);
      return true;
    };
  });
  const triggers = useRef<Triggers | undefined>(undefined);
  useEffect(() => {
    const created = createTriggers({
      blockers: () => {
        const dialog = dialogState();
        return {
          wordShowing: blockersRef.current.word,
          ritualRunning: blockersRef.current.busy,
          dialogOpen: dialog.open,
          msSinceHelp: dialog.msSinceHelp,
        };
      },
      speak: (event) => speakRef.current(event),
    });
    triggers.current = created;
    const stops = [
      onFire((event) => created.notify(event)),
      // Left alone: the others have gone and only the visitor is still there.
      presence.subscribe((event) => {
        if (event.type === "left" && presence.self && presence.people().length === 1) {
          created.notify("alone");
        }
      }),
    ];
    return () => {
      for (const stop of stops) stop();
      created.dispose();
    };
  }, [onFire, presence, dialogState]);

  // The word waits while it is being read.
  const reading = revealed || hovered || focused;
  useEffect(() => {
    if (reading) timer.current?.pause();
    else timer.current?.resume();
  }, [reading]);

  // Esc, or a tap anywhere else, lets it go.
  useEffect(() => {
    if (!word) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      dismiss();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [word, dismiss]);

  // Petition stars under the word are dimmed a little while it shows.
  const shown = word !== undefined && phase === "shown";
  useEffect(() => {
    const panel = panelRef.current;
    let overlaps = false;
    if (shown && panel) {
      // Layout offsets, so the rise's transform doesn't matter: this is where the word settles.
      const left = panel.offsetLeft - STAR_MARGIN;
      const top = panel.offsetTop - STAR_MARGIN;
      const right = panel.offsetLeft + panel.offsetWidth + STAR_MARGIN;
      const under = panel.offsetTop + panel.offsetHeight + STAR_MARGIN;
      for (const spot of scene.petitionSpots().values()) {
        if (spot.x >= left && spot.x <= right && spot.y >= top && spot.y <= under) overlaps = true;
      }
    }
    scene.dimPetitionStars(overlaps);
  }, [scene, shown, revealed, locale, word, bottom]);
  useEffect(() => () => scene.dimPetitionStars(false), [scene]);

  // Switching language while a word shows: one without a text in the new language lets go.
  const text = word ? textOf(word, locale) : undefined;
  useEffect(() => {
    if (word && text === undefined) dismiss();
  }, [word, text, dismiss]);

  const number = word ? verseNumber(word, locale) : "";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t.fire.listen}
        aria-disabled={busy || word !== undefined}
        onClick={listen}
        className="pointer-events-auto absolute cursor-pointer rounded-full bg-transparent focus-visible:shadow-focus focus-visible:outline-none"
        style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      />
      {word && text !== undefined && (
        <div
          className="absolute inset-x-0 top-0 flex items-end justify-center px-6"
          style={{ height: bottom }}
        >
          <div
            ref={panelRef}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="pointer-events-auto relative isolate flex max-w-xl flex-col items-center text-center"
            style={motionStyle(phase, Math.max(0, bounds.y - bottom), reduced)}
          >
            {/* A soft dark halo with no edge, so the words stay readable over the stars. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-night)_75%,transparent)_35%,transparent)] blur-md"
            />
            <p
              data-testid="fire-word"
              className={`font-title text-lg text-ember-soft italic sm:text-xl ${SHADOW}`}
            >
              {text}
            </p>
            <button
              type="button"
              aria-expanded={revealed}
              aria-label={format(revealed ? t.fire.hideReference : t.fire.showReference, {
                number,
              })}
              onClick={() => setRevealed((open) => !open)}
              className={`mt-1 min-h-6 min-w-6 cursor-pointer rounded-full px-2 text-xs text-ember-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${SHADOW}`}
            >
              {number}
            </button>
            {revealed && (
              <div className={`mt-1 space-y-1 text-xs text-ember-soft ${SHADOW}`}>
                <p>
                  {format(t.fire.reference, {
                    book: t.books[word.ref.book],
                    number: fullVerseNumber(word, locale),
                  })}
                </p>
                <p>{t.fire.notice}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
