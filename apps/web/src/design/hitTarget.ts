export interface Spot {
  id: string;
  x: number;
  y: number;
}

/**
 * The star a tap at `point` means: of the stars whose touch target (`radius` around its centre) holds the point, the
 * nearest one wins, so overlapping targets never open a farther star. `undefined` when none holds it.
 */
export function nearestStar(
  point: { x: number; y: number },
  stars: readonly Spot[],
  radius: number,
): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const star of stars) {
    const distance = Math.hypot(star.x - point.x, star.y - point.y);
    if (distance > radius || distance >= bestDistance) continue;
    best = star.id;
    bestDistance = distance;
  }
  return best;
}
