/** The seats at a campfire: the most people the fire can have. */
const MOST_PEOPLE = 7;
/** An empty fire is never silent: embers and a low flame. */
const FLOOR = 0.35;

/**
 * How loud the fire's crackle is, from 0 to 1, for the number of people connected. It grows a little with each
 * person, like the flames do, and is never out.
 */
export function fireVolume(people: number): number {
  const count = Number.isFinite(people)
    ? Math.min(Math.max(Math.round(people), 0), MOST_PEOPLE)
    : 0;
  return FLOOR + ((1 - FLOOR) * count) / MOST_PEOPLE;
}
