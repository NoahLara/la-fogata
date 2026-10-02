import type { Point } from "./layout";
import { smoothstep } from "./math";

/**
 * A part that can bend: the vertices near a centre line, rotated about its first point by more the farther
 * along the line they are. An ear is a short line out of the head, a tail a long one out of the body.
 */
export interface Chain {
  /** From the base, which stays put, out to the tip. Local units. */
  path: readonly Point[];
  /** How far from the line a vertex still moves in full. */
  width: number;
  /** How far past that the movement fades to nothing. */
  falloff: number;
  /** Chains in the same group are neighbours (two ears): each vertex follows only the nearest of them. */
  group?: string;
}

/** A chain worked out for a particular mesh: which vertices it moves, and by how much per radian. */
export interface CompiledChain {
  pivot: Point;
  indices: Uint32Array;
  weights: Float32Array;
}

/** Closest point on the path to `point`: how far along the path it is, and how far from it. */
function nearestOnPath(
  path: readonly Point[],
  point: Point,
): { along: number; away: number; length: number } {
  let walked = 0;
  let best = { along: 0, away: Infinity };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as Point;
    const b = path[i] as Point;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segment = Math.hypot(dx, dy);
    const lengthSquared = segment * segment;
    const t =
      lengthSquared > 0
        ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
        : 0;
    const away = Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
    if (away < best.away) best = { along: walked + segment * t, away };
    walked += segment;
  }
  return { ...best, length: walked };
}

/** How much a vertex at `point` follows the chain's rotation: 0 at the base and outside the part, 1 at the tip. */
export function chainWeight(chain: Chain, point: Point): number {
  const { along, away, length } = nearestOnPath(chain.path, point);
  if (length === 0) return 0;
  const inside = 1 - smoothstep(chain.width, chain.width + chain.falloff, away);
  return inside * smoothstep(0, 1, along / length);
}

/** How much closer a vertex has to be to one chain than to its neighbour before it follows only that one. */
const NEIGHBOUR_MARGIN = 1.5;

/**
 * Finds the vertices each chain moves in a mesh whose rest positions are x, y pairs. Where two chains of the
 * same group reach the same vertex (two ears whose tips nearly touch), it follows the nearer one, so moving one
 * ear does not drag the edge of the other.
 */
export function compileChains(rest: Float32Array, chains: readonly Chain[]): CompiledChain[] {
  const found = chains.map(() => ({ indices: [] as number[], weights: [] as number[] }));
  for (let i = 0; i < rest.length / 2; i++) {
    const point = { x: rest[2 * i] as number, y: rest[2 * i + 1] as number };
    const away = chains.map((chain) => nearestOnPath(chain.path, point).away);
    chains.forEach((chain, c) => {
      let weight = chainWeight(chain, point);
      if (weight <= 1e-4) return;
      chains.forEach((other, o) => {
        if (o !== c && other.group !== undefined && other.group === chain.group) {
          weight *= smoothstep(
            -NEIGHBOUR_MARGIN,
            NEIGHBOUR_MARGIN,
            (away[o] as number) - (away[c] as number),
          );
        }
      });
      if (weight > 1e-4) {
        found[c]?.indices.push(i);
        found[c]?.weights.push(weight);
      }
    });
  }
  return chains.map((chain, c) => ({
    pivot: chain.path[0] ?? { x: 0, y: 0 },
    indices: Uint32Array.from(found[c]?.indices ?? []),
    weights: Float32Array.from(found[c]?.weights ?? []),
  }));
}

/** Finds the vertices one chain moves. */
export function compileChain(rest: Float32Array, chain: Chain): CompiledChain {
  return compileChains(rest, [chain])[0] as CompiledChain;
}

/**
 * Writes the rest positions into `out`, then turns each chain's vertices about its pivot by its angle in
 * radians (positive is clockwise on screen) times their weight. Only moves numbers; nothing is rebuilt.
 */
export function applyChains(
  rest: Float32Array,
  out: Float32Array,
  chains: readonly CompiledChain[],
  angles: readonly number[],
): void {
  out.set(rest);
  chains.forEach((chain, c) => {
    const angle = angles[c] ?? 0;
    if (angle === 0) return;
    const { pivot, indices, weights } = chain;
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k] as number;
      const turn = angle * (weights[k] as number);
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const dx = (rest[2 * i] as number) - pivot.x;
      const dy = (rest[2 * i + 1] as number) - pivot.y;
      out[2 * i] = pivot.x + dx * cos - dy * sin;
      out[2 * i + 1] = pivot.y + dx * sin + dy * cos;
    }
  });
}
