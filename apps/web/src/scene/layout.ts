import { toRadians } from "./math";

export interface Insets {
  top: number;
  bottom: number;
}

export interface SceneLayout {
  width: number;
  height: number;
  /** Global scale factor: 1 at an 800x560 scene area. */
  u: number;
  /** Fire center. */
  cx: number;
  cy: number;
  /** Radii of the ellipse the seats sit on. */
  rx: number;
  ry: number;
  horizon: number;
  sceneTop: number;
  sceneBottom: number;
  /** Height in px of a character at scale 1. */
  characterHeight: number;
}

export interface SeatPosition {
  x: number;
  y: number;
  /** Depth scale: far seats are smaller. */
  scale: number;
  /** Near seats are on the viewer's side of the fire: characters are seen from behind. */
  near: boolean;
}

export function computeLayout(width: number, height: number, insets: Insets): SceneLayout {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const sceneTop = insets.top;
  const sceneBottom = h - insets.bottom;
  const avail = Math.max(220, sceneBottom - sceneTop);
  const u = Math.max(0.35, Math.min(w / 800, avail / 560));
  const rx = Math.min(380 * u, w * 0.44);
  const ry = rx * 0.3;
  const cx = w / 2;
  let cy = sceneTop + avail * 0.68;
  if (cy + ry + 8 > sceneBottom) cy = sceneBottom - ry - 8;
  return {
    width: w,
    height: h,
    u,
    cx,
    cy,
    rx,
    ry,
    horizon: cy - ry - 55 * u,
    sceneTop,
    sceneBottom,
    characterHeight: 118 * u,
  };
}

/**
 * Seat at `degrees` on the ellipse; 90° is the point closest to the viewer.
 * `horizontalScale` squeezes the ring sideways (1 keeps it as is) without changing depth.
 */
export function seatPosition(
  layout: SceneLayout,
  degrees: number,
  horizontalScale = 1,
): SeatPosition {
  const angle = toRadians(degrees);
  const x = layout.cx + layout.rx * horizontalScale * Math.cos(angle);
  const y = layout.cy + layout.ry * Math.sin(angle);
  const depth = (y - (layout.cy - layout.ry)) / (2 * layout.ry);
  return { x, y, scale: 0.74 + 0.3 * depth, near: Math.sin(angle) > 0.05 };
}

export interface Point {
  x: number;
  y: number;
}

/** Unit vector from `from` to `to` and the distance between them. Coincident points give a zero vector and a length of 1. */
export function directionToFire(from: Point, to: Point): Point & { length: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length, length };
}

/** Near characters may be at most this much bigger than the biggest far one, so the near side doesn't tower. */
export const NEAR_SCALE_RATIO = 1.15;

/** Caps every near seat's scale at `ratio` times the largest far seat's scale. */
export function capNearScales(
  seats: readonly SeatPosition[],
  ratio = NEAR_SCALE_RATIO,
): SeatPosition[] {
  const farScales = seats.filter((seat) => !seat.near).map((seat) => seat.scale);
  if (farScales.length === 0) return [...seats];
  const cap = ratio * Math.max(...farScales);
  return seats.map((seat) => (seat.near ? { ...seat, scale: Math.min(seat.scale, cap) } : seat));
}

/**
 * Where the word from the fire is bottom-aligned: in the sky above the tree line, and above the head of any
 * character on the far side of the fire, so it never covers a seat or a log.
 */
export function wordBandBottom(layout: SceneLayout): number {
  const aboveTrees = layout.horizon - 70 * layout.u;
  const aboveHeads = layout.cy - layout.ry - layout.characterHeight - 24;
  return Math.max(0, Math.min(aboveTrees, aboveHeads));
}
