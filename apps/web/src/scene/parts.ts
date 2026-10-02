import type { View } from "./characters";
import type { Species } from "./characters/species";
import type { Chain } from "./deform";
import type { Point } from "./layout";

/** What a part is, which decides the gestures that can move it. A tail tip is the end of a tail that can flick alone. */
export type PartKind = "ear" | "tail" | "tailTip" | "head";

/** A part of a character that can move, in the art's own local units (origin at the feet). */
export interface PartSpec extends Chain {
  id: string;
  kind: PartKind;
  /** How far it turns at its tip at the fullest, in radians; positive is clockwise on screen. The sign is the way it flicks. */
  amplitude: number;
}

type ViewParts = Partial<Record<View, readonly PartSpec[]>>;

function ear(
  id: string,
  base: Point,
  tip: Point,
  amplitude: number,
  width = 11,
  falloff = 4,
): PartSpec {
  return { id, kind: "ear", path: [base, tip], width, falloff, amplitude, group: "ear" };
}

function tail(path: readonly Point[], width: number, amplitude: number): PartSpec {
  return { id: "tail", kind: "tail", path, width, falloff: 5, amplitude };
}

/** The end of a tail, from `from` (0 to 1 along it) out to the tip, which flicks on its own. */
function tailTip(path: readonly Point[], from: number, width: number, amplitude: number): PartSpec {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += Math.hypot(
      (path[i] as Point).x - (path[i - 1] as Point).x,
      (path[i] as Point).y - (path[i - 1] as Point).y,
    );
  }
  const start = length * from;
  const result: Point[] = [];
  let walked = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as Point;
    const b = path[i] as Point;
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (result.length === 0 && walked + segment >= start) {
      const t = segment > 0 ? (start - walked) / segment : 0;
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    if (result.length > 0) result.push(b);
    walked += segment;
  }
  return { id: "tailTip", kind: "tailTip", path: result, width, falloff: 3, amplitude };
}

function head(path: readonly Point[], width: number, amplitude: number): PartSpec {
  return { id: "head", kind: "head", path, width, falloff: 8, amplitude };
}

/** Points along a cubic curve, the way the art's own `C` strokes draw it. */
function cubic(p0: Point, p1: Point, p2: Point, p3: Point, steps = 8): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const mix = (a: number, b: number, c: number, d: number) =>
      u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
    return { x: mix(p0.x, p1.x, p2.x, p3.x), y: mix(p0.y, p1.y, p2.y, p3.y) };
  });
}

const p = (x: number, y: number): Point => ({ x, y });

/** Two round ears on the head, seen from the front or the back, as the panda and the bear have them. */
const ROUND_EARS: readonly PartSpec[] = [
  ear("earL", p(-12.5, -90.3), p(-22.4, -101.5), -0.2),
  ear("earR", p(12.5, -90.3), p(22.4, -101.5), 0.2),
];
/** The one round ear that shows in profile. */
const ROUND_EAR_SIDE: readonly PartSpec[] = [ear("ear", p(-5.4, -86), p(-1.8, -96.3), 0.2)];

const CAT_FRONT_TAIL = [
  ...cubic(p(24, -9), p(28, 3), p(6, 6), p(-14, 3)),
  ...cubic(p(-14, 3), p(-24, 1), p(-28, -4), p(-26, -10)).slice(1),
];
const CAT_BACK_TAIL = cubic(p(6, -6), p(28, 6), p(46, 0), p(45, -14));
const CAT_BACK_TAIL_END = cubic(p(45, -14), p(44, -22), p(40, -26), p(37, -24)).slice(1);
const CAT_SIDE_TAIL = [
  ...cubic(p(24, -8), p(38, 0), p(50, 3), p(54, -3)),
  ...cubic(p(54, -3), p(57, -8), p(54, -15), p(50, -16)).slice(1),
];
const CAT_BACK_TAIL_FULL = [...CAT_BACK_TAIL, ...CAT_BACK_TAIL_END];

/** The owl's head and the tufts on it: from the neck up, in the same lean as the rest of the owl in profile. */
const OWL_HEAD: readonly PartSpec[] = [head([p(0, -44), p(0, -90)], 26, 0.22)];

/**
 * Which parts move, per animal and per view. Ears are short chains out of the head, tails long ones out of the
 * body, laid along the circles and strokes the silhouette is built from. An animal or view that isn't here
 * only breathes. Nothing here depends on the seat: any animal works in any seat.
 */
const PARTS: Partial<Record<Species, ViewParts>> = {
  panda: { front: ROUND_EARS, back: ROUND_EARS, side: ROUND_EAR_SIDE },
  bear: { front: ROUND_EARS, back: ROUND_EARS, side: ROUND_EAR_SIDE },
  capybara: {
    front: [
      ear("earL", p(-15.5, -82), p(-17.5, -88), -0.35, 5.5, 2.5),
      ear("earR", p(15.5, -82), p(17.5, -88), 0.35, 5.5, 2.5),
    ],
    back: [
      ear("earL", p(-15.5, -82), p(-17.5, -88), -0.35, 5.5, 2.5),
      ear("earR", p(15.5, -82), p(17.5, -88), 0.35, 5.5, 2.5),
    ],
    side: [ear("ear", p(-15.5, -71.5), p(-16.8, -78.5), 0.35, 5.5, 2.5)],
  },
  rabbit: {
    front: [
      ear("earL", p(-10.4, -71), p(-7.3, -115.9), -0.3, 6.5, 3),
      ear("earR", p(13, -71), p(4.9, -115.6), 0.3, 6.5, 3),
    ],
    back: [
      ear("earL", p(-10.4, -71), p(-7.3, -115.9), -0.3, 6.5, 3),
      ear("earR", p(13, -71), p(5.75, -115.7), 0.3, 6.5, 3),
    ],
    side: [
      ear("earA", p(-10.4, -69.6), p(6.4, -107), 0.3, 6, 3),
      ear("earB", p(-0.4, -70), p(19.6, -93.8), 0.3, 5.5, 3),
    ],
  },
  cat: {
    // The tail lies across the feet, so only its tip flicks there.
    front: [tailTip(CAT_FRONT_TAIL, 0.5, 5, 0.4)],
    back: [tail(CAT_BACK_TAIL_FULL, 5, 0.16), tailTip(CAT_BACK_TAIL_FULL, 0.62, 5, 0.7)],
    side: [tail(CAT_SIDE_TAIL, 5, 0.16), tailTip(CAT_SIDE_TAIL, 0.62, 5, 0.7)],
  },
  fox: {
    front: [tail(cubic(p(31, -20), p(41, -6), p(30, 3), p(9, 2)), 10, 0.22)],
    back: [
      tail(
        [
          p(8, -18),
          p(18.2, -13.5),
          p(27.8, -11.1),
          p(36.4, -10.8),
          p(43.9, -12.7),
          p(49.8, -16.7),
          p(53.9, -22.8),
          p(55.9, -31.1),
          p(56, -36),
        ],
        14,
        0.22,
      ),
    ],
    side: [
      tail(
        [
          p(18, -16),
          p(28, -14.3),
          p(35.9, -15.4),
          p(41.6, -18.8),
          p(45.2, -24),
          p(47.3, -34.2),
          p(46.4, -42),
          p(44, -50),
        ],
        12,
        0.22,
      ),
    ],
  },
  owl: {
    front: OWL_HEAD,
    back: OWL_HEAD,
    side: [head([p(-5.6, -43.6), p(-12, -89.2)], 26, 0.22)],
  },
};

/** The parts that can move for this animal seen from this view. Empty when none do. */
export function partsFor(species: Species, view: View): readonly PartSpec[] {
  return PARTS[species]?.[view] ?? [];
}
