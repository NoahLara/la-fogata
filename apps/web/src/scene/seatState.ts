import type { View } from "./characters";
import { between, smoothstep } from "./math";
import type { Random } from "./random";

/**
 * Seconds a character takes to turn from the side view into its seat's view, to settle into a seat it already
 * faces, and to hop onto a log.
 */
export const TURN_SECONDS = 0.35;
export const SETTLE_SECONDS = 0.3;
export const HOP_SECONDS = 0.32;
/** The whole arrival takes between these many seconds, a bit different for everyone. */
export const ARRIVAL_SECONDS = { min: 3, max: 4 } as const;

export interface ArrivalTimeline {
  walk: number;
  /** Turning into the seat's view. Zero when the walking view already matches it. */
  turn: number;
  /** Settling into the seat without turning. Zero when there is a turn instead. */
  settle: number;
  hop: number;
  total: number;
}

export function arrivalTimeline(
  rand: Random,
  { log, turn }: { log: boolean; turn: boolean },
): ArrivalTimeline {
  const total = between(rand, ARRIVAL_SECONDS.min, ARRIVAL_SECONDS.max);
  const hop = log ? HOP_SECONDS : 0;
  const turning = turn ? TURN_SECONDS : 0;
  const settle = turn ? 0 : SETTLE_SECONDS;
  return { walk: total - turning - settle - hop, turn: turning, settle, hop, total };
}

/**
 * Whether a character walking in has to turn at its seat. It walks in side view facing where it goes, so it
 * only skips the turn when the seat is a side view and it already arrives facing the way the seat does.
 */
export function needsTurn(seatView: View, endHeading: 1 | -1, seatFacing: 1 | -1): boolean {
  return !(seatView === "side" && endHeading === seatFacing);
}

export type ArrivalPhase = "walking" | "turning" | "settling" | "hopping" | "seated";

export interface ArrivalFrame {
  phase: ArrivalPhase;
  /** How far through the phase, 0..1. Always 1 once seated. */
  progress: number;
}

/** What an arrival is doing `elapsed` seconds in. Phases run in order: walk, turn or settle, hop (log seats only), seated. */
export function arrivalFrame(timeline: ArrivalTimeline, elapsed: number): ArrivalFrame {
  const t = Math.max(0, elapsed);
  const turnStart = timeline.walk;
  const settleStart = turnStart + timeline.turn;
  const hopStart = settleStart + timeline.settle;
  const seatedAt = hopStart + timeline.hop;
  if (t < turnStart) return { phase: "walking", progress: t / timeline.walk };
  if (t < settleStart) return { phase: "turning", progress: (t - turnStart) / timeline.turn };
  if (t < hopStart) return { phase: "settling", progress: (t - settleStart) / timeline.settle };
  if (t < seatedAt) return { phase: "hopping", progress: (t - hopStart) / timeline.hop };
  return { phase: "seated", progress: 1 };
}

/** Walking progress to fraction of the path: constant speed, softened a little at the start and the end. */
export function walkEase(progress: number): number {
  return progress + (smoothstep(0, 1, progress) - progress) * 0.4;
}
