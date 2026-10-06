import { describe, expect, it } from "vitest";
import { createLimiter } from "./limiter";
import type { OneShotCue } from "./soundEvents";

const cue = (voice: OneShotCue["voice"], priority: number, overrides: Partial<OneShotCue> = {}) =>
  ({
    kind: "one-shot",
    voice,
    gain: 0.03,
    priority,
    duration: 2,
    minGap: 0,
    ...overrides,
  }) as OneShotCue;

describe("the stacking cap", () => {
  it("lets one-shots sound together up to the cap", () => {
    const limiter = createLimiter(3);
    expect(limiter.admit(cue("thump", 1), 0).play).toBe(true);
    expect(limiter.admit(cue("bell", 1), 0.1).play).toBe(true);
    expect(limiter.admit(cue("tone", 1), 0.2).play).toBe(true);
    expect(limiter.active(0.3)).toBe(3);
  });

  it("drops what is not more important than the weakest when there is no room", () => {
    const limiter = createLimiter(2);
    limiter.admit(cue("thump", 2), 0);
    limiter.admit(cue("bell", 2), 0.1);
    expect(limiter.admit(cue("steps", 0), 0.2)).toEqual({ play: false });
    expect(limiter.admit(cue("tone", 2), 0.2)).toEqual({ play: false });
    expect(limiter.active(0.3)).toBe(2);
  });

  it("pushes out the weakest, oldest first, for something more important", () => {
    const limiter = createLimiter(2);
    const first = limiter.admit(cue("steps", 0), 0);
    limiter.admit(cue("shimmer", 1), 0.1);
    const result = limiter.admit(cue("thump", 3), 0.2);
    expect(first.play && result.play && result.evict).toBe(first.play ? first.id : -1);
    expect(limiter.active(0.3)).toBe(2);
  });

  it("makes room again as sounds finish", () => {
    const limiter = createLimiter(1);
    limiter.admit(cue("thump", 3, { duration: 1 }), 0);
    expect(limiter.admit(cue("steps", 0), 0.5).play).toBe(false);
    expect(limiter.admit(cue("steps", 0), 1.5).play).toBe(true);
  });

  it("does not repeat the same voice too soon", () => {
    const limiter = createLimiter(3);
    expect(limiter.admit(cue("steps", 0, { minGap: 3 }), 0).play).toBe(true);
    expect(limiter.admit(cue("steps", 0, { minGap: 3 }), 1).play).toBe(false);
    expect(limiter.admit(cue("steps", 0, { minGap: 3 }), 3.1).play).toBe(true);
  });
});
