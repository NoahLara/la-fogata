import { clamp, smoothstep } from "./math";
import { createRandom } from "./random";

/** The beats of a folded note on the fire, in seconds. */
export const NOTE = {
  /** From the hands to the ember bed. */
  arc: 0.55,
  /** On the fire, from the first spark to the last ash. */
  burn: 2.5,
  /** With reduced motion: the note fades into the fire over this long. */
  fade: 2,
} as const;

/** The folded note is a grid of cells, each of which catches, chars and turns to ash in its own time. */
export const NOTE_COLUMNS = 12;
export const NOTE_ROWS = 14;

export interface NoteCell {
  col: number;
  row: number;
  /** Where the cell's middle is on the note, 0..1 across and down. */
  u: number;
  v: number;
  /** When, 0..1 through the burn, it catches fire, finishes charring and turns to ash. */
  ignite: number;
  char: number;
  ash: number;
}

/** Smooth noise in 0..1: the same input always gives the same value, and nearby inputs give nearby values. */
export function valueNoise(x: number, y: number, seed: number): number {
  const lattice = (i: number, j: number) => {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed + 1, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(0, 1, x - x0);
  const ty = smoothstep(0, 1, y - y0);
  const top = lattice(x0, y0) * (1 - tx) + lattice(x0 + 1, y0) * tx;
  const bottom = lattice(x0, y0 + 1) * (1 - tx) + lattice(x0 + 1, y0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/**
 * The cells of a note and when each burns. The edges catch first and the fire moves inward, but never in a
 * straight line: noise holds it back here and lets it run there, and it starts in one corner and spreads. Every
 * cell is ash by the end.
 */
export function buildNoteCells(seed: number, columns = NOTE_COLUMNS, rows = NOTE_ROWS): NoteCell[] {
  const rand = createRandom(seed);
  // The corner it is lit from.
  const cornerU = rand() < 0.5 ? 0 : 1;
  const cornerV = rand() < 0.5 ? 0 : 1;
  const cells: NoteCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const u = (col + 0.5) / columns;
      const v = (row + 0.5) / rows;
      // 0 on the edge, 1 in the middle.
      const inward = Math.min(u, 1 - u, v, 1 - v) * 2;
      const fromCorner = Math.hypot(u - cornerU, v - cornerV) / Math.SQRT2;
      const ignite =
        0.04 +
        0.34 * inward +
        0.1 * fromCorner +
        0.2 * valueNoise(u * 3.2, v * 3.2, seed) +
        0.08 * valueNoise(u * 9, v * 9, seed + 7);
      const char = ignite + 0.1;
      const ash = char + 0.04 + 0.06 * valueNoise(u * 5 + 3, v * 5 + 1, seed + 3);
      cells.push({ col, row, u, v, ignite, char, ash });
    }
  }
  return cells;
}

export type CellPhase = "paper" | "burning" | "char" | "ash";

export interface CellState {
  phase: CellPhase;
  /** How far through the phase, 0..1 (always 1 for paper's and ash's end). */
  amount: number;
}

/** What a cell is doing `progress` (0..1) of the way through the burn. */
export function cellStateAt(cell: NoteCell, progress: number): CellState {
  if (progress < cell.ignite) return { phase: "paper", amount: 0 };
  if (progress < cell.char) {
    return { phase: "burning", amount: (progress - cell.ignite) / (cell.char - cell.ignite) };
  }
  if (progress < cell.ash) {
    return { phase: "char", amount: (progress - cell.char) / (cell.ash - cell.char) };
  }
  return { phase: "ash", amount: 1 };
}

/** How much the whole note has curled `progress` of the way through the burn: how far it tilts and how much smaller it draws. */
export function curlAt(progress: number): { tilt: number; shrink: number } {
  const curl = smoothstep(0.25, 0.85, clamp(progress, 0, 1));
  return { tilt: curl * 0.45, shrink: 1 - 0.28 * curl };
}

/** With reduced motion: how opaque the note still is, and how bright its glow, `elapsed` seconds in. */
export function fadeIntoFire(elapsed: number): { alpha: number; glow: number } {
  const u = clamp(elapsed / NOTE.fade, 0, 1);
  return { alpha: 1 - smoothstep(0.1, 0.8, u), glow: Math.sin(Math.PI * smoothstep(0, 1, u)) };
}
