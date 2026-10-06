import { createRandom } from "@/scene/random";

export interface UnitPoint {
  x: number;
  y: number;
}

/**
 * The outline of a sheet of paper as points in the unit square, clockwise from the top left. Every edge wanders a
 * little, so no side is a ruler's line. The same seed always gives the same sheet, so the one in the page and
 * the one drawn in the scene are the same shape.
 */
export function paperOutline(seed: number, perSide = 10, wobble = 0.006): UnitPoint[] {
  const rand = createRandom(seed);
  const offset = () => (rand() - 0.5) * 2 * wobble;
  const points: UnitPoint[] = [];
  for (let i = 0; i < perSide; i++) points.push({ x: i / perSide, y: Math.abs(offset()) });
  for (let i = 0; i < perSide; i++) points.push({ x: 1 - Math.abs(offset()), y: i / perSide });
  for (let i = 0; i < perSide; i++) points.push({ x: 1 - i / perSide, y: 1 - Math.abs(offset()) });
  for (let i = 0; i < perSide; i++) points.push({ x: Math.abs(offset()), y: 1 - i / perSide });
  return points;
}

/** The seed of the sheet people write on, so the page and the scene draw the same one. */
export const PAPER_SEED = 11;

/** The paper's irregular outline as an SVG `points` string in a 100 x 100 box, for the sheet every card is written on. */
export const PAPER_OUTLINE_POINTS = paperOutline(PAPER_SEED)
  .map(({ x, y }) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
  .join(" ");
