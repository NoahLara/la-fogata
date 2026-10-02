import { describe, expect, it } from "vitest";
import type { View } from "./characters";
import { SPECIES } from "./characters/species";
import { partsFor } from "./parts";

const VIEWS: View[] = ["front", "back", "side"];

describe("partsFor", () => {
  it("gives the panda ears in every view, two where both show and one in profile", () => {
    expect(partsFor("panda", "front").map((p) => p.id)).toEqual(["earL", "earR"]);
    expect(partsFor("panda", "back").map((p) => p.id)).toEqual(["earL", "earR"]);
    expect(partsFor("panda", "side").map((p) => p.id)).toEqual(["ear"]);
  });

  it("gives the fox a tail in every view and no ears", () => {
    for (const view of VIEWS) {
      expect(partsFor("fox", view).map((p) => p.kind)).toEqual(["tail"]);
    }
  });

  it("gives every animal something that moves in every view", () => {
    for (const species of SPECIES) {
      for (const view of VIEWS) {
        expect(partsFor(species, view).length, `${species} ${view}`).toBeGreaterThan(0);
      }
    }
  });

  it("gives the bear the panda's ears, since they are built alike", () => {
    for (const view of VIEWS) expect(partsFor("bear", view)).toEqual(partsFor("panda", view));
  });

  it("gives the rabbit two long ears, in profile too, and the capybara small ones", () => {
    expect(partsFor("rabbit", "front").map((p) => p.id)).toEqual(["earL", "earR"]);
    expect(partsFor("rabbit", "side").map((p) => p.id)).toEqual(["earA", "earB"]);
    const long = partsFor("rabbit", "front")[0]!;
    const small = partsFor("capybara", "front")[0]!;
    const length = (part: typeof long) =>
      Math.hypot(part.path[1]!.x - part.path[0]!.x, part.path[1]!.y - part.path[0]!.y);
    expect(length(long)).toBeGreaterThan(length(small) * 4);
  });

  it("lets a cat flick its tail tip everywhere, and sway the whole tail except where it lies across its feet", () => {
    expect(partsFor("cat", "front").map((p) => p.kind)).toEqual(["tailTip"]);
    expect(partsFor("cat", "back").map((p) => p.kind)).toEqual(["tail", "tailTip"]);
    expect(partsFor("cat", "side").map((p) => p.kind)).toEqual(["tail", "tailTip"]);
  });

  it("ends a cat's tail tip at the end of its tail, and starts it partway along", () => {
    for (const view of ["back", "side"] as const) {
      const [whole, tip] = partsFor("cat", view);
      expect(tip!.path[tip!.path.length - 1]).toEqual(whole!.path[whole!.path.length - 1]);
      expect(tip!.path.length).toBeLessThan(whole!.path.length);
    }
  });

  it("gives the owl a head from the neck up in every view", () => {
    for (const view of VIEWS) {
      const [head] = partsFor("owl", view);
      expect(head!.kind).toBe("head");
      expect(head!.path[1]!.y).toBeLessThan(head!.path[0]!.y);
    }
  });

  it("names the parts of a view differently, and gives each a way to move", () => {
    for (const species of SPECIES) {
      for (const view of VIEWS) {
        const parts = partsFor(species, view);
        expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
        for (const part of parts) {
          expect(part.amplitude).not.toBe(0);
          expect(part.width).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps every part's line inside the 128-unit frame the art is drawn in", () => {
    for (const species of SPECIES) {
      for (const view of VIEWS) {
        for (const part of partsFor(species, view)) {
          for (const point of part.path) {
            expect(Math.abs(point.x)).toBeLessThan(64);
            expect(point.y).toBeGreaterThan(-118);
            expect(point.y).toBeLessThan(10);
          }
        }
      }
    }
  });

  it("flicks the left ear one way and the right the other, away from the head", () => {
    const [left, right] = partsFor("panda", "front");
    expect(left!.amplitude).toBeLessThan(0);
    expect(right!.amplitude).toBeGreaterThan(0);
  });
});
