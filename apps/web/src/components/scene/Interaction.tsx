"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Emitter } from "@/data/emitter";
import type { TriggerEvent } from "@/fire/triggerPolicy";

/** How long a word under the scene stays before it fades. */
const MESSAGE_MS = 4000;

interface Interaction {
  /** Something is animating (a ritual, a star answered or going back to the fire): the gestures wait. */
  busy: boolean;
  /** Marks the start of something that must finish before anything else starts; call the result when it has. */
  hold: () => () => void;
  /** A line shown, and said aloud, under the scene for a few seconds. */
  message: string | undefined;
  say: (text: string) => void;
  /** Said aloud only, for something already shown on the page. */
  announce: (text: string) => void;
  /** Something happened that the fire may answer with a word: a burden burned, a star settled, or being alone. */
  notifyFire: (event: TriggerEvent) => void;
  /** Hears `notifyFire`. Returns a way to stop. */
  onFire: (listener: (event: TriggerEvent) => void) => () => void;
  /** Tells what is open over the scene (a dialog or the help screen), so the fire doesn't speak over it. */
  reportDialog: (source: string, state: "none" | "dialog" | "help") => void;
  /** What is open now, and how long ago the help screen was last on screen (0 while it is). */
  dialogState: () => { open: boolean; msSinceHelp: number | undefined };
}

const InteractionContext = createContext<Interaction | undefined>(undefined);

/** What the gesture bar and the petition stars share: whether an animation is running, and the line under the scene. */
export function InteractionProvider({ children }: { children: ReactNode }) {
  const [holds, setHolds] = useState(0);
  const [message, setMessage] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const announceTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(announceTimer.current);
    },
    [],
  );

  const hold = useCallback(() => {
    let released = false;
    setHolds((count) => count + 1);
    return () => {
      if (released) return;
      released = true;
      setHolds((count) => count - 1);
    };
  }, []);

  const say = useCallback((text: string) => {
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(undefined), MESSAGE_MS);
  }, []);

  // Cleared first, so the same line twice in a row is read twice.
  const announce = useCallback((text: string) => {
    setAnnouncement("");
    window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => setAnnouncement(text), 50);
  }, []);

  const fireEvents = useRef(new Emitter<TriggerEvent>());
  const notifyFire = useCallback((event: TriggerEvent) => fireEvents.current.emit(event), []);
  const onFire = useCallback(
    (listener: (event: TriggerEvent) => void) => fireEvents.current.subscribe(listener),
    [],
  );

  // What is open over the scene, by who reports it, and when the help screen last closed.
  const dialogs = useRef(new Map<string, "dialog" | "help">());
  const helpClosedAt = useRef<number | undefined>(undefined);
  const reportDialog = useCallback((source: string, state: "none" | "dialog" | "help") => {
    const before = dialogs.current.get(source);
    if (state === "none") dialogs.current.delete(source);
    else dialogs.current.set(source, state);
    if (before === "help" && state !== "help") helpClosedAt.current = Date.now();
  }, []);
  const dialogState = useCallback(() => {
    const helpOpen = [...dialogs.current.values()].includes("help");
    const closedAt = helpClosedAt.current;
    return {
      open: dialogs.current.size > 0,
      msSinceHelp: helpOpen ? 0 : closedAt === undefined ? undefined : Date.now() - closedAt,
    };
  }, []);

  const value = useMemo(
    () => ({
      busy: holds > 0,
      hold,
      message,
      say,
      announce,
      notifyFire,
      onFire,
      reportDialog,
      dialogState,
    }),
    [holds, hold, message, say, announce, notifyFire, onFire, reportDialog, dialogState],
  );
  return (
    <InteractionContext.Provider value={value}>
      {children}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </InteractionContext.Provider>
  );
}

export function useInteraction(): Interaction {
  const value = useContext(InteractionContext);
  if (!value) throw new Error("useInteraction must be used inside an InteractionProvider");
  return value;
}
