import type { Species } from "@/scene/characters/species";

/**
 * The picker shows each character's front art on a small disc that looks lit by the fire. The art is neutral
 * grey and made to be lit by the engine, so some read dark (the bear) and some light (the rabbit): the disc
 * must be the one that sets each apart.
 * - hearth: the ground faintly lit, for characters that are not dark.
 * - flame: the glow of the fire itself, for characters that are.
 */
export type Disc = "hearth" | "flame";

/** The theme colors each disc is a gradient between, centre first (see `globals.css`). */
export const DISC_TOKENS: Record<Disc, readonly [string, string]> = {
  hearth: ["hearth", "bark-deep"],
  flame: ["ember-soft", "ember"],
};

/**
 * Mean relative luminance of each `front.svg`'s opaque pixels (0 black, 1 white), measured by rasterizing the
 * art. Measure again when the art changes: `characterDisc.test.ts` holds each character to a contrast of 3:1
 * (WCAG 1.4.11) against its disc.
 */
export const ART_LUMINANCE: Record<Species, number> = {
  panda: 0.305,
  cat: 0.326,
  owl: 0.27,
  fox: 0.333,
  capybara: 0.189,
  rabbit: 0.492,
  bear: 0.059,
};

export const DISC_FOR: Record<Species, Disc> = {
  panda: "hearth",
  cat: "hearth",
  owl: "hearth",
  fox: "hearth",
  capybara: "hearth",
  rabbit: "hearth",
  bear: "flame",
};

/** CSS for a disc: lit from below, as if by the fire. Only theme colors. */
export function discBackground(disc: Disc): string {
  const [centre, edge] = DISC_TOKENS[disc];
  return `radial-gradient(circle at 50% 80%, var(--color-${centre}), var(--color-${edge}) 85%)`;
}
