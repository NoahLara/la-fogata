/** Longest a polite announcement may repeat: at most one every this many milliseconds. */
export const ANNOUNCE_GAP_MS = 10_000;

export interface AnnounceLimiter {
  /** Whether an announcement may be made now; if so, the moment is taken. */
  take(): boolean;
}

/** Lets one announcement through every `gapMs`, and drops the ones in between. `now` is in milliseconds. */
export function createAnnounceLimiter(
  gapMs: number = ANNOUNCE_GAP_MS,
  now: () => number = () => Date.now(),
): AnnounceLimiter {
  let last: number | undefined;
  return {
    take() {
      const at = now();
      if (last !== undefined && at - last < gapMs) return false;
      last = at;
      return true;
    },
  };
}
