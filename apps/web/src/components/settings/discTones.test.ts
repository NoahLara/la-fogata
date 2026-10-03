import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastOfLuminances, luminance } from "@/design/contrast";
import { SPECIES } from "@/scene/characters/species";
import { ART_LUMINANCE, DISC_FOR, DISC_TOKENS, type Disc } from "./discTones";

const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");
const tokenLuminance = (name: string) => {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) throw new Error(`No color token "${name}"`);
  return luminance(match[1]);
};

/** The worst contrast between a character and either end of its disc. */
const worstContrast = (art: number, disc: Disc) =>
  Math.min(...DISC_TOKENS[disc].map((name) => contrastOfLuminances(art, tokenLuminance(name))));

describe("character discs", () => {
  it.each(SPECIES)("%s reads clearly on its disc (3:1)", (species) => {
    expect(worstContrast(ART_LUMINANCE[species], DISC_FOR[species])).toBeGreaterThanOrEqual(3);
  });

  it.each(SPECIES)("%s has the disc that sets it apart best", (species) => {
    const other: Disc = DISC_FOR[species] === "hearth" ? "flame" : "hearth";
    expect(worstContrast(ART_LUMINANCE[species], DISC_FOR[species])).toBeGreaterThanOrEqual(
      worstContrast(ART_LUMINANCE[species], other),
    );
  });
});
