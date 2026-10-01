import { clamp } from "./math";

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The smallest block of whole pixels of a `canvasWidth` x `canvasHeight` canvas that holds an ellipse centered
 * at (`cx`, `cy`) with radii `rx` and `ry`. Coordinates are in local units, drawn at `resolution` pixels per unit.
 * Always at least one pixel, and never outside the canvas.
 */
export function ellipseCrop(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  resolution: number,
  canvasWidth: number,
  canvasHeight: number,
): PixelRect {
  const x0 = clamp(Math.floor((cx - rx) * resolution), 0, canvasWidth - 1);
  const x1 = clamp(Math.ceil((cx + rx) * resolution), x0 + 1, canvasWidth);
  const y0 = clamp(Math.floor((cy - ry) * resolution), 0, canvasHeight - 1);
  const y1 = clamp(Math.ceil((cy + ry) * resolution), y0 + 1, canvasHeight);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
