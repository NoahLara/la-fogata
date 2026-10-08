import { describe, expect, it } from "vitest";
import { decideTrigger, HELP_QUIET_MS, TRIGGER_THEME, type TriggerState } from "./triggerPolicy";

const clear: TriggerState = {
  fired: new Set(),
  wordShowing: false,
  ritualRunning: false,
  dialogOpen: false,
  msSinceHelp: undefined,
};

describe("decideTrigger", () => {
  it("shows right away when nothing is in the way", () => {
    expect(decideTrigger("burden", clear)).toBe("show");
    expect(decideTrigger("petition", clear)).toBe("show");
    expect(decideTrigger("alone", clear)).toBe("show");
  });

  it.each([
    ["a word is showing", { wordShowing: true }],
    ["a ritual is running", { ritualRunning: true }],
    ["a dialog is open", { dialogOpen: true }],
  ])("waits when %s", (_, blocked) => {
    expect(decideTrigger("burden", { ...clear, ...blocked })).toBe("queue");
  });

  it("is answered once per page load, each event on its own", () => {
    const fired = new Set(["burden" as const]);
    expect(decideTrigger("burden", { ...clear, fired })).toBe("skip");
    expect(decideTrigger("petition", { ...clear, fired })).toBe("show");
    expect(decideTrigger("alone", { ...clear, fired })).toBe("show");
  });

  it("stays silent at and soon after the help screen, rather than waiting", () => {
    expect(decideTrigger("burden", { ...clear, msSinceHelp: 0 })).toBe("skip");
    expect(decideTrigger("burden", { ...clear, msSinceHelp: HELP_QUIET_MS - 1 })).toBe("skip");
    expect(decideTrigger("burden", { ...clear, msSinceHelp: HELP_QUIET_MS })).toBe("show");
  });

  it("puts the help screen before anything else", () => {
    expect(decideTrigger("burden", { ...clear, msSinceHelp: 0, wordShowing: true })).toBe("skip");
    expect(
      decideTrigger("burden", { ...clear, fired: new Set(["burden"]), wordShowing: true }),
    ).toBe("skip");
  });

  it("answers a burden with rest, a petition with asking, and being alone with presence", () => {
    expect(TRIGGER_THEME).toEqual({ burden: "rest", petition: "asking", alone: "presence" });
  });
});
