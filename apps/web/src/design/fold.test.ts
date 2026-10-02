import { describe, expect, it } from "vitest";
import { flyTransform, FOLD, FOLD_TOTAL, PAPER_TILT } from "./fold";

describe("flyTransform", () => {
  const from = { x: 400, y: 300, height: 200 };
  const to = { x: 250, y: 520, height: 24 };

  it("moves and shrinks the note to where it is going", () => {
    const fly = flyTransform(from, to, 0);
    expect(fly.x).toBeCloseTo(-150);
    expect(fly.y).toBeCloseTo(220);
    expect(fly.scale).toBeCloseTo(0.12);
    expect(fly.rotate).toBeCloseTo(0);
  });

  it("lands exactly on target even though the note sits in something tilted", () => {
    const fly = flyTransform(from, to, PAPER_TILT);
    // Putting the move back through the tilt gives the move on the screen.
    const screenX = fly.x * Math.cos(PAPER_TILT) - fly.y * Math.sin(PAPER_TILT);
    const screenY = fly.x * Math.sin(PAPER_TILT) + fly.y * Math.cos(PAPER_TILT);
    expect(screenX).toBeCloseTo(to.x - from.x);
    expect(screenY).toBeCloseTo(to.y - from.y);
  });

  it("ends level: it turns by the opposite of the tilt", () => {
    expect(flyTransform(from, to, PAPER_TILT).rotate).toBeCloseTo(-PAPER_TILT);
  });

  it("does not divide by zero for a note with no height", () => {
    expect(flyTransform({ ...from, height: 0 }, to, 0).scale).toBe(1);
  });
});

describe("FOLD", () => {
  it("takes about two seconds to get the note to the paws", () => {
    expect(FOLD_TOTAL).toBeCloseTo(FOLD.chromeFade + FOLD.first + FOLD.second + FOLD.fly);
    expect(FOLD_TOTAL).toBeGreaterThan(1.6);
    expect(FOLD_TOTAL).toBeLessThan(2.2);
  });

  it("fades the writing within the first fold", () => {
    expect(FOLD.textFade).toBeLessThan(FOLD.first);
  });

  it("tilts the paper by one degree to the left", () => {
    expect((PAPER_TILT * 180) / Math.PI).toBeCloseTo(-1);
  });
});
