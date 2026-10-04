import { describe, expect, it } from "vitest";
import { Announcements, ANNOUNCE_WINDOW_MS } from "./announcements";

function setup(people = { count: 3 }) {
  let now = 0;
  const said: string[] = [];
  const timers: { at: number; callback: () => void; cancelled: boolean }[] = [];
  const announcements = new Announcements({
    now: () => now,
    later: (callback, ms) => {
      const timer = { at: now + ms, callback, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    say: (text) => said.push(text),
    line: (kind) => (kind === "joined" ? "joined" : "left"),
    summary: (count) => `now ${count}`,
    people: () => people.count,
  });
  /** Moves the clock, running the timers that come due, in order. */
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = timers
        .filter((timer) => !timer.cancelled && timer.at <= end)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      due.cancelled = true;
      now = due.at;
      due.callback();
    }
    now = end;
  };
  return { announcements, said, advance, people };
}

describe("Announcements", () => {
  it("says the first change at once", () => {
    const { announcements, said } = setup();
    announcements.notify("joined");
    expect(said).toEqual(["joined"]);
  });

  it("does not repeat inside the window, but says one summary when it ends", () => {
    const { announcements, said, advance, people } = setup();
    announcements.notify("joined");
    advance(2000);
    announcements.notify("joined");
    advance(2000);
    announcements.notify("left");
    people.count = 4;
    expect(said).toEqual(["joined"]);
    advance(ANNOUNCE_WINDOW_MS);
    expect(said).toEqual(["joined", "now 4"]);
  });

  it("says one summary however many changes were held, at the end of the window", () => {
    const { announcements, said, advance } = setup();
    announcements.notify("joined");
    for (let i = 0; i < 5; i++) {
      advance(1000);
      announcements.notify(i % 2 ? "joined" : "left");
    }
    advance(ANNOUNCE_WINDOW_MS - 5000 - 1);
    expect(said).toHaveLength(1);
    advance(1);
    expect(said).toEqual(["joined", "now 3"]);
  });

  it("says nothing more when nothing was held", () => {
    const { announcements, said, advance } = setup();
    announcements.notify("joined");
    advance(ANNOUNCE_WINDOW_MS * 3);
    expect(said).toEqual(["joined"]);
  });

  it("the summary starts a new window of its own", () => {
    const { announcements, said, advance } = setup();
    announcements.notify("joined");
    advance(1000);
    announcements.notify("left");
    advance(ANNOUNCE_WINDOW_MS);
    expect(said).toEqual(["joined", "now 3"]);
    announcements.notify("joined");
    expect(said).toHaveLength(2);
    advance(ANNOUNCE_WINDOW_MS);
    expect(said).toEqual(["joined", "now 3", "now 3"]);
  });

  it("speaks a new change at once once the window has passed", () => {
    const { announcements, said, advance } = setup();
    announcements.notify("joined");
    advance(ANNOUNCE_WINDOW_MS);
    announcements.notify("left");
    expect(said).toEqual(["joined", "left"]);
  });

  it("holds nothing back after it is disposed", () => {
    const { announcements, said, advance } = setup();
    announcements.notify("joined");
    announcements.notify("left");
    announcements.dispose();
    advance(ANNOUNCE_WINDOW_MS * 2);
    expect(said).toEqual(["joined"]);
  });
});
