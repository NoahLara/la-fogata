import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

/** A color token from the theme in globals.css. */
function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) throw new Error(`No color token "${name}" in globals.css`);
  return match[1];
}

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for the same color", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1);
  });

  it("does not depend on the order", () => {
    expect(contrastRatio("#ff9650", "#0b0d1a")).toBe(contrastRatio("#0b0d1a", "#ff9650"));
  });
});

// Text must reach 4.5:1 (WCAG AA); the larger handwriting and titles are held to the same.
describe("text pairs in the design tokens", () => {
  const AA = 4.5;
  it.each([
    ["ink", "paper"],
    ["ink-soft", "paper"],
    ["ink", "paper-glow"],
    ["ink-soft", "paper-glow"],
    ["ink-soft", "paper-shade"],
    ["ink-faint", "paper"],
    ["ink-faint", "paper-glow"],
    ["ink", "ember"],
    ["ink", "ember-soft"],
    ["gold", "night"],
    ["gold", "bark"],
    ["gold", "bark-deep"],
  ])("%s on %s", (text, background) => {
    expect(contrastRatio(token(text), token(background))).toBeGreaterThanOrEqual(AA);
  });
});
