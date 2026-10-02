export interface StarPosition {
  id: string;
  x: number;
  y: number;
}

/** The stars from left to right; stars at the same x go from top to bottom. */
export function orderStars<T extends StarPosition>(stars: readonly T[]): T[] {
  return [...stars].sort((a, b) => a.x - b.x || a.y - b.y);
}

/**
 * Where focus goes when `key` is pressed on the star at `current` among `count`: right and down go forward, left
 * and up go back, both wrap around at the ends; Home and End jump to the first and the last. `undefined` for any
 * other key, or when there is no star.
 */
export function nextStarIndex(key: string, current: number, count: number): number | undefined {
  if (count <= 0) return undefined;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
}

/** Where focus goes once the star at `index` has gone from `stars` (already without it): the next one, wrapping around. */
export function starAfterRemoval<T>(stars: readonly T[], index: number): T | undefined {
  return stars[index] ?? stars[0];
}
