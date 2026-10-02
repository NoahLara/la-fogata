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
}

const InteractionContext = createContext<Interaction | undefined>(undefined);

/** What the gesture bar and the petition stars share: whether an animation is running, and the line under the scene. */
export function InteractionProvider({ children }: { children: ReactNode }) {
  const [holds, setHolds] = useState(0);
  const [message, setMessage] = useState<string>();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

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

  const value = useMemo(
    () => ({ busy: holds > 0, hold, message, say }),
    [holds, hold, message, say],
  );
  return <InteractionContext.Provider value={value}>{children}</InteractionContext.Provider>;
}

export function useInteraction(): Interaction {
  const value = useContext(InteractionContext);
  if (!value) throw new Error("useInteraction must be used inside an InteractionProvider");
  return value;
}
