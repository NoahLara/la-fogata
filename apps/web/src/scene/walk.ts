import type { Point, SceneLayout, SeatPosition } from "./layout";
import { between, clamp } from "./math";
import type { Random } from "./random";

/** A polyline with its cumulative length, so it can be walked at a given distance. */
export interface Path {
  points: readonly Point[];
  /** Distance from the start to each point. */
  cumulative: readonly number[];
  length: number;
}

export interface PathSample extends Point {
  /** Unit vector of the direction of travel. */
  dx: number;
  dy: number;
}

export function pathFromPoints(points: readonly Point[]): Path {
  const cumulative: number[] = [];
  let length = 0;
  points.forEach((point, i) => {
    const previous = points[i - 1];
    if (previous) length += Math.hypot(point.x - previous.x, point.y - previous.y);
    cumulative.push(length);
  });
  return { points, cumulative, length };
}

/** The point `distance` along the path (clamped to its ends) and the direction it is heading there. */
export function pointAt(path: Path, distance: number): PathSample {
  const { points, cumulative } = path;
  const last = points.length - 1;
  const first = points[0];
  if (!first || last === 0) return { x: first?.x ?? 0, y: first?.y ?? 0, dx: 1, dy: 0 };
  const d = clamp(distance, 0, path.length);
  let i = 1;
  while (i < last && (cumulative[i] ?? 0) < d) i++;
  const a = points[i - 1] as Point;
  const b = points[i] as Point;
  const segment = (cumulative[i] ?? 0) - (cumulative[i - 1] ?? 0);
  const t = segment > 0 ? (d - (cumulative[i - 1] ?? 0)) / segment : 0;
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    dx: (b.x - a.x) / length,
    dy: (b.y - a.y) / length,
  };
}

/** A smooth curve through the control points (uniform Catmull-Rom), sampled into a polyline. */
export function smoothCurve(controls: readonly Point[], samplesPerSegment = 20): Point[] {
  if (controls.length < 3) return [...controls];
  const result: Point[] = [];
  for (let i = 0; i < controls.length - 1; i++) {
    const p1 = controls[i] as Point;
    const p2 = controls[i + 1] as Point;
    const p0 = controls[i - 1] ?? p1;
    const p3 = controls[i + 2] ?? p2;
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const blend = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      result.push({
        x: blend(p0.x, p1.x, p2.x, p3.x),
        y: blend(p0.y, p1.y, p2.y, p3.y),
      });
    }
  }
  result.push(controls[controls.length - 1] as Point);
  return result;
}

/** The ground around the fire nobody walks across: the stone ring plus room for a body. */
export interface KeepOut {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function keepOutZone(layout: SceneLayout): KeepOut {
  return { cx: layout.cx, cy: layout.cy, rx: 92 * layout.u, ry: 34 * layout.u };
}

/** How far a point is from the zone's centre, with 1 meaning on its edge. */
export function keepOutRadius(zone: KeepOut, point: Point): number {
  return Math.hypot((point.x - zone.cx) / zone.rx, (point.y - zone.cy) / zone.ry);
}

/** The point itself, or the nearest point on the zone's edge if it is inside. */
export function pushOut(zone: KeepOut, point: Point): Point {
  const r = keepOutRadius(zone, point);
  if (r >= 1) return point;
  // Dead centre has no direction; leave toward the viewer.
  const nx = r === 0 ? 0 : (point.x - zone.cx) / zone.rx / r;
  const ny = r === 0 ? 1 : (point.y - zone.cy) / zone.ry / r;
  return { x: zone.cx + nx * zone.rx, y: zone.cy + ny * zone.ry };
}

/** Whether the straight line from `a` to `b` passes through the zone. */
function crossesZone(zone: KeepOut, a: Point, b: Point): boolean {
  const ax = (a.x - zone.cx) / zone.rx;
  const ay = (a.y - zone.cy) / zone.ry;
  const bx = (b.x - zone.cx) / zone.rx;
  const by = (b.y - zone.cy) / zone.ry;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 0 ? clamp(-(ax * dx + ay * dy) / lengthSquared, 0, 1) : 0;
  return Math.hypot(ax + dx * t, ay + dy * t) < 1;
}

/** A point beside the zone, on the viewer's side when `inFront`, that a path can bend through to get around it. */
function waypointAround(zone: KeepOut, from: Point, to: Point, inFront: boolean): Point {
  const nx = (to.x - from.x) / zone.rx;
  const ny = (to.y - from.y) / zone.ry;
  const length = Math.hypot(nx, ny) || 1;
  // Perpendicular to the line of travel, in the zone's own (circular) units.
  let px = -ny / length;
  let py = nx / length;
  if (py < 0 === inFront) {
    px = -px;
    py = -py;
  }
  return { x: zone.cx + px * zone.rx * 1.5, y: zone.cy + py * zone.ry * 1.5 };
}

export interface ArrivalPlanOptions {
  /** Whether the seat has a log: the walk then ends in front of it, and the character hops on. */
  log: boolean;
  rand: Random;
  /** Where to start instead of the usual entry. For tests. */
  from?: Point;
  /** Ends with a straight walk toward the fire, so the character arrives facing it. */
  faceFire?: boolean;
}

export interface ArrivalPlan {
  /** Ground path from the entry to the point where the character turns. */
  path: Path;
  /** Where the walk ends and the turn happens: the seat itself, or the ground in front of its log. */
  approach: Point;
  /** Whether the character comes out of the tree line rather than in from the side of the screen. */
  fromTrees: boolean;
  /** Which way it is heading on screen as the walk ends: 1 to the right, -1 to the left. */
  endHeading: 1 | -1;
}

/** How far before the seat the straight, fire-facing walk begins, in character heights. */
const STRAIGHT_FINISH = 1;

/** Where a character starts and ends its walk: far seats come out of the trees, everyone else walks in from the nearest edge. */
function entryPoint(layout: SceneLayout, seat: SeatPosition, rand: Random): Point {
  const side = seat.x < layout.cx ? -1 : 1;
  if (seat.y < layout.cy) {
    // Out of the tree line, off to the side, so there is a walk to make.
    const x = seat.x + side * between(rand, 0.18, 0.3) * layout.width;
    return {
      x: clamp(x, layout.width * 0.06, layout.width * 0.94),
      y: layout.horizon + 4 * layout.u,
    };
  }
  const margin = layout.characterHeight * 0.5;
  const y = seat.y + between(rand, -0.1, 0.5) * layout.ry;
  return {
    x: side < 0 ? -margin : layout.width + margin,
    y: clamp(y, layout.horizon, layout.sceneBottom - 4 * layout.u),
  };
}

/**
 * The walk from outside the scene to a seat: a gentle curve that bends around the fire instead of through it.
 * Whatever the control points, no sample of the path is left inside the keep-out zone.
 */
export function planArrival(
  layout: SceneLayout,
  seat: SeatPosition,
  { log, rand, from, faceFire = false }: ArrivalPlanOptions,
): ArrivalPlan {
  const zone = keepOutZone(layout);
  const approach: Point = log
    ? { x: seat.x, y: seat.y + layout.characterHeight * 0.1 }
    : { x: seat.x, y: seat.y };
  const start = from ?? entryPoint(layout, seat, rand);

  // Facing the fire at the end means the last stretch runs level toward it, so the curve goes to where that begins.
  const toward = layout.cx >= approach.x ? 1 : -1;
  const target: Point = faceFire
    ? { x: approach.x - toward * layout.characterHeight * STRAIGHT_FINISH, y: approach.y }
    : approach;

  const controls: Point[] = [start];
  if (crossesZone(zone, start, target)) {
    controls.push(waypointAround(zone, start, target, seat.y >= layout.cy));
  } else {
    // A bulge to one side so the walk is never a ruler line.
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const bulge = between(rand, -0.12, 0.12) * length;
    controls.push({
      x: start.x + dx / 2 - (dy / length) * bulge,
      y: start.y + dy / 2 + (dx / length) * bulge,
    });
  }
  controls.push(target);

  const samples = smoothCurve(controls).map((point) => pushOut(zone, point));
  if (faceFire) {
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      samples.push({ x: target.x + ((approach.x - target.x) * i) / steps, y: approach.y });
    }
  }
  samples[samples.length - 1] = approach;
  const before = samples[samples.length - 2] ?? start;
  return {
    path: pathFromPoints(samples),
    approach,
    fromTrees: seat.y < layout.cy,
    endHeading: approach.x >= before.x ? 1 : -1,
  };
}

/**
 * Size of a character standing at `y`, relative to its size at `seatY`. Depth makes people smaller toward
 * the horizon, the same way the seats are scaled, so a walker grows into its seat's size exactly.
 */
export function scaleRatioAt(layout: SceneLayout, y: number, seatY: number): number {
  const factor = (at: number) => {
    const depth = (at - (layout.cy - layout.ry)) / (2 * layout.ry);
    return 0.74 + 0.3 * clamp(depth, -0.6, 1.3);
  };
  return factor(y) / factor(seatY);
}

export interface DeparturePlan {
  /** Ground path from the seat (or the ground in front of its log) out of the scene. */
  path: Path;
  /** Where the walk starts: the seat itself, or the ground in front of its log. */
  approach: Point;
  /** Whether it goes into the tree line rather than off the side of the screen. */
  toTrees: boolean;
  /** Which way it is heading on screen as the walk starts: 1 to the right, -1 to the left. */
  startHeading: 1 | -1;
}

/**
 * The way out: the way in, run backwards. Far seats go into the trees and the rest to the nearest edge, on a
 * curve around the fire, and side seats first walk straight away from it.
 */
export function planDeparture(
  layout: SceneLayout,
  seat: SeatPosition,
  options: ArrivalPlanOptions,
): DeparturePlan {
  const arrival = planArrival(layout, seat, options);
  const points = [...arrival.path.points].reverse();
  const first = points[0] ?? arrival.approach;
  const second = points[1] ?? first;
  return {
    path: pathFromPoints(points),
    approach: arrival.approach,
    toTrees: arrival.fromTrees,
    startHeading: second.x >= first.x ? 1 : -1,
  };
}
