/** The 7 animals, one per seat. */
export const SPECIES = ["panda", "cat", "owl", "fox", "capybara", "rabbit", "bear"] as const;

export type Species = (typeof SPECIES)[number];

/**
 * How big each animal is, relative to a nominal 1 (the bear is the biggest at 1.15, the panda 90% of that). This is the species' only say in how it sits: the seat decides
 * the view, the lighting, the log and the lean, so any animal works in any seat.
 */
export const SPECIES_SCALE: Record<Species, number> = {
  panda: 1.035,
  cat: 0.92,
  owl: 0.88,
  fox: 1,
  capybara: 1,
  rabbit: 0.8,
  bear: 1.15,
};
