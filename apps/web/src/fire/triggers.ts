import {
  decideTrigger,
  QUEUE_LIMIT_MS,
  TRIGGER_DELAY_MS,
  type TriggerEvent,
  type TriggerState,
} from "./triggerPolicy";

/** How often a word that is waiting looks again to see if the way is clear. */
const RECHECK_MS = 200;

type Blockers = Omit<TriggerState, "fired" | "unlimited">;

interface Options {
  /** Development (`?demo`): no limit. */
  unlimited: boolean;
  /** What is going on over the scene right now. */
  blockers(): Blockers;
  /** Says a word for this event. Returns false if it could not (so the event stays unanswered). */
  speak(event: TriggerEvent): boolean;
}

export interface Triggers {
  /** Something happened by the fire. The word comes after a short while, or waits if something is in the way. */
  notify(event: TriggerEvent): void;
  dispose(): void;
}

/**
 * Answers things that happen by the fire with a word, using `decideTrigger`. Kept in memory only: each event is
 * answered at most once per page load, so a reload starts fresh.
 */
export function createTriggers(options: Options): Triggers {
  const fired = new Set<TriggerEvent>();
  const pending = new Set<TriggerEvent>();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const later = (action: () => void, ms: number) => {
    const handle = setTimeout(() => {
      timers.delete(handle);
      action();
    }, ms);
    timers.add(handle);
    return handle;
  };

  const decide = (event: TriggerEvent) =>
    decideTrigger(event, { ...options.blockers(), fired, unlimited: options.unlimited });

  /** Tries now; if something is in the way, tries again until it clears or the limit passes. */
  const attempt = (event: TriggerEvent, waited: number) => {
    const decision = decide(event);
    if (decision === "show") {
      pending.delete(event);
      if (options.speak(event)) fired.add(event);
      return;
    }
    if (decision === "skip" || waited >= QUEUE_LIMIT_MS) {
      pending.delete(event);
      return;
    }
    later(() => attempt(event, waited + RECHECK_MS), RECHECK_MS);
  };

  return {
    notify(event) {
      // One of the same kind is already on its way: a second would only repeat it.
      if (pending.has(event)) return;
      pending.add(event);
      later(() => attempt(event, 0), TRIGGER_DELAY_MS);
    },
    dispose() {
      for (const handle of timers) clearTimeout(handle);
      timers.clear();
      pending.clear();
    },
  };
}
