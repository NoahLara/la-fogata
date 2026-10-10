/** A shuffled copy of `items` (Fisher-Yates). */
export function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const held = result[i] as T;
    result[i] = result[j] as T;
    result[j] = held;
  }
  return result;
}

/**
 * The petitions a sky shows: the ones with the fewest prayers first, so none goes unprayed, and in a random order
 * among those with the same count so different stars pass over time. Petitions don't expire: a star stays until its
 * author returns it to the fire.
 */
export function pickSky<T extends { prayers: number }>(
  petitions: readonly T[],
  rand: () => number,
  size: number,
): T[] {
  return shuffled(petitions, rand)
    .sort((a, b) => a.prayers - b.prayers)
    .slice(0, size);
}
