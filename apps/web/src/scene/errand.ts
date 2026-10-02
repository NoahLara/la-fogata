import { HOP_SECONDS, STAND_SECONDS, TURN_SECONDS, SETTLE_SECONDS } from "./seatState";
import type { ArrivalTimeline, LeaveFrame, LeaveTimeline } from "./seatState";
import { leaveFrame } from "./seatState";

/**
 * An errand to the fire and back: stand up, hop down off a log, turn, walk to the stones, lean over them to put
 * something on the fire, and come back the same way. These are the parts of it that don't depend on the seat.
 */
export const ERRAND = {
  /** How much slower than an ordinary arrival or departure every step of an errand is: it is a ritual, not a chore. */
  slow: 1.35,
  /** Seconds to walk between the seat and the stones, each way. */
  walk: 1.15,
  /** Seconds spent leaning over the stones to put the note down. */
  place: 0.7,
  /** How far through the lean the note leaves their hands, 0..1. */
  release: 0.6,
} as const;

export interface ErrandTimeline {
  /** Standing up, hopping down, turning and walking to the stones. */
  out: LeaveTimeline;
  /** Leaning over the stones. */
  place: number;
  /** Seconds from the start until the end of the lean. */
  total: number;
}

export function errandTimeline({ log, turn }: { log: boolean; turn: boolean }): ErrandTimeline {
  const hop = log ? HOP_SECONDS * ERRAND.slow : 0;
  const turning = turn ? TURN_SECONDS * ERRAND.slow : 0;
  const stand = STAND_SECONDS * ERRAND.slow;
  const out: LeaveTimeline = {
    stand,
    hop,
    turn: turning,
    walk: ERRAND.walk,
    total: stand + hop + turning + ERRAND.walk,
  };
  return { out, place: ERRAND.place, total: out.total + ERRAND.place };
}

/** The way back, as an arrival timeline: walk, then turn into the seat or settle, then hop up onto the log. */
export function returnTimeline({ log, turn }: { log: boolean; turn: boolean }): ArrivalTimeline {
  const hop = log ? HOP_SECONDS * ERRAND.slow : 0;
  const turning = turn ? TURN_SECONDS * ERRAND.slow : 0;
  const settle = turn ? 0 : SETTLE_SECONDS * ERRAND.slow;
  return {
    walk: ERRAND.walk,
    turn: turning,
    settle,
    hop,
    total: ERRAND.walk + turning + settle + hop,
  };
}

export type ErrandPhase = LeaveFrame["phase"] | "placing" | "done";

export interface ErrandFrame {
  phase: ErrandPhase;
  /** How far through the phase, 0..1. */
  progress: number;
}

/** What the outbound part of an errand is doing `elapsed` seconds in: it ends with the lean, then it is done. */
export function errandFrame(timeline: ErrandTimeline, elapsed: number): ErrandFrame {
  const { out } = timeline;
  if (elapsed < out.total) {
    const frame = leaveFrame(out, elapsed);
    return { phase: frame.phase, progress: frame.progress };
  }
  const placed = elapsed - out.total;
  if (placed < timeline.place) return { phase: "placing", progress: placed / timeline.place };
  return { phase: "done", progress: 1 };
}

/** How far over the stones they lean, in radians toward the fire, `progress` of the way through the lean. */
export function leanAt(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  // Down quickly, hold while the note leaves the hands, then back up.
  return 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8;
}
