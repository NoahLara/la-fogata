import type { Point, SceneLayout } from "./layout";
import { between, clamp, mixColor } from "./math";
import { createRandom } from "./random";
import type { Keepout } from "./shootingStar";
import { skyGeometry } from "./skyGeometry";

/** A pine as the scene draws it: `top` is the y of its tip and it widens to `width` about nine tenths of the way down. */
export interface Tree {
  x: number;
  top: number;
  height: number;
  width: number;
}

/** Where a petition star may sit, and how it must keep from the moon, Venus, the pines and the stars already there. */
export interface StarArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
  keepouts: readonly Keepout[];
  /** The closest two petition stars may be. */
  minDistance: number;
  trees: readonly Tree[];
  /** How far above a pine a star must stay. */
  treeMargin: number;
}

/** The y where the pines begin at `x`: the highest outline of any pine there, or `Infinity` where there is none. */
export function treeLineAt(trees: readonly Tree[], x: number): number {
  let line = Infinity;
  for (const tree of trees) {
    const reach = Math.abs(x - tree.x);
    if (reach > tree.width / 2) continue;
    // A pine is a triangle: its outline falls from the tip to the widest tier.
    line = Math.min(line, tree.top + reach * ((0.9 * tree.height) / (tree.width / 2)));
  }
  return line;
}

/**
 * The upper sky: away from the screen edges, and clear of the moon (with its halo), Venus and the real outline of
 * the pines, which `trees` describes: a spot must be a margin above the pine at its own x, wherever the trees are
 * tall or short.
 */
export function starArea(layout: SceneLayout, trees: readonly Tree[] = []): StarArea {
  const { width, u, sceneTop } = layout;
  const { moon, venus, skyHeight } = skyGeometry(layout);
  const top = Math.max(sceneTop + 14 * u, skyHeight * 0.08);
  return {
    left: width * 0.08,
    right: width * 0.92,
    top,
    bottom: Math.max(top + skyHeight * 0.3, skyHeight * 0.8),
    keepouts: [
      { ...moon, radius: moon.radius * 3.2 },
      { ...venus, radius: venus.radius * 2 },
    ],
    minDistance: Math.max(26, 56 * u),
    trees,
    treeMargin: Math.max(12, 22 * u),
  };
}

/** A stable number from text (FNV-1a), so the same petition always seeds the same random stream. */
export function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const ATTEMPTS = 80;

const nearest = (point: Point, others: readonly Point[]): number =>
  others.reduce(
    (least, other) => Math.min(least, Math.hypot(point.x - other.x, point.y - other.y)),
    Infinity,
  );

/**
 * The spot of a petition's star, from its id alone: the same id and the same stars before it always give the
 * same spot, so a star stays where it was. A spot is inside the area, outside the keepouts, above the pines and at least
 * `minDistance` from `others`. If the sky is so crowded that no random spot keeps that distance, the one farthest
 * from the rest is taken, so there is always a place.
 */
export function placeStar(id: string, area: StarArea, others: readonly Point[]): Point {
  const rand = createRandom(hashId(id));
  let best: Point | undefined;
  let bestDistance = -1;
  // If the pines leave no room at all, the spot with the most sky above its pine is the least bad.
  let clearest: Point | undefined;
  let clearestBy = -Infinity;
  let fallback: Point | undefined;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const candidate = {
      x: between(rand, area.left, area.right),
      y: between(rand, area.top, area.bottom),
    };
    fallback ??= candidate;
    if (area.keepouts.some((k) => Math.hypot(candidate.x - k.x, candidate.y - k.y) < k.radius))
      continue;
    const clearance = treeLineAt(area.trees, candidate.x) - candidate.y;
    if (clearance < area.treeMargin) {
      if (clearance > clearestBy) {
        clearest = candidate;
        clearestBy = clearance;
      }
      continue;
    }
    const distance = nearest(candidate, others);
    if (distance >= area.minDistance) return candidate;
    if (distance > bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return (
    best ??
    clearest ??
    fallback ?? { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 }
  );
}

/** Colours of a petition star: warm white while it waits, golden once it is answered. */
export const WAITING_STAR = { core: 0xfff1dc, glow: 0xffd9a0 } as const;
export const ANSWERED_STAR = { core: 0xffdc82, glow: 0xffb030 } as const;
/** How long a star takes to turn golden when it is answered in front of you. */
export const ANSWER_TURN_SECONDS = 1.2;

export interface StarLook {
  core: number;
  glow: number;
  /** How bright the star is right now, around 1. */
  level: number;
}

/**
 * How a petition star looks. A waiting star is steady: the same at any time. An answered one is golden and
 * twinkles, except with reduced motion, when it is golden and still. `turned` (0 to 1) is how far a star that was
 * just answered has turned from white to gold; a star that was already answered is at 1.
 */
export function starLook(
  answered: boolean,
  time: number,
  phase: number,
  reduced: boolean,
  turned = 1,
): StarLook {
  if (!answered) return { core: WAITING_STAR.core, glow: WAITING_STAR.glow, level: 0.95 };
  const t = clamp(turned, 0, 1);
  const wave = 0.7 * Math.sin(time * 2.1 + phase) + 0.3 * Math.sin(time * 0.9 + phase * 1.7);
  return {
    core: mixColor(WAITING_STAR.core, ANSWERED_STAR.core, t),
    glow: mixColor(WAITING_STAR.glow, ANSWERED_STAR.glow, t),
    level: reduced ? 1 : 0.85 + 0.15 * wave,
  };
}
