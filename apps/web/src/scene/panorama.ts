import type { Point } from "./layout";
import { clamp } from "./math";

/** The sky is this many viewport widths around, and is drawn in as many sections, one viewport wide each. */
export const PANORAMA_VIEWPORTS = 4;

/** How wide the whole panorama is for a viewport this wide. */
export function panoramaWidth(viewport: number): number {
  return viewport * PANORAMA_VIEWPORTS;
}

/** `value` brought into [0, period), however far out it is. */
export function wrap(value: number, period: number): number {
  const result = value % period;
  const positive = result < 0 ? result + period : result;
  // A tiny negative remainder can round up to exactly one period.
  return positive >= period ? 0 : positive;
}

/** `value` brought into [-period / 2, period / 2): the shortest signed way round the panorama. */
export function wrapSigned(value: number, period: number): number {
  return wrap(value + period / 2, period) - period / 2;
}

/** The turn is kept as a share of the panorama (0 to 1), so a different screen size shows the same view. */
export function offsetOf(turn: number, width: number): number {
  return wrap(turn, 1) * width;
}

export function turnOf(offset: number, width: number): number {
  return wrap(offset / width, 1);
}

/**
 * Where the panorama's `px` is on screen when the view is turned to `offset`. The answer is the copy nearest the
 * viewport, so it is in [-(width - viewport) / 2, viewport + (width - viewport) / 2): a point just off the left
 * edge is a small negative number, not a position at the far end of the panorama. Seamless across the wrap.
 */
export function screenX(px: number, offset: number, width: number, viewport: number): number {
  const margin = (width - viewport) / 2;
  return wrap(px - offset + margin, width) - margin;
}

/** The panorama's sections, 0 to `PANORAMA_VIEWPORTS - 1`, as wide as the viewport. The one `px` falls in. */
export function sectionOf(px: number, width: number): number {
  return Math.floor(wrap(px, width) / (width / PANORAMA_VIEWPORTS));
}

/** Where the left edge of section `index` is on screen. */
export function sectionLeft(
  index: number,
  offset: number,
  width: number,
  viewport: number,
): number {
  return screenX(index * (width / PANORAMA_VIEWPORTS), offset, width, viewport);
}

/** The sections that show on screen, or within `pad` pixels of it: nothing else needs drawing or updating. */
export function visibleSections(
  offset: number,
  width: number,
  viewport: number,
  pad = 0,
): number[] {
  const sectionWidth = width / PANORAMA_VIEWPORTS;
  const shown: number[] = [];
  for (let index = 0; index < PANORAMA_VIEWPORTS; index++) {
    const left = sectionLeft(index, offset, width, viewport);
    if (left < viewport + pad && left + sectionWidth > -pad) shown.push(index);
  }
  return shown;
}

/**
 * How far to turn the sky (in pixels of offset, the short way round) so the point of the panorama at `x` sits in the
 * middle of the screen.
 */
export function turnToCenter(x: number, offset: number, width: number, viewport: number): number {
  return wrapSigned(x - viewport / 2 - offset, width);
}

/** How far a star must stay from the edges of the screen for the sky to count it as comfortably in view. */
export function comfortMargin(viewport: number): number {
  return Math.max(48, viewport * 0.12);
}

export interface BringView {
  /** Where the panorama is turned to now. */
  offset: number;
  viewport: number;
  /** The panorama's width. */
  width: number;
  /** How far in from the edges a star must be. */
  margin: number;
}

/**
 * How far to turn the sky (in pixels of offset; positive moves the stars to the left) so the star at `star`, a point
 * of the panorama, is comfortably in view: inside the margins. 0 if it already is; otherwise the shortest turn that
 * puts it at the nearest edge of the comfortable part of the screen.
 */
export function turnToBring(star: Point, view: BringView): number {
  const { offset, viewport, width, margin } = view;
  const lo = Math.min(margin, viewport / 2);
  const hi = Math.max(viewport - margin, viewport / 2);
  const now = screenX(star.x, offset, width, viewport);
  if (now >= lo && now <= hi) return 0;
  return wrapSigned(star.x - clamp(now, lo, hi) - offset, width);
}

/**
 * How far to turn the sky to put `centerX` (the middle of the visitor's constellation) in the middle of the screen,
 * and then, if the constellation is wider than the screen and `star` is out of view there, a little further to bring
 * `star` in.
 */
export function turnToCenterShowing(centerX: number, star: Point, view: BringView): number {
  const toCenter = turnToCenter(centerX, view.offset, view.width, view.viewport);
  return toCenter + turnToBring(star, { ...view, offset: view.offset + toCenter });
}
