import type { Point } from "./layout";
import { between, TAU } from "./math";
import { wrapSigned } from "./panorama";
import type { Random } from "./random";

/**
 * Other people's stars per square pixel of panorama (only in development, behind ?demo): the count follows the
 * size of the sky, so a phone isn't crowded and a wide screen isn't sparse. About 200 on a laptop.
 */
export const OTHER_STAR_DENSITY = 2e-4;

/** How many of other people's stars fit a panorama this wide, between `top` and `bottom`. */
export function otherStarCount(width: number, top: number, bottom: number): number {
  return Math.round(OTHER_STAR_DENSITY * width * Math.max(0, bottom - top));
}

export interface OtherStar {
  /** A point of the panorama. */
  x: number;
  y: number;
  /** Where its twinkle starts, in radians (used once it is answered). */
  phase: number;
  /** Someone has marked it answered: it is gold, with a cross and a twinkle. */
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
  count: number;
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
  /** How many of them are answered, as a share (a fifth). */
  answeredShare?: number;
}

/** About a fifth of the other people's stars are answered. */
export const OTHER_ANSWERED_SHARE = 0.2;

const ATTEMPTS = 30;

/** The distance between two points of the panorama, the short way round. */
function distance(a: Point, b: Point, width: number): number {
  return Math.hypot(wrapSigned(a.x - b.x, width), a.y - b.y);
}

const within = (box: Exclusion, p: Point) =>
  p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom;

/**
 * Spots for the stars of other people across the whole panorama, mixed at random: every one at least `spacing` from
 * the others, measuring the short way round so none crowds the seam, and outside every box in `exclude`. About a fifth
 * are answered. A star that can't find room after a few tries is left out, so the sky may hold fewer than `count`.
 */
export function placeOtherStars(spec: OtherStarSpec, rand: Random): OtherStar[] {
  const share = spec.answeredShare ?? OTHER_ANSWERED_SHARE;
  const placed: OtherStar[] = [];
  for (let i = 0; i < spec.count; i++) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const candidate = {
        x: between(rand, 0, spec.width),
        y: between(rand, spec.top, spec.bottom),
      };
      if (spec.exclude.some((box) => within(box, candidate))) continue;
      if (spec.keepouts?.some((k) => Math.hypot(candidate.x - k.x, candidate.y - k.y) < k.radius))
        continue;
      if (spec.isClear && !spec.isClear(candidate)) continue;
      if (placed.some((star) => distance(candidate, star, spec.width) < spec.spacing)) continue;
      placed.push({ ...candidate, phase: rand() * TAU, answered: rand() < share });
      break;
    }
  }
  return placed;
}
