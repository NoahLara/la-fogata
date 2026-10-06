"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  applyTextSize,
  DEFAULT_PREFERENCES,
  readPreferences,
  saveAnimal,
  saveCrackle,
  saveMusic,
  saveSound,
  saveTextSize,
  type AnimalChoice,
  type Preferences,
  type TextSize,
} from "./preferences";
import { clampTrim, CRACKLE_DEFAULT, MUSIC_DEFAULT } from "@/sound/volumeTrim";

interface Settings extends Preferences {
  /** The saved choices have been read from the browser. Before that, the defaults stand in. */
  ready: boolean;
  setAnimal: (animal: AnimalChoice) => void;
  setTextSize: (size: TextSize) => void;
  setSound: (sound: boolean) => void;
  setCrackle: (level: number) => void;
  setMusic: (level: number) => void;
}

const SettingsContext = createContext<Settings | undefined>(undefined);

/** The saved choices, read from the browser once and then kept here; React follows it with `useSyncExternalStore`. */
let current: Preferences | undefined;
const listeners = new Set<() => void>();

function snapshot(): Preferences {
  return (current ??= readPreferences());
}
function update(change: Partial<Preferences>) {
  current = { ...snapshot(), ...change };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
/** Forgets what was read, so the next read goes back to the browser's storage. For tests. */
export function resetSettingsStore() {
  current = undefined;
  listeners.forEach((listener) => listener());
}
const noSubscription = () => () => {};

/**
 * The visitor's settings. They live in the browser only (localStorage), so the server renders the defaults and
 * the saved choices arrive once the page is up; `ready` tells when.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const preferences = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PREFERENCES);
  const ready = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (ready) applyTextSize(preferences.textSize);
  }, [ready, preferences.textSize]);

  const setAnimal = useCallback((animal: AnimalChoice) => {
    saveAnimal(animal);
    update({ animal });
  }, []);
  const setTextSize = useCallback((textSize: TextSize) => {
    saveTextSize(textSize);
    update({ textSize });
  }, []);
  const setSound = useCallback((sound: boolean) => {
    saveSound(sound);
    update({ sound });
  }, []);
  const setCrackle = useCallback((level: number) => {
    saveCrackle(level);
    update({ crackle: clampTrim(level, CRACKLE_DEFAULT) });
  }, []);
  const setMusic = useCallback((level: number) => {
    saveMusic(level);
    update({ music: clampTrim(level, MUSIC_DEFAULT) });
  }, []);

  const value = useMemo(
    () => ({
      ...preferences,
      ready,
      setAnimal,
      setTextSize,
      setSound,
      setCrackle,
      setMusic,
    }),
    [preferences, ready, setAnimal, setTextSize, setSound, setCrackle, setMusic],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside a SettingsProvider");
  return value;
}
