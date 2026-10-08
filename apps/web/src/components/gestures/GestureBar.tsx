"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AFTERGLOW_SECONDS } from "@/burden/burden";
import { hasRiskSignals } from "@/burden/risk";
import { useServices } from "@/data/DataProvider";
import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene } from "@/scene/createScene";
import { HelpScreen } from "../help/HelpScreen";
import { BurdenDialog } from "./BurdenDialog";
import { BurdenIcon, PetitionIcon, WoodIcon } from "./icons";
import { PetitionDialog } from "./PetitionDialog";
import { PetitionLimit } from "./PetitionLimit";
import { useInteraction } from "../scene/Interaction";

type Dialog = "burden" | "petition" | "limit" | "help" | undefined;

const NOTICE_MS = 3000;
/** How long "Ya brilla en tu cielo." stays on screen. */
const STAR_AFTERGLOW_MS = 4000;

/** One round piece of the hearth: the wood in the middle is bigger and lit, the other two are dark wood. */
const GESTURE_BASE =
  "gesture group flex cursor-pointer flex-col items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold aria-disabled:cursor-default aria-disabled:opacity-60";
const GESTURE_SIZE = {
  main: "btn-ember size-16 -translate-y-2 min-[400px]:size-[4.5rem]",
  side: "btn-wood size-14 min-[400px]:size-16",
} as const;

function Gesture({
  name,
  icon,
  label,
  aria,
  onClick,
  disabled = false,
}: {
  /** What the button is, so focus can be given back to it. */
  name: Exclude<Dialog, undefined | "help" | "limit"> | "wood";
  icon: ReactNode;
  label: string;
  aria: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-gesture={name}
      aria-label={aria}
      aria-disabled={disabled}
      onClick={onClick}
      className={`${GESTURE_BASE} ${GESTURE_SIZE[name === "wood" ? "main" : "side"]}`}
    >
      <span className="gesture-icon">{icon}</span>
      {/* Below 400px only the icon shows; the aria-label says what it does. */}
      <span
        className="mt-0.5 hidden text-[0.7rem] leading-none font-medium tracking-wide min-[400px]:block"
        aria-hidden="true"
      >
        {label}
      </span>
    </button>
  );
}

/**
 * The three gestures, at the bottom of the scene, set in one wooden hearth: the burden and the petition on either
 * side and, lit and a little higher like a flame, the wood in the middle, which is what people reach for most often.
 */
export function GestureBar({ scene }: { scene: FogataScene }) {
  const { t } = useI18n();
  const { fire, presence, petitions } = useServices();
  const [dialog, setDialog] = useState<Dialog>();
  const [notice, setNotice] = useState<string>();
  // The soft line after a burden has burned or a petition has become a star.
  const [afterglow, setAfterglow] = useState<string>();
  // Nothing else can be done while a ritual runs, from pressing the button to sitting down again, or while a
  // star turns golden or goes back to the fire.
  const { busy: ritual, hold, message, notifyFire, reportDialog } = useInteraction();
  const releaseRitual = useRef<(() => void) | undefined>(undefined);
  const setRitual = useCallback(
    (on: boolean) => {
      if (on) releaseRitual.current ??= hold();
      else {
        releaseRitual.current?.();
        releaseRitual.current = undefined;
      }
    },
    [hold],
  );
  // Whether what was written had signs of risk. Only this is remembered, never the text.
  const atRisk = useRef(false);
  // The petition being raised, from when it is made until its star has settled; and which gesture opened the dialog.
  const pending = useRef<string | undefined>(undefined);
  const opener = useRef<"burden" | "petition">("petition");
  const groupRef = useRef<HTMLDivElement>(null);
  // A word on the petition sheet itself, since the page behind a modal can't be seen.
  const [sheetNotice, setSheetNotice] = useState<string>();
  // Which help screen to show: what was written was burned (a burden) or never left the screen (a petition).
  const [helpFor, setHelpFor] = useState<"burden" | "petition">("burden");
  const timers = useRef(new Set<number>());

  // The fire doesn't speak over a dialog, and stays quiet around the help screen.
  useEffect(() => {
    reportDialog("gestures", dialog === undefined ? "none" : dialog === "help" ? "help" : "dialog");
  }, [dialog, reportDialog]);
  useEffect(() => () => reportDialog("gestures", "none"), [reportDialog]);

  const later = useCallback((action: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      action();
    }, ms);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const say = useCallback(
    (text: string) => {
      setNotice(text);
      later(() => setNotice(undefined), NOTICE_MS);
    },
    [later],
  );

  const throwWood = async () => {
    if (ritual) return;
    const result = await fire.throwWood();
    if (result.status === "not-seated") say(t.gestures.notSeated);
  };

  /**
   * Called once with what was written, as it is handed over: it is only looked at for signs of risk, and only
   * that is remembered. Refuses (with a notice) when there is no seat to hand it over from yet.
   */
  const begin = (text: string): boolean => {
    const self = presence.self;
    if (!self) {
      say(t.gestures.notSeated);
      return false;
    }
    if (!scene.notePlacement(self.id)) {
      say(t.gestures.arriving);
      return false;
    }
    atRisk.current = hasRiskSignals(text);
    setRitual(true);
    return true;
  };

  /** Where the folded note should land: in the paws of the visitor's animal. */
  const target = () => {
    const self = presence.self;
    return self ? scene.notePlacement(self.id) : undefined;
  };

  /** The folded note is at the paws: the animal takes it to the fire. */
  const launch = (): boolean => {
    const self = presence.self;
    let risky = false;
    const result = self
      ? scene.handOverBurden(self.id, {
          onDone: () => {
            setRitual(false);
            setAfterglow(t.burden.afterglow);
            // Someone whose words showed signs of risk is shown the help screen next: the fire stays quiet.
            risky = atRisk.current;
            later(() => {
              setAfterglow(undefined);
              if (atRisk.current) {
                setHelpFor("burden");
                setDialog("help");
              }
              atRisk.current = false;
            }, AFTERGLOW_SECONDS * 1000);
          },
          // The word from the fire waits until the light has risen and the shooting star has gone: it never
          // lands on top of what is still to be seen.
          onSettled: () => {
            if (!risky) notifyFire("burden");
          },
        })
      : undefined;
    if (result?.status !== "burning") {
      say(t.gestures.arriving);
      return false;
    }
    return true;
  };

  const abort = () => {
    atRisk.current = false;
    setRitual(false);
  };

  /** Gives focus back to the gesture button that started it all. */
  const focusGesture = useCallback((name: "burden" | "petition") => {
    window.requestAnimationFrame(() =>
      groupRef.current?.querySelector<HTMLElement>(`[data-gesture="${name}"]`)?.focus(),
    );
  }, []);

  const close = () => {
    setDialog(undefined);
    focusGesture(opener.current);
  };

  const openPetition = async () => {
    if (ritual) return;
    opener.current = "petition";
    setSheetNotice(undefined);
    // Already left one today: a gentle word instead of the form.
    setDialog((await petitions.dailyLimitReached()) ? "limit" : "petition");
  };

  /**
   * Called once with what was written, as it is raised. Signs of risk are looked for here, in the browser, before
   * anything is made: the text goes nowhere and the help screen opens at once. Otherwise the petition is made now,
   * and its star waits for the ritual to end.
   */
  const raise = async (text: string): Promise<boolean> => {
    setSheetNotice(undefined);
    const self = presence.self;
    if (!self) {
      setSheetNotice(t.gestures.notSeated);
      return false;
    }
    if (hasRiskSignals(text)) {
      setHelpFor("petition");
      setDialog("help");
      return false;
    }
    if (!scene.notePlacement(self.id)) {
      setSheetNotice(t.gestures.arriving);
      return false;
    }
    const result = await petitions.create(text);
    if (result.status === "daily-limit") {
      setDialog("limit");
      return false;
    }
    if (result.status !== "created") return false;
    pending.current = result.petition.id;
    setRitual(true);
    return true;
  };

  /** The folded note is at the paws: the animal takes it to the fire, and its light becomes a star. */
  const launchPetition = (): boolean => {
    const self = presence.self;
    const petitionId = pending.current;
    const result =
      self && petitionId
        ? scene.offerPetition(self.id, {
            petitionId,
            onDone: () => {
              pending.current = undefined;
              setRitual(false);
              setAfterglow(t.petition.afterglow);
              notifyFire("petition");
              focusGesture("petition");
              later(() => setAfterglow(undefined), STAR_AFTERGLOW_MS);
            },
          })
        : undefined;
    if (result?.status !== "burning") {
      say(t.gestures.arriving);
      return false;
    }
    return true;
  };

  /** The ritual could not finish: the petition was made all the same, so its star simply appears. */
  const abortPetition = () => {
    if (pending.current) scene.setPetitionStars([{ id: pending.current, answered: false }]);
    pending.current = undefined;
    setRitual(false);
  };

  return (
    <>
      <div
        ref={groupRef}
        role="group"
        aria-label={t.gestures.groupLabel}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="hearth-dock pointer-events-auto">
          <Gesture
            name="burden"
            icon={<BurdenIcon />}
            label={t.gestures.burden.label}
            aria={t.gestures.burden.aria}
            onClick={() => {
              if (ritual) return;
              opener.current = "burden";
              setDialog("burden");
            }}
            disabled={ritual}
          />
          <Gesture
            name="wood"
            icon={<WoodIcon />}
            label={t.gestures.wood.label}
            aria={t.gestures.wood.aria}
            onClick={throwWood}
            disabled={ritual}
          />
          <Gesture
            name="petition"
            icon={<PetitionIcon />}
            label={t.gestures.petition.label}
            aria={t.gestures.petition.aria}
            onClick={openPetition}
            disabled={ritual}
          />
        </div>
      </div>
      {/* One polite live region for notices and for the line after a burden burns. */}
      <p
        role="status"
        className={`pointer-events-none absolute inset-x-0 bottom-20 z-10 px-6 text-center text-base text-gold transition-opacity duration-1000 motion-reduce:transition-none ${
          afterglow || notice || message ? "opacity-100" : "opacity-0"
        }`}
      >
        {afterglow ?? notice ?? message}
      </p>
      {dialog === "burden" && (
        <BurdenDialog
          onSubmit={begin}
          getTarget={target}
          onLaunch={launch}
          onAbort={abort}
          onClose={close}
        />
      )}
      {dialog === "petition" && (
        <PetitionDialog
          notice={sheetNotice}
          onSubmit={raise}
          getTarget={target}
          onLaunch={launchPetition}
          onAbort={abortPetition}
          onClose={close}
        />
      )}
      {dialog === "limit" && <PetitionLimit onClose={close} />}
      {dialog === "help" && <HelpScreen kind={helpFor} onClose={close} />}
    </>
  );
}
