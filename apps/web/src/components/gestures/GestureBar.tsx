"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AFTERGLOW_SECONDS } from "@/burden/burden";
import { hasRiskSignals } from "@/burden/risk";
import { useServices } from "@/data/DataProvider";
import { es } from "@/i18n/es";
import type { FogataScene } from "@/scene/createScene";
import { HelpScreen } from "../help/HelpScreen";
import { BurdenDialog } from "./BurdenDialog";
import { BurdenIcon, PetitionIcon, WoodIcon } from "./icons";
import { PetitionPlaceholder } from "./PetitionPlaceholder";

type Dialog = "burden" | "petition" | "help" | undefined;

const NOTICE_MS = 3000;

const GESTURE =
  "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-bark/90 px-4 text-sm text-gold ring-1 ring-ember/50 hover:bg-ember/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold aria-disabled:opacity-50";

function Gesture({
  icon,
  label,
  aria,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  aria: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      aria-disabled={disabled}
      onClick={onClick}
      className={GESTURE}
    >
      {icon}
      {/* Below 400px only the icon shows; the aria-label says what it does. */}
      <span className="hidden min-[400px]:inline" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

/** The three gestures, at the bottom of the scene: throw wood, hand over a burden, leave a petition. */
export function GestureBar({ scene }: { scene: FogataScene }) {
  const { fire, presence } = useServices();
  const [dialog, setDialog] = useState<Dialog>();
  const [notice, setNotice] = useState<string>();
  // The soft line after a burden has burned.
  const [afterglow, setAfterglow] = useState(false);
  // The whole ritual of a burden, from pressing the button to sitting down again: nothing else can be done.
  const [ritual, setRitual] = useState(false);
  // Whether what was written had signs of risk. Only this is remembered, never the text.
  const atRisk = useRef(false);
  const [cooling, setCooling] = useState(false);
  const timers = useRef(new Set<number>());

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

  // Dims the wood button while the visitor has to wait.
  useEffect(() => {
    const interval = window.setInterval(() => setCooling(fire.woodCooldown() > 0), 1000);
    return () => window.clearInterval(interval);
  }, [fire]);

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
    if (result.status === "cooling") {
      say(es.gestures.woodCooling.replace("{seconds}", String(Math.ceil(result.secondsLeft))));
    } else if (result.status === "not-seated") say(es.gestures.notSeated);
    else setCooling(true);
  };

  /**
   * Called once with what was written, as it is handed over: it is only looked at for signs of risk, and only
   * that is remembered. Refuses (with a notice) when there is no seat to hand it over from yet.
   */
  const begin = (text: string): boolean => {
    const self = presence.self;
    if (!self) {
      say(es.gestures.notSeated);
      return false;
    }
    if (!scene.notePlacement(self.id)) {
      say(es.gestures.arriving);
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
    const result = self
      ? scene.handOverBurden(self.id, {
          onDone: () => {
            setRitual(false);
            setAfterglow(true);
            later(() => {
              setAfterglow(false);
              if (atRisk.current) setDialog("help");
              atRisk.current = false;
            }, AFTERGLOW_SECONDS * 1000);
          },
        })
      : undefined;
    if (result?.status !== "burning") {
      say(es.gestures.arriving);
      return false;
    }
    return true;
  };

  const abort = () => {
    atRisk.current = false;
    setRitual(false);
  };

  const close = () => setDialog(undefined);

  return (
    <>
      <div
        role="group"
        aria-label={es.gestures.groupLabel}
        className="absolute inset-x-0 bottom-0 z-10 flex justify-center gap-2 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <Gesture
          icon={<WoodIcon />}
          label={es.gestures.wood.label}
          aria={es.gestures.wood.aria}
          onClick={throwWood}
          disabled={cooling || ritual}
        />
        <Gesture
          icon={<BurdenIcon />}
          label={es.gestures.burden.label}
          aria={es.gestures.burden.aria}
          onClick={() => !ritual && setDialog("burden")}
          disabled={ritual}
        />
        <Gesture
          icon={<PetitionIcon />}
          label={es.gestures.petition.label}
          aria={es.gestures.petition.aria}
          onClick={() => !ritual && setDialog("petition")}
          disabled={ritual}
        />
      </div>
      {/* One polite live region for notices and for the line after a burden burns. */}
      <p
        role="status"
        className={`pointer-events-none absolute inset-x-0 bottom-20 z-10 px-6 text-center text-base text-gold transition-opacity duration-1000 motion-reduce:transition-none ${
          afterglow || notice ? "opacity-100" : "opacity-0"
        }`}
      >
        {afterglow ? es.burden.afterglow : notice}
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
      {dialog === "petition" && <PetitionPlaceholder onClose={close} />}
      {dialog === "help" && <HelpScreen onClose={close} />}
    </>
  );
}
