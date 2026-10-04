import type { DistantFire } from "@/data/types";
import type { SceneLayout } from "./layout";
import type { Tree } from "./petitionStars";
import { createRandom, shuffled } from "./random";

/** Only this many other campfires are drawn; the rest are still counted, but not seen. */
export const MAX_DISTANT_FIRES = 8;
/** A fire never shrinks below this on a small screen, in px: the flame's width and height, and the light on the ground (its half-width). */
export const MIN_FLAME_WIDTH_PX = 2;
export const MIN_FLAME_HEIGHT_PX = 3.5;
export const MIN_SPILL_WIDTH_PX = 8;

const SEED = 51907;
/** How far down a pine's trunk is bare, as a share of its height: below the lowest tier of branches. */
const BARE_TRUNK = 0.1;

/** A pine beside a fire: its trunk can hide part of the flame, and the fire lights its side. */
export interface NearTrunk {
  tree: Tree;
  /** Which way the fire is from the trunk: -1 to its left, 1 to its right. */
  side: -1 | 1;
}

/** A fixed place deep in the forest band for one distant fire: where, how big and how bright when the fire is at its farthest or nearest. */
export interface DistantSlot {
  x: number;
  /** Where the flame stands on the ground. */
  y: number;
  /** 0 for the nearest spot, 1 for the farthest. */
  depth: number;
  /** A tiny flame, taller than wide. */
  flameWidth: number;
  flameHeight: number;
  /** The flat warm light on the ground beneath it: an ellipse, half its width and half its height. */
  spillWidth: number;
  spillHeight: number;
  /** The plume of smoke: how wide it grows and how high it rises. */
  plumeWidth: number;
  plumeHeight: number;
  /** How bright a fire here is at most, 0 to 1: farther is dimmer. */
  alpha: number;
  /** Trunks beside it, the ones in front first: they cover part of it and catch its light. */
  trunks: NearTrunk[];
}

/** A fire in its slot. */
export interface PlacedFire extends DistantSlot {
  id: string;
  /** Slot alpha, lifted a little by how many people sit there. */
  brightness: number;
}

const baseOf = (tree: Tree) => tree.top + tree.height;
const bareOf = (tree: Tree) => baseOf(tree) - tree.height * BARE_TRUNK;

/**
 * How far from its middle a pine's body reaches at height `y`, as the scene draws it: a thin trunk at the ground
 * that widens through the skirt of the lowest branches, then narrows tier by tier to the tip.
 */
export function bodyHalf(tree: Tree, y: number): number {
  const base = baseOf(tree);
  if (y < tree.top || y > base + 0.001) return 0;
  const trunk = tree.width * 0.06;
  const bare = bareOf(tree);
  if (y >= bare) return trunk + (tree.width / 2 - trunk) * ((base - y) / (base - bare));
  return (tree.width / 2) * Math.min(1, (y - tree.top) / (tree.height * 0.9));
}

/** Whether a pine is nearer than a fire at height `y` and its skirt reaches no higher than the flame: it can stand across it. */
function standsInFront(tree: Tree, y: number): boolean {
  return baseOf(tree) >= y && bareOf(tree) <= y - 1.5;
}

/**
 * The fixed spots for distant fires, nearest first. They lie deep in the forest band, at the foot of the far pines
 * (just above the first row's trunks, so never in the sky and never in the clearing). Every other one stands with a
 * trunk across the edge of its flame, and none is where a crown would hide it. The same layout and the same trees
 * always give the same spots, whoever is on the list.
 */
export function distantSlots(
  layout: Pick<SceneLayout, "width" | "horizon" | "u">,
  trunks: readonly Tree[],
): DistantSlot[] {
  const { width, horizon, u } = layout;
  const rand = createRandom(SEED);
  const count = MAX_DISTANT_FIRES;
  // Each rank gets its own stretch of the width, in a scrambled order, so the near ones aren't all on one side.
  const stretches = shuffled(
    Array.from({ length: count }, (_, i) => i),
    rand,
  );
  return Array.from({ length: count }, (_, rank) => {
    const depth = rank / (count - 1);
    const scale = 1 - 0.55 * depth;
    // Just above the first row's bases (at 8): any higher and the skirts of the pines leave no gap to see through.
    const y = horizon + (7.5 - 2 * depth) * u;
    const flameHeight = Math.min(5, Math.max(MIN_FLAME_HEIGHT_PX, 4.2 * u * scale));
    const flameWidth = Math.max(MIN_FLAME_WIDTH_PX, flameHeight * 0.5);
    const from = (width * (stretches[rank] ?? rank)) / count;
    const to = from + width / count;
    // Odd ranks stand behind a trunk, partly hidden by it.
    const x = findX(from, to, y, rank % 2 === 1, rand, trunks, flameWidth / 2);
    const spillWidth = Math.max(MIN_SPILL_WIDTH_PX, 17 * u * scale);
    const plumeWidth = Math.max(5, 16 * u * scale);
    return {
      x,
      y,
      depth,
      flameWidth,
      flameHeight,
      spillWidth,
      spillHeight: spillWidth * 0.28,
      plumeWidth,
      plumeHeight: Math.max(14, 40 * u * scale),
      alpha: 0.9 - 0.5 * depth,
      trunks: nearTrunks(x, y, spillWidth * 0.8, trunks),
    };
  });
}

function nearTrunks(x: number, y: number, reach: number, trees: readonly Tree[]): NearTrunk[] {
  return trees
    .filter((tree) => standsInFront(tree, y) && Math.abs(tree.x - x) <= reach + bodyHalf(tree, y))
    .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))
    .map((tree) => ({ tree, side: x < tree.x ? -1 : 1 }));
}

/** A free x in [from, to]: with `hidden`, right at the edge of a trunk that stands in front, otherwise in the widest gap. */
function findX(
  from: number,
  to: number,
  y: number,
  hidden: boolean,
  rand: () => number,
  trees: readonly Tree[],
  margin: number,
): number {
  // Free: no pine's body is over this spot, not even by the width of the flame.
  const free = (x: number, except?: Tree) =>
    !trees.some((tree) => tree !== except && Math.abs(tree.x - x) < bodyHalf(tree, y) + margin);
  if (hidden) {
    const candidates = trees.filter(
      (tree) => tree.x > from && tree.x < to && standsInFront(tree, y),
    );
    const start = Math.floor(rand() * Math.max(1, candidates.length));
    for (let i = 0; i < candidates.length; i++) {
      const tree = candidates[(start + i) % candidates.length];
      if (!tree) continue;
      const first = rand() < 0.5 ? -1 : 1;
      for (const side of [first, -first]) {
        // On the trunk's edge: half the flame is behind it.
        const x = tree.x + side * bodyHalf(tree, y);
        if (free(x, tree)) return x;
      }
    }
  }
  // The widest gap in the stretch; failing that, the nearest gap anywhere along the tree line.
  const widest = (lo: number, hi: number): number | undefined => {
    const steps = 24;
    let best: number | undefined;
    let bestRoom = -Infinity;
    for (let i = 0; i <= steps; i++) {
      const x = lo + ((hi - lo) * i) / steps;
      if (!free(x)) continue;
      let room = Infinity;
      for (const tree of trees) room = Math.min(room, Math.abs(tree.x - x) - bodyHalf(tree, y));
      if (room > bestRoom + 1e-9) {
        bestRoom = room;
        best = x;
      }
    }
    return best;
  };
  const middle = (from + to) / 2;
  const inStretch = widest(from, to);
  if (inStretch !== undefined) return inStretch;
  for (let reach = (to - from) / 2; reach <= middle + (to - from) * 8; reach += (to - from) / 4) {
    const found = widest(middle - reach, middle + reach);
    if (found !== undefined) return found;
  }
  return middle;
}

/**
 * Which slot each fire has. A fire keeps its slot for as long as it burns, so one lighting or going out never
 * moves the others; a new one takes the nearest free slot, and one beyond the slots is not drawn.
 */
export class DistantFireBoard {
  private readonly slots = new Map<string, number>();

  /** Applies the current list and returns the slot of each fire that is drawn. */
  update(fires: readonly DistantFire[]): ReadonlyMap<string, number> {
    const alive = new Set(fires.map((fire) => fire.id));
    for (const id of [...this.slots.keys()]) if (!alive.has(id)) this.slots.delete(id);
    const taken = new Set(this.slots.values());
    const fresh = fires
      .filter((fire) => !this.slots.has(fire.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const fire of fresh) {
      let slot = 0;
      while (taken.has(slot)) slot++;
      if (slot >= MAX_DISTANT_FIRES) break;
      taken.add(slot);
      this.slots.set(fire.id, slot);
    }
    return new Map(this.slots);
  }
}

/** The fires that are drawn, each in its slot, a fire with more people slightly brighter. */
export function placeFires(
  fires: readonly DistantFire[],
  assignment: ReadonlyMap<string, number>,
  slots: readonly DistantSlot[],
): PlacedFire[] {
  const placed: PlacedFire[] = [];
  for (const fire of fires) {
    const slot = slots[assignment.get(fire.id) ?? -1];
    if (!slot) continue;
    const crowd = Math.min(Math.max(fire.people, 1), 7) / 7;
    placed.push({
      ...slot,
      id: fire.id,
      brightness: Math.min(1, slot.alpha * (0.85 + 0.15 * crowd)),
    });
  }
  return placed;
}
