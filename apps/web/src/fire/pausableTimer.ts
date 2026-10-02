/** A timeout that can be paused and resumed, and keeps the time it had left. */
export interface PausableTimer {
  pause(): void;
  resume(): void;
  cancel(): void;
}

/** Starts running at once. `onDone` is called once, after `ms` of running time (pauses do not count). */
export function createPausableTimer(ms: number, onDone: () => void): PausableTimer {
  let left = ms;
  let startedAt = 0;
  let handle: ReturnType<typeof setTimeout> | undefined;
  let finished = false;

  const run = () => {
    startedAt = Date.now();
    handle = setTimeout(() => {
      handle = undefined;
      finished = true;
      onDone();
    }, left);
  };
  run();

  return {
    pause() {
      if (handle === undefined) return;
      clearTimeout(handle);
      handle = undefined;
      left = Math.max(0, left - (Date.now() - startedAt));
    },
    resume() {
      if (handle !== undefined || finished) return;
      run();
    },
    cancel() {
      if (handle !== undefined) clearTimeout(handle);
      handle = undefined;
      finished = true;
    },
  };
}
