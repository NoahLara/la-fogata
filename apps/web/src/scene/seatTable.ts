import type { View } from "./characters";

export interface SeatSpec {
  /** Angle on the seat ellipse; 90° is the point closest to the viewer. */
  degrees: number;
  /** How the seat is seen: from behind (near seats), in profile (beside the fire) or head-on (far seats). */
  view: View;
  /** Sits on a log instead of the ground. */
  log?: boolean;
}

/**
 * Seven seats around the fire, in an asymmetric ring so no seat is directly behind the flames:
 * two near seats seen from behind (65°, 115°), two beside the fire seen in profile and turned toward it
 * (165°, 15°), and three far seats facing the viewer (225°, 255°, 300°). Three seats have a log (one near,
 * two far). A seat knows nothing about who sits in it: the seat decides the view, the lighting, the log and
 * the lean, and the species only decides the art, so any animal works in any seat.
 */
export const SEATS: readonly SeatSpec[] = [
  { degrees: 65, view: "back" },
  { degrees: 115, view: "back", log: true },
  { degrees: 165, view: "side" },
  { degrees: 15, view: "side" },
  { degrees: 225, view: "front", log: true },
  { degrees: 255, view: "front" },
  { degrees: 300, view: "front", log: true },
];

/** Every seat except the ones seen from behind sits closer to the fire sideways: the ring is squeezed by this much there. */
const FAR_RING_SCALE = 0.8;

export const ringScaleFor = (spec: SeatSpec) => (spec.view === "back" ? 1 : FAR_RING_SCALE);
