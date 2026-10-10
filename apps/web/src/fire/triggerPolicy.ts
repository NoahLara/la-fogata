import type { WordTheme } from "./words";

/** Things that happen by the fire that it may answer with a word. */
export type TriggerEvent = "burden" | "petition" | "alone";

/** What each one is answered with. */
export const TRIGGER_THEME: Record<TriggerEvent, WordTheme> = {
  burden: "rest",
  petition: "asking",
  alone: "presence",
};

/** How long after the event the word comes, so it does not land on top of the ritual that has just ended. */
export const TRIGGER_DELAY_MS = 1500;
/** How long a word that had to wait keeps waiting for the way to clear before it is let go. */
export const QUEUE_LIMIT_MS = 10_000;
/** How long after the help screen the fire stays quiet. */
export const HELP_QUIET_MS = 60_000;

/** What is going on over the scene right now. */
export interface TriggerState {
  /** Events that have already been answered since the page loaded. */
  fired: ReadonlySet<TriggerEvent>;
  /** A word is on the page, or still fading out. */
  wordShowing: boolean;
  /** A ritual is running, or a star is turning golden or going back to the fire. */
  ritualRunning: boolean;
  /** A dialog or sheet is open over the scene. */
  dialogOpen: boolean;
  /** Time since the help screen was last on screen (0 while it is); undefined if it hasn't been. */
  msSinceHelp: number | undefined;
}

export type TriggerDecision = "show" | "queue" | "skip";

/**
 * Whether the fire speaks now, waits for the way to clear, or stays silent:
 * - an event is answered once per page load;
 * - never at or soon after the help screen: that moment belongs to the person, and waiting would only land the word later;
 * - while something else is going on it waits, and is shown as soon as that is over.
 */
export function decideTrigger(event: TriggerEvent, state: TriggerState): TriggerDecision {
  if (state.fired.has(event)) return "skip";
  if (state.msSinceHelp !== undefined && state.msSinceHelp < HELP_QUIET_MS) return "skip";
  if (state.wordShowing || state.ritualRunning || state.dialogOpen) return "queue";
  return "show";
}
