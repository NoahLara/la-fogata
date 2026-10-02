import { describe, expect, it } from "vitest";
import {
  burdenLength,
  canHandOver,
  COUNTER_FROM_REMAINING,
  limitBurden,
  MAX_BURDEN_LENGTH,
  MIN_BURDEN_LENGTH,
  remainingToAnnounce,
  showCounter,
} from "./burden";

describe("burdenLength", () => {
  it("counts characters as people do", () => {
    expect(burdenLength("hola")).toBe(4);
    expect(burdenLength("ñandú")).toBe(5);
    expect(burdenLength("🔥🔥")).toBe(2);
  });
});

describe("limitBurden", () => {
  it("leaves short text alone", () => {
    expect(limitBurden("poco")).toBe("poco");
  });

  it("cuts long text to the limit", () => {
    expect(burdenLength(limitBurden("a".repeat(MAX_BURDEN_LENGTH + 50)))).toBe(MAX_BURDEN_LENGTH);
  });

  it("never splits an emoji in half", () => {
    const cut = limitBurden("🔥".repeat(MAX_BURDEN_LENGTH + 1));
    expect(cut).toBe("🔥".repeat(MAX_BURDEN_LENGTH));
  });
});

describe("canHandOver", () => {
  it("needs something written", () => {
    expect(canHandOver("")).toBe(false);
    expect(canHandOver("   \n ")).toBe(false);
    expect(canHandOver(" cansancio ")).toBe(true);
  });

  it("needs at least 5 characters, not counting spaces at the ends", () => {
    expect(canHandOver("miedo".slice(0, 4))).toBe(false);
    expect(canHandOver("  hola  ")).toBe(false);
    expect(canHandOver("miedo")).toBe(true);
    expect(canHandOver("  miedo  ")).toBe(true);
    expect(MIN_BURDEN_LENGTH).toBe(5);
  });

  it("counts characters as people do, so emoji are one each", () => {
    expect(canHandOver("🔥🔥🔥🔥")).toBe(false);
    expect(canHandOver("🔥🔥🔥🔥🔥")).toBe(true);
  });

  it("accepts exactly the limit and nothing more", () => {
    expect(canHandOver("a".repeat(MAX_BURDEN_LENGTH))).toBe(true);
    expect(canHandOver("a".repeat(MAX_BURDEN_LENGTH + 1))).toBe(false);
  });
});

describe("showCounter", () => {
  it("stays hidden until the last 50 characters", () => {
    expect(showCounter(0)).toBe(false);
    expect(showCounter(MAX_BURDEN_LENGTH - COUNTER_FROM_REMAINING - 1)).toBe(false);
    expect(showCounter(MAX_BURDEN_LENGTH - COUNTER_FROM_REMAINING)).toBe(true);
    expect(showCounter(MAX_BURDEN_LENGTH)).toBe(true);
  });
});

describe("remainingToAnnounce", () => {
  it("speaks only at 50, 10 and 0 characters left", () => {
    expect(remainingToAnnounce(MAX_BURDEN_LENGTH - 50)).toBe(50);
    expect(remainingToAnnounce(MAX_BURDEN_LENGTH - 10)).toBe(10);
    expect(remainingToAnnounce(MAX_BURDEN_LENGTH)).toBe(0);
    expect(remainingToAnnounce(100)).toBeUndefined();
    expect(remainingToAnnounce(MAX_BURDEN_LENGTH - 49)).toBeUndefined();
  });
});
