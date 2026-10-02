import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPausableTimer } from "./pausableTimer";

describe("createPausableTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls back once after its time", () => {
    const done = vi.fn();
    createPausableTimer(1000, done);
    vi.advanceTimersByTime(999);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(5000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("does not count the time it was paused", () => {
    const done = vi.fn();
    const timer = createPausableTimer(1000, done);
    vi.advanceTimersByTime(400);
    timer.pause();
    vi.advanceTimersByTime(10_000);
    expect(done).not.toHaveBeenCalled();
    timer.resume();
    vi.advanceTimersByTime(599);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("ignores a second pause or resume", () => {
    const done = vi.fn();
    const timer = createPausableTimer(1000, done);
    timer.resume();
    vi.advanceTimersByTime(300);
    timer.pause();
    timer.pause();
    vi.advanceTimersByTime(5000);
    timer.resume();
    timer.resume();
    vi.advanceTimersByTime(700);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("never calls back once cancelled", () => {
    const done = vi.fn();
    const timer = createPausableTimer(1000, done);
    timer.cancel();
    timer.resume();
    vi.advanceTimersByTime(5000);
    expect(done).not.toHaveBeenCalled();
  });
});
