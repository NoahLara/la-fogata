import type { Point, SceneLayout } from "./layout";
import { between, clamp, distanceToSegment, randomInt } from "./math";
import { hashId, treeLineAt, type Tree } from "./petitionStars";
import { createRandom, type Random } from "./random";
import type { Keepout } from "./shootingStar";
import { skyGeometry } from "./skyGeometry";

/** How visible the lines are: faintly, always. They are what tells your stars from other people's. */
export const CONSTELLATION_ALPHA = 0.4;

// Distances in pixels at a scale of 1 (`ClusterArea.scale` brings them to the screen).
/** A new star goes this far from at least one earlier star. */
export const NEAR_MIN = 60;
export const NEAR_MAX = 120;
/** No two stars come closer than this. */
export const MIN_GAP = 40;
/** The longest line. */
export const MAX_SEGMENT = 140;
/** A line keeps this far from every star it isn't joining, and at least `MIN_ANGLE` degrees from the lines at its end. */
const LINE_CLEAR = 12;
const MIN_ANGLE = 20;
/** The cluster starts compact and grows only when it fills up: never past this many times its size. */
export const CLUSTER_CAPACITY = 12;
export const MAX_GROWTH = 1.6;

/** A star of the visitor's cluster, in the order the petitions were made. */
export interface ClusterStar {
  spot: Point;
  /** The nearest earlier star when this one was placed, which its line joins; `undefined` for the first, which has no line of its own. */
  parent: number | undefined;
}

export interface Region {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Where the visitor's stars live: a compact region in the upper sky of the front section, clear of the moon, Venus
 * and the pines. The region is about a third of the screen wide (a little over two thirds on a phone), between 12% and
 * 55% of the sky's height, and grows around its centre only as stars fill it. Everything here is in panorama
 * coordinates, which is also where the moon and Venus hang.
 */
export interface ClusterArea {
  /** Venus, which hangs near the moon. */
  venus: Point;
  /** Where the moon hangs. */
  moon: Point;
  center: Point;
  /** The region at its starting size. */
  halfWidth: number;
  halfHeight: number;
  /** The most the region may ever reach, however many stars there are: well short of the whole sky. */
  limits: Region;
  keepouts: readonly Keepout[];
  trees: readonly Tree[];
  /** How far a star must be above the pines, and how far to either side of it the pines are looked at. */
  treeMargin: number;
  treeReach: number;
  /** Brings the distances above to this screen. */
  scale: number;
}

export function clusterArea(layout: SceneLayout, trees: readonly Tree[] = []): ClusterArea {
  const { width, u, sceneTop } = layout;
  const { moon, venus, skyHeight } = skyGeometry(layout);
  const regionWidth = width < 600 ? width * 0.7 : Math.min(width * 0.35, 520);
  const top = Math.max(sceneTop + 14 * u, skyHeight * 0.12);
  const bottom = Math.max(top + 40, skyHeight * 0.55);
  return {
    venus: { x: venus.x, y: venus.y },
    moon: { x: moon.x, y: moon.y },
    center: { x: width / 2, y: (top + bottom) / 2 },
    halfWidth: regionWidth / 2,
    halfHeight: (bottom - top) / 2,
    limits: {
      left: width * 0.06,
      right: width * 0.94,
      top: Math.max(sceneTop + 10 * u, skyHeight * 0.05),
      bottom: skyHeight * 0.7,
    },
    keepouts: [
      { ...moon, radius: moon.radius * 3.2 },
      { ...venus, radius: venus.radius * 2 },
    ],
    trees,
    treeMargin: Math.max(12, 22 * u),
    treeReach: Math.max(10, 14 * u),
    scale: clamp(u, 0.7, 1.4),
  };
}

/** How many times its starting size the region is with `count` stars: 1 until it holds a dozen, then slowly more. */
export function clusterGrowth(count: number): number {
  return clamp(Math.sqrt(count / CLUSTER_CAPACITY), 1, MAX_GROWTH);
}

/** The region with `count` stars (`extra` times bigger still, for a star that finds no room): around the same centre. */
export function clusterRegion(area: ClusterArea, count: number, extra = 1): Region {
  const g = Math.min(clusterGrowth(count) * extra, MAX_GROWTH);
  const { center, halfWidth, halfHeight, limits } = area;
  return {
    left: Math.max(limits.left, center.x - halfWidth * g),
    right: Math.min(limits.right, center.x + halfWidth * g),
    top: Math.max(limits.top, center.y - halfHeight * g),
    bottom: Math.min(limits.bottom, center.y + halfHeight * g),
  };
}

/** How far above the silhouette of the pines a star is: the tallest pine at its x, or just to either side of it. */
export function clearanceAbovePines(area: ClusterArea, spot: Point): number {
  let line = Infinity;
  for (const dx of [-area.treeReach, 0, area.treeReach]) {
    line = Math.min(line, treeLineAt(area.trees, spot.x + dx));
  }
  return line - spot.y;
}

/** Whether a star may be here at all: above the pines with their margin, and clear of the moon. */
export function isSkyClear(area: ClusterArea, spot: Point): boolean {
  if (clearanceAbovePines(area, spot) < area.treeMargin) return false;
  return !area.keepouts.some((k) => Math.hypot(spot.x - k.x, spot.y - k.y) < k.radius);
}

const inside = (region: Region, p: Point) =>
  p.x >= region.left && p.x <= region.right && p.y >= region.top && p.y <= region.bottom;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Whether the segments a-b and c-d cross, other than by sharing an end. */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = side(a, b, c);
  const d2 = side(a, b, d);
  const d3 = side(c, d, a);
  const d4 = side(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** The angle, in degrees, between the directions from `at` to `one` and to `other`. */
function angleBetween(at: Point, one: Point, other: Point): number {
  const a = Math.atan2(one.y - at.y, one.x - at.x);
  const b = Math.atan2(other.y - at.y, other.x - at.x);
  const turn = Math.abs(a - b) % (2 * Math.PI);
  return ((turn > Math.PI ? 2 * Math.PI - turn : turn) * 180) / Math.PI;
}

/** The first star: near the centre of the region, as near as the pines and the moon allow. */
function placeFirst(area: ClusterArea, rand: Random): Point {
  const { center, halfWidth, halfHeight, limits } = area;
  const region = clusterRegion(area, 1);
  for (let ring = 0; ring <= 10; ring++) {
    const reach = ring / 10;
    for (let attempt = 0; attempt < 24; attempt++) {
      const spot = {
        x: center.x + between(rand, -1, 1) * halfWidth * reach * 0.8,
        y: center.y + between(rand, -1, 1) * halfHeight * reach,
      };
      if (inside(region, spot) && isSkyClear(area, spot)) return spot;
    }
  }
  // The pines leave no room near the centre: the nearest clear spot anywhere the cluster may reach.
  let best: Point | undefined;
  for (let x = limits.left; x <= limits.right; x += 6) {
    for (let y = limits.top; y <= limits.bottom; y += 6) {
      const spot = { x, y };
      if (!isSkyClear(area, spot)) continue;
      if (!best || distance(spot, center) < distance(best, center)) best = spot;
    }
  }
  return best ?? center;
}

/**
 * The spot of the petition `id`, the `index`th of the visitor's (counting from 0), given the stars before it. The same
 * id, index and earlier stars always give the same spot, so a star stays where it was.
 *
 * The first star is near the centre of the region. Each later one goes 60 to 120 px (scaled) from an earlier star
 * and at least 40 from all of them, inside the region (which grows when it is crowded), above the pines and clear of the
 * moon, and its line to its nearest earlier star crosses no other line and no other star. If the region is too full
 * for that, the rules loosen one at a time (the line may join the nearest star it can reach without crossing, and
 * the gap shrinks a little), the placement staying as close to the cluster as it can. A line never crosses another,
 * and a star is always placed.
 */
export function placeClusterStar(
  id: string,
  index: number,
  area: ClusterArea,
  earlier: readonly ClusterStar[],
): ClusterStar {
  const rand = createRandom((hashId(id) ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  if (earlier.length === 0) return { spot: placeFirst(area, rand), parent: undefined };

  const s = area.scale;
  const stars = earlier.map((star) => star.spot);
  const count = earlier.length + 1;
  const nearest = (spot: Point): number => {
    let best = 0;
    for (let i = 1; i < stars.length; i++) {
      if (distance(spot, stars[i] as Point) < distance(spot, stars[best] as Point)) best = i;
    }
    return best;
  };
  const apart = (spot: Point, gap: number) => stars.every((star) => distance(spot, star) >= gap);

  /** Whether a line from the star at `parent` to `spot` crosses no other line (lines that share an end don't count). */
  const crossFree = (parent: number, spot: Point): boolean => {
    const from = stars[parent] as Point;
    for (let i = 0; i < earlier.length; i++) {
      const q = earlier[i]?.parent;
      if (q === undefined || i === parent || q === parent) continue;
      const end = stars[q] as Point;
      if (segmentsCross(from, spot, stars[i] as Point, end)) return false;
    }
    return true;
  };
  /** The same, and passing no other star and not lying along another line at its end. */
  const clearLine = (parent: number, spot: Point): boolean => {
    if (!crossFree(parent, spot)) return false;
    const from = stars[parent] as Point;
    for (let i = 0; i < earlier.length; i++) {
      const q = earlier[i]?.parent;
      if (q === undefined || (i !== parent && q !== parent)) continue;
      const other = i === parent ? (stars[q] as Point) : (stars[i] as Point);
      if (angleBetween(from, spot, other) < MIN_ANGLE) return false;
    }
    return stars.every(
      (star, i) => i === parent || distanceToSegment(star, from, spot) >= LINE_CLEAR * s,
    );
  };
  /** The nearest earlier star a line to `spot` can join without crossing another line. */
  const joinable = (spot: Point): number | undefined =>
    stars
      .map((star, index) => ({ index, d: distance(spot, star) }))
      .sort((a, b) => a.d - b.d)
      .find((entry) => crossFree(entry.index, spot))?.index;

  /**
   * The result for `spot` if it is fine, or nothing. `strict` joins the nearest star, no more than 140 px away, by a
   * clear line; otherwise the gap is a little looser and the nearest star a line can reach without crossing is
   * joined. A line never crosses another, whatever the mode.
   */
  const accept = (spot: Point, strict: boolean): ClusterStar | undefined => {
    if (!isSkyClear(area, spot) || !apart(spot, MIN_GAP * s * (strict ? 1 : 0.75)))
      return undefined;
    if (strict) {
      const parent = nearest(spot);
      if (distance(spot, stars[parent] as Point) > MAX_SEGMENT * s) return undefined;
      return clearLine(parent, spot) ? { spot, parent } : undefined;
    }
    const parent = joinable(spot);
    return parent === undefined ? undefined : { spot, parent };
  };

  // 1. Out from a random earlier star, in the region, growing it a little each time round if need be.
  for (const extra of [1, 1.2, 1.4, 1.6]) {
    const region = clusterRegion(area, count, extra);
    for (let attempt = 0; attempt < 120; attempt++) {
      const anchor = stars[randomInt(rand, 0, stars.length - 1)] as Point;
      const angle = rand() * 2 * Math.PI;
      const reach = between(rand, NEAR_MIN, NEAR_MAX) * s;
      const spot = { x: anchor.x + Math.cos(angle) * reach, y: anchor.y + Math.sin(angle) * reach };
      if (!inside(region, spot)) continue;
      const placed = accept(spot, true);
      if (placed) return placed;
    }
  }
  // 2. Anywhere the cluster may reach, then without the line rules, then with the gap loosened.
  const widest = clusterRegion(area, count, MAX_GROWTH);
  for (const strict of [true, false]) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const spot = {
        x: between(rand, widest.left, widest.right),
        y: between(rand, widest.top, widest.bottom),
      };
      const placed = accept(spot, strict);
      if (placed) return placed;
    }
  }
  // 3. Every spot of the widest region in turn, the nearest to the cluster's centre that a line can reach.
  let best: ClusterStar | undefined;
  for (let x = widest.left; x <= widest.right; x += 6) {
    for (let y = widest.top; y <= widest.bottom; y += 6) {
      const spot = { x, y };
      if (!isSkyClear(area, spot) || !apart(spot, MIN_GAP * s * 0.5)) continue;
      if (best && distance(spot, area.center) >= distance(best.spot, area.center)) continue;
      const parent = joinable(spot);
      if (parent !== undefined) best = { spot, parent };
    }
  }
  return best ?? { spot: area.center, parent: nearest(area.center) };
}

/** A star in the order the petitions were made, for drawing the lines. */
export interface ConstellationStar extends ClusterStar {
  id: string;
}

/**
 * The thin lines of the constellation: each star is joined to its nearest earlier star, so the lines form a tree, not a
 * chain. The first star has no line of its own, so a single petition has none (its glow identifies it). Other people's
 * stars never get lines.
 *
 * A star that isn't in the sky (it went back to the fire) takes its lines with it, and the constellation must not
 * fall apart: every line between stars that are still there stays as it was, and the pieces that are left (the
 * children of a star that left, say) are joined to each other, each time by the shortest line that crosses no
 * other (the shortest of all if every one crosses). However many stars leave, the ones that are left are always one
 * constellation.
 */
export function constellationLines(
  stars: readonly ConstellationStar[],
  present: ReadonlySet<string>,
): [Point, Point][] {
  const alive: number[] = [];
  stars.forEach((star, index) => {
    if (present.has(star.id)) alive.push(index);
  });
  const spot = (index: number) => (stars[index] as ConstellationStar).spot;

  // 1. Each star keeps its line to its nearest earlier star, if that one is still in the sky.
  const edges: [number, number][] = [];
  for (const index of alive) {
    const parent = stars[index]?.parent;
    if (parent !== undefined && present.has(stars[parent]?.id ?? "")) edges.push([parent, index]);
  }

  // 2. The pieces that are left, joined one by one through the shortest line that crosses no other.
  const piece = new Map<number, number>(alive.map((index) => [index, index]));
  const rootOf = (index: number): number => {
    let root = index;
    while (piece.get(root) !== root) root = piece.get(root) as number;
    return root;
  };
  for (const [from, to] of edges) piece.set(rootOf(from), rootOf(to));
  const crossesAny = (a: number, b: number) =>
    edges.some(([c, d]) => segmentsCross(spot(a), spot(b), spot(c), spot(d)));
  for (let pieces = new Set(alive.map(rootOf)).size; pieces > 1; pieces--) {
    let best: { a: number; b: number; crosses: boolean; length: number } | undefined;
    for (const a of alive) {
      for (const b of alive) {
        if (b <= a || rootOf(a) === rootOf(b)) continue;
        const candidate = { a, b, crosses: crossesAny(a, b), length: distance(spot(a), spot(b)) };
        if (
          !best ||
          Number(candidate.crosses) < Number(best.crosses) ||
          (candidate.crosses === best.crosses && candidate.length < best.length)
        ) {
          best = candidate;
        }
      }
    }
    if (!best) break;
    edges.push([best.a, best.b]);
    piece.set(rootOf(best.a), rootOf(best.b));
  }
  return edges.map(([from, to]) => [spot(from), spot(to)]);
}

/** The x of the middle of the constellation: where the sky is turned so it sits in the screen's middle. */
export function constellationCenter(area: ClusterArea, spots: readonly Point[]): number {
  // With no star yet, the middle of the region where they will be.
  if (spots.length === 0) return area.center.x;
  const xs = spots.map((spot) => spot.x);
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}

/**
 * The box the stars of other people keep out of: the cluster at its widest with `margin` around (about 40 px,
 * scaled), so a star that isn't joined by a line is never mistaken for one of the visitor's. (The moon and Venus are
 * kept clear separately, as round places.)
 */
export function clusterExclusion(area: ClusterArea, margin = 40 * area.scale): Region[] {
  const widest = clusterRegion(area, Infinity, MAX_GROWTH);
  return [
    {
      left: widest.left - margin,
      right: widest.right + margin,
      top: widest.top - margin,
      bottom: widest.bottom + margin,
    },
  ];
}
