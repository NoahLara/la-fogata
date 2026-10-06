import { MAX_ONE_SHOTS } from "./levels";
import type { OneShotCue } from "./soundEvents";

interface Playing {
  id: number;
  cue: OneShotCue;
  startedAt: number;
}

export type Admission = { play: false } | { play: true; id: number; evict?: number };

/**
 * Decides which one-shots may sound, so they never pile up: at most `max` at once, and the same voice not twice
 * in a row too quickly. When there is no room, a more important sound pushes out the least important (oldest
 * among equals) and anything else is dropped. Pure: it only knows the times it is given.
 */
export function createLimiter(max = MAX_ONE_SHOTS) {
  let playing: Playing[] = [];
  const lastStart = new Map<string, number>();
  let nextId = 1;

  return {
    admit(cue: OneShotCue, now: number): Admission {
      playing = playing.filter((entry) => entry.startedAt + entry.cue.duration > now);
      const last = lastStart.get(cue.voice);
      if (last !== undefined && now - last < cue.minGap) return { play: false };

      let evict: number | undefined;
      if (playing.length >= max) {
        const weakest = playing.reduce((a, b) =>
          b.cue.priority < a.cue.priority ||
          (b.cue.priority === a.cue.priority && b.startedAt < a.startedAt)
            ? b
            : a,
        );
        if (weakest.cue.priority >= cue.priority) return { play: false };
        evict = weakest.id;
        playing = playing.filter((entry) => entry.id !== weakest.id);
      }
      const id = nextId++;
      playing.push({ id, cue, startedAt: now });
      lastStart.set(cue.voice, now);
      return evict === undefined ? { play: true, id } : { play: true, id, evict };
    },
    /** How many are sounding at this moment. */
    active(now: number): number {
      return playing.filter((entry) => entry.startedAt + entry.cue.duration > now).length;
    },
  };
}
