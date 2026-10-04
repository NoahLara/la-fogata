import type { Point } from "./layout";
import { between, TAU } from "./math";
import { wrapSigned } from "./panorama";
import type { Random } from "./random";

/** A star of someone else: a real petition, so it can be tapped. */
export interface OtherStar {
  /** The petition it stands for. */
  id: string;
  /** A point of the panorama. */
  x: number;
  y: number;
  /** Where its twinkle starts, in radians (used once it is answered). */
  phase: number;
  /** Someone has marked it answered: it twinkles. */
  answered: boolean;
}

/** A box of the panorama the stars of others keep out of. */
export interface Exclusion {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface OtherStarSpec {
  /** The panorama's width. */
  width: number;
  top: number;
  bottom: number;
  /** The closest two of them may be. */
  spacing: number;
  /**
   * Where none of them may be: the visitor's cluster and Venus with a margin around them, so a star that isn't joined
   * by a line never looks like one of the visitor's. Round places too (the moon).
   */
  exclude: readonly Exclusion[];
  keepouts?: readonly { x: number; y: number; radius: number }[];
  /** A last test of a place: false keeps a star out of it (the pines' silhouette). */
  isClear?: (spot: Point) => boolean;
}

const ATTEMPTS = 30;

/** The distance between two points of the panorama, the short way round. */
function distance(a: Point, b: Point, width: number): number {
  return Math.hypot(wrapSigned(a.x - b.x, width), a.y - b.y);
}

const within = (box: Exclusion, p: Point) =>
  p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom;

/**
 * A spot for one more star of someone else: at least `spacing` from every spot in `taken` (measuring the short way
 * round so none crowds the seam) and outside every box in `exclude`. Nothing when it can't find room after a few
 * tries, so a crowded sky leaves a petition without a star rather than putting it somewhere it doesn't belong.
 */
export function placeOtherStar(
  spec: OtherStarSpec,
  taken: readonly Point[],
  rand: Random,
): (Point & { phase: number }) | undefined {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const candidate = {
      x: between(rand, 0, spec.width),
      y: between(rand, spec.top, spec.bottom),
    };
    if (spec.exclude.some((box) => within(box, candidate))) continue;
    if (spec.keepouts?.some((k) => Math.hypot(candidate.x - k.x, candidate.y - k.y) < k.radius))
      continue;
    if (spec.isClear && !spec.isClear(candidate)) continue;
    if (taken.some((spot) => distance(candidate, spot, spec.width) < spec.spacing)) continue;
    return { ...candidate, phase: rand() * TAU };
  }
  return undefined;
}

/** Places up to `count` stars one after another, each clear of the ones before it. A crowded sky returns fewer. */
export function placeOtherStars(
  spec: OtherStarSpec,
  count: number,
  rand: Random,
): (Point & { phase: number })[] {
  const placed: (Point & { phase: number })[] = [];
  for (let i = 0; i < count; i++) {
    const spot = placeOtherStar(spec, placed, rand);
    if (spot) placed.push(spot);
  }
  return placed;
}
