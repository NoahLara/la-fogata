/** The resolutions the scene steps down through when the device can't keep up: sharpest first. */
const STEPS = [2, 1.5, 1] as const;

/** The next lower resolution than `current`, or nothing when it is already the lowest. */
export function nextResolution(current: number): number | undefined {
  return STEPS.find((step) => step < current - 0.01);
}

interface Options {
  /** A sustained average frame time above this (in ms) means the scene is too heavy for the device: 28 ms is under 36 fps. */
  slowMs?: number;
  /** How many frames the average is taken over. */
  window?: number;
  /** Frames ignored at the start and after every change, while things settle (textures upload, the fire warms up). */
  warmup?: number;
}

/**
 * Watches how long frames take and asks for a lower resolution when they are sustainedly slow. It only ever
 * steps down, and never on a hiccup: a frame over half a second (a stall, a tab that was hidden) isn't counted,
 * and a change needs a whole window of slow frames. Fast devices never see it act. Pure: it only knows the
 * numbers it is given.
 */
export function createQualityGovernor({ slowMs = 28, window = 60, warmup = 120 }: Options = {}) {
  let skipped = 0;
  let samples: number[] = [];
  let sum = 0;

  const reset = () => {
    skipped = 0;
    samples = [];
    sum = 0;
  };

  return {
    /** One frame took `ms` at `resolution`. Returns the resolution to switch to, if it should change. */
    frame(ms: number, resolution: number): number | undefined {
      if (!(ms > 0) || ms > 500) return undefined;
      if (skipped < warmup) {
        skipped++;
        return undefined;
      }
      samples.push(ms);
      sum += ms;
      if (samples.length > window) sum -= samples.shift() ?? 0;
      if (samples.length < window || sum / window <= slowMs) return undefined;
      const next = nextResolution(resolution);
      reset();
      return next;
    },
    reset,
  };
}
