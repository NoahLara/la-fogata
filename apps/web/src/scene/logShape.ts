import type { Point } from "./layout";
import { clamp } from "./math";

/**
 * A seat's log, in the characters' local units (about 106 per character), with the origin on the ground under
 * the middle of the log and y pointing down the screen.
 */
export const LOG = {
  /** About as wide as a character sits; the log is a bit longer than that. */
  baseWidth: 66,
  length: 66 * 1.6,
  radius: 22,
  /** How high a character's seat point sits above the ground when on the log: it sinks into it, legs in front. */
  seatHeight: 22 * 2 * 0.64,
} as const;

export interface LogShapeInput {
  /** Where the seat is on the circle around the fire, in radians; 90° is the point nearest the viewer. */
  angle: number;
  /** How much the ground is squashed on screen: the ratio of the circle's depth to its width. */
  squash: number;
  /** Unit vector along the ground from the log to the fire, with x sideways and y toward the viewer. */
  toFire: Point;
}

/** A slice of the log's side, from one angle around its axis to the next, along its whole length. */
export interface Strip {
  /** The four corners: back end then front end at the first angle, front end then back end at the second. */
  points: [Point, Point, Point, Point];
  /** 0..1: how much the fire lights it. */
  lit: number;
  /** 0..1: how much the sky lights it. The top of the log catches the most. */
  top: number;
}

/** The sawn end that faces the viewer, as an ellipse: the centre plus the two half-axes. */
export interface Cap {
  center: Point;
  up: Point;
  side: Point;
  lit: number;
}

export interface LogShape {
  /** From one end of the log to the other, on screen. Shorter than the log when it points toward the viewer. */
  axis: Point;
  /** The visible strips of the log's side, which together make its whole silhouette except the cap. */
  strips: Strip[];
  /** Absent when the log lies across the view and neither end faces the viewer. */
  cap?: Cap;
  /** A point on the surface at an angle around the axis and a position along it, -1 (back end) to 1 (front end). */
  surface(theta: number, along: number): Point;
  /** Whether the surface at this angle faces the viewer. */
  visible(theta: number): boolean;
}

/** Below this the end of the log is too edge-on to show. */
const MIN_CAP_FACING = 0.1;

/**
 * A log lying on the ground as a cylinder, tangent to the circle around the fire, seen from above at an angle
 * (the ground is squashed by `squash`). It is built as the cylinder it is, so near logs lie almost level, logs
 * at the sides slant and shorten, and the end that faces the viewer shows as an ellipse.
 */
export function logShape({ angle, squash, toFire }: LogShapeInput, steps = 28): LogShape {
  const c = clamp(squash, 0.05, 0.95);
  const cosElevation = Math.sqrt(1 - c * c);
  const { length, radius } = LOG;

  // Along the ground the log lies tangent to the circle; `side` is its horizontal direction across it.
  const along = { x: -Math.sin(angle), z: Math.cos(angle) };
  const across = { x: -along.z, z: along.x };
  const axis = { x: along.x * length, y: along.z * length * c };
  const up = { x: 0, y: -cosElevation };
  const side = { x: across.x, y: across.z * c };
  const middle = { x: 0, y: -radius * cosElevation };
  const half = { x: axis.x / 2, y: axis.y / 2 };

  const surface = (theta: number, t: number): Point => ({
    x: middle.x + t * half.x + radius * (Math.cos(theta) * up.x + Math.sin(theta) * side.x),
    y: middle.y + t * half.y + radius * (Math.cos(theta) * up.y + Math.sin(theta) * side.y),
  });
  // The viewer is in front of the ground and above it, at the angle that squashes the ground by `c`.
  const visible = (theta: number) =>
    Math.sin(theta) * across.z * cosElevation + Math.cos(theta) * c > 0;
  // The fire sits at about the height of the log's top, so it lights tops a little and sides a lot.
  const light = (horizontal: number, vertical: number) =>
    clamp(horizontal * 0.85 + vertical * 0.4, 0, 1);

  const strips: Strip[] = [];
  for (let i = 0; i < steps; i++) {
    const from = (i / steps) * Math.PI * 2;
    const to = ((i + 1) / steps) * Math.PI * 2;
    const mid = (from + to) / 2;
    if (!visible(mid)) continue;
    strips.push({
      points: [surface(from, -1), surface(from, 1), surface(to, 1), surface(to, -1)],
      lit: light(Math.sin(mid) * (across.x * toFire.x + across.z * toFire.y), Math.cos(mid)),
      top: Math.max(0, Math.cos(mid)),
    });
  }

  let cap: Cap | undefined;
  if (Math.abs(along.z) > MIN_CAP_FACING) {
    // The end whose outward direction points toward the viewer.
    const end = Math.sign(along.z);
    cap = {
      center: { x: middle.x + end * half.x, y: middle.y + end * half.y },
      up: { x: up.x * radius, y: up.y * radius },
      side: { x: side.x * radius, y: side.y * radius },
      lit: light(end * (along.x * toFire.x + along.z * toFire.y), 0),
    };
  }

  return { axis, strips, cap, surface, visible };
}
