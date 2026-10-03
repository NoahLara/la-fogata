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
  saveTextSize,
  saveVisited,
  type AnimalChoice,
  type Preferences,
  type TextSize,
} from "./preferences";

interface Settings extends Preferences {
  /** The saved choices have been read from the browser. Before that, the defaults stand in. */
  ready: boolean;
  setAnimal: (animal: AnimalChoice) => void;
  setTextSize: (size: TextSize) => void;
  /** The visitor has sat by the fire: from now on they get the short welcome. */
  markVisited: () => void;
}

const SettingsContext = createContext<Settings | undefined>(undefined);

/**
 * The visitor's settings. They live in the browser only (localStorage), so the server renders the defaults and
 * the saved choices are read once the page is up; `ready` tells when.
 */
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
  const markVisited = useCallback(() => {
    saveVisited();
    update({ visited: true });
  }, []);

  const value = useMemo(
    () => ({ ...preferences, ready, setAnimal, setTextSize, markVisited }),
    [preferences, ready, setAnimal, setTextSize, markVisited],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside a SettingsProvider");
  return value;
}
