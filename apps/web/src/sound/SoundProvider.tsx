"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useServices } from "@/data/DataProvider";
import { useSettings } from "@/preferences/SettingsProvider";
import type { FogataScene } from "@/scene/createScene";
import { createSoundEngine } from "./engine";
import type { SoundEvent } from "./soundEvents";

/** Marks something a visitor may press without that press starting the sound (the gear that opens the settings). */
export const NO_AUDIO_UNLOCK = "data-no-audio-unlock";

interface Sound {
  /** Turns sound on or off, saved. Call it straight from the press, so turning it on counts as the gesture. */
  setEnabled: (enabled: boolean) => void;
  play: (event: SoundEvent) => void;
}

const silent: Sound = { setEnabled: () => {}, play: () => {} };
const SoundContext = createContext<Sound>(silent);

/** The events a browser counts as the visitor having touched the page, so that it lets sound start. */
const GESTURES = ["pointerup", "click", "touchend", "keydown"] as const;

/** Whether a gesture happened somewhere that must not start the sound: inside a dialog (the settings, the card). */
function isExempt(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`dialog, [${NO_AUDIO_UNLOCK}]`) !== null;
}

/**
 * The soundscape, tied to the page: it starts on the first user gesture (a press or a key anywhere outside a dialog), follows the sound setting, rests while the tab is hidden, and follows the
 * scene's events and how many people sit by the fire. Without it, everything here is silent.
 */
export function SoundProvider({ scene, children }: { scene: FogataScene; children: ReactNode }) {
  const { presence } = useServices();
  const { sound, crackle, music, ready, setSound } = useSettings();
  const [engine] = useState(() => createSoundEngine());

  useEffect(() => () => engine.destroy(), [engine]);

  // Nothing is on until the saved choice has been read.
  useEffect(() => {
    if (ready) engine.setEnabled(sound);
  }, [engine, ready, sound]);

  useEffect(() => {
    if (ready) engine.setCrackle(crackle);
  }, [engine, ready, crackle]);

  useEffect(() => {
    if (ready) engine.setMusic(music);
  }, [engine, ready, music]);

  // The sound starts as soon as the page is ready, where the browser lets it. Where it doesn't (most first visits),
  // the first press, tap or key outside a dialog starts it: those are the events browsers count as the visitor
  // touching the page (a finger going down is not one; lifting it is). A press in the settings doesn't count, so if
  // the first thing someone does is turn the sound off, it never played.
  useEffect(() => {
    if (!ready || !sound) return;
    let stopped = false;
    const stop = () => {
      stopped = true;
      for (const type of GESTURES) document.removeEventListener(type, onGesture, true);
    };
    const onGesture = (event: Event) => {
      if (isExempt(event.target)) return;
      void engine.start().then((running) => {
        if (running && !stopped) stop();
      });
    };
    void engine.start().then((running) => {
      if (running && !stopped) stop();
    });
    for (const type of GESTURES) document.addEventListener(type, onGesture, true);
    return stop;
  }, [engine, ready, sound]);

  useEffect(() => {
    const onVisibility = () => (document.hidden ? engine.suspend() : engine.resume());
    document.addEventListener("visibilitychange", onVisibility);
    if (document.hidden) engine.suspend();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [engine]);

  useEffect(() => {
    engine.setPeople(presence.people().length);
    return presence.subscribe(() => engine.setPeople(presence.people().length));
  }, [engine, presence]);

  useEffect(() => scene.onSound((event) => engine.play(event)), [engine, scene]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      engine.setEnabled(enabled);
      if (enabled) void engine.start();
      setSound(enabled);
    },
    [engine, setSound],
  );
  const play = useCallback((event: SoundEvent) => engine.play(event), [engine]);

  const value = useMemo(() => ({ setEnabled, play }), [setEnabled, play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/** The sound, or silence where there is no provider (tests, the server). */
export function useSound(): Sound {
  return useContext(SoundContext);
}
