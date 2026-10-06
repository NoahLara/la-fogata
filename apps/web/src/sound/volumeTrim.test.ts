import { describe, expect, it } from "vitest";
import {
  clampTrim,
  CRACKLE_DEFAULT,
  MUSIC_DEFAULT,
  TRIM_NORMAL,
  trimMultiplier,
} from "./volumeTrim";

describe("a volume slider", () => {
  it("is exactly the normal level in the middle, silent at the bottom and louder at the top", () => {
    expect(trimMultiplier(TRIM_NORMAL)).toBe(1);
    expect(trimMultiplier(0)).toBe(0);
    expect(trimMultiplier(100)).toBeGreaterThan(2);
  });

  it("rises with the slider, never jumping at the middle", () => {
    let last = -1;
    for (let level = 0; level <= 100; level += 5) {
      const now = trimMultiplier(level);
      expect(now).toBeGreaterThan(last);
      last = now;
    }
  });

  it("falls back to what it is given for anything that is not a number, and clamps the rest", () => {
    expect(clampTrim("abc", 75)).toBe(75);
    expect(clampTrim(Number.NaN, 75)).toBe(75);
    expect(clampTrim(undefined, 25)).toBe(25);
    expect(clampTrim(null, 25)).toBe(25);
    expect(clampTrim(-20, 75)).toBe(0);
    expect(clampTrim(400, 75)).toBe(100);
    expect(clampTrim("30", 75)).toBe(30);
  });

  it("starts the fire's crackle at 75 (louder than normal) and the music at 25 (quieter)", () => {
    expect(CRACKLE_DEFAULT).toBe(75);
    expect(MUSIC_DEFAULT).toBe(25);
    expect(trimMultiplier(CRACKLE_DEFAULT)).toBeGreaterThan(1);
    expect(trimMultiplier(MUSIC_DEFAULT)).toBeLessThan(1);
  });
});
