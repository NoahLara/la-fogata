import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTriggers } from "./triggers";
import { QUEUE_LIMIT_MS, TRIGGER_DELAY_MS, type TriggerEvent } from "./triggerPolicy";

const open = {
  wordShowing: false,
  ritualRunning: false,
  dialogOpen: false,
  msSinceHelp: undefined as number | undefined,
};

function setup(unlimited = false) {
  const blockers = { ...open };
  const spoken: TriggerEvent[] = [];
  const triggers = createTriggers({
    unlimited,
    blockers: () => ({ ...blockers }),
    speak: (event) => {
      spoken.push(event);
      return true;
    },
  });
  return { blockers, spoken, triggers };
}

describe("createTriggers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("speaks about 1.5 s after the event", () => {
    const { spoken, triggers } = setup();
    triggers.notify("burden");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS - 1);
    expect(spoken).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(spoken).toEqual(["burden"]);
  });

  it("waits for a dialog to close and then speaks, without dropping it", () => {
    const { blockers, spoken, triggers } = setup();
    blockers.dialogOpen = true;
    triggers.notify("petition");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 5000);
    expect(spoken).toEqual([]);
    blockers.dialogOpen = false;
    vi.advanceTimersByTime(300);
    expect(spoken).toEqual(["petition"]);
  });

  it("waits for a word that is showing, or a ritual, to be over", () => {
    const { blockers, spoken, triggers } = setup();
    blockers.wordShowing = true;
    blockers.ritualRunning = true;
    triggers.notify("alone");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 2000);
    blockers.wordShowing = false;
    vi.advanceTimersByTime(1000);
    expect(spoken).toEqual([]);
    blockers.ritualRunning = false;
    vi.advanceTimersByTime(300);
    expect(spoken).toEqual(["alone"]);
  });

  it("lets a word go after waiting 10 s", () => {
    const { blockers, spoken, triggers } = setup();
    blockers.dialogOpen = true;
    triggers.notify("burden");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + QUEUE_LIMIT_MS + 500);
    blockers.dialogOpen = false;
    vi.advanceTimersByTime(5000);
    expect(spoken).toEqual([]);
  });

  it("answers each event once, separately, and ignores a repeat while one is on its way", () => {
    const { spoken, triggers } = setup();
    triggers.notify("burden");
    triggers.notify("burden");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 100);
    triggers.notify("burden");
    triggers.notify("petition");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 100);
    expect(spoken).toEqual(["burden", "petition"]);
  });

  it("answers every time when unlimited", () => {
    const { spoken, triggers } = setup(true);
    for (let i = 0; i < 3; i++) {
      triggers.notify("alone");
      vi.advanceTimersByTime(TRIGGER_DELAY_MS + 100);
    }
    expect(spoken).toEqual(["alone", "alone", "alone"]);
  });

  it("stays silent right after the help screen, even if it clears", () => {
    const { blockers, spoken, triggers } = setup();
    blockers.msSinceHelp = 0;
    triggers.notify("burden");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 2000);
    blockers.msSinceHelp = undefined;
    vi.advanceTimersByTime(5000);
    expect(spoken).toEqual([]);
  });

  it("keeps an event unanswered when it could not speak, so the next one tries again", () => {
    const attempts: TriggerEvent[] = [];
    const triggers = createTriggers({
      unlimited: false,
      blockers: () => ({ ...open }),
      speak: (event) => {
        attempts.push(event);
        return attempts.length > 1;
      },
    });
    triggers.notify("burden");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 100);
    triggers.notify("burden");
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 100);
    expect(attempts).toEqual(["burden", "burden"]);
  });

  it("stops everything when disposed", () => {
    const { spoken, triggers } = setup();
    triggers.notify("burden");
    triggers.dispose();
    vi.advanceTimersByTime(20_000);
    expect(spoken).toEqual([]);
  });
});
