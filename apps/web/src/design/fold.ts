/** How the sheet of paper is tilted on the page, in radians (the same -1° as `.paper-sheet` in globals.css). */
export const PAPER_TILT = (-1 * Math.PI) / 180;

/** The beats of handing a burden over on the page, in seconds. */
export const FOLD = {
  /** The title and buttons fade, leaving only paper and writing. */
  chromeFade: 0.2,
  /** The writing fades as the first fold begins, so nothing that differs in how it wraps shows. */
  textFade: 0.25,
  /** The bottom half folds up over the top, then the right half over the left, like a letter folded twice. */
  first: 0.6,
  second: 0.55,
  /** The folded note shrinks and flies down to the animal's paws. */
  fly: 0.7,
} as const;

/** From pressing the button until the note is in the animal's paws. */
export const FOLD_TOTAL = FOLD.chromeFade + FOLD.first + FOLD.second + FOLD.fly;

export interface FlyTransform {
  /** Translation, in the folded note's own (tilted) frame. */
  x: number;
  y: number;
  /** Turn, in radians, that cancels the tilt of what it sits in so it ends level. */
  rotate: number;
  scale: number;
}

/**
 * The transform that takes a note whose middle is at `from` (window coordinates) to `to`, made as tall as
 * `to.height`. The note sits inside something tilted by `tilt`, so the move is expressed in that tilted frame.
 */
export function flyTransform(
  from: { x: number; y: number; height: number },
  to: { x: number; y: number; height: number },
  tilt: number,
): FlyTransform {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Undo the tilt: a step of (x, y) in the tilted frame is the step R(tilt)·(x, y) on the screen.
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos,
    rotate: -tilt,
    scale: from.height > 0 ? to.height / from.height : 1,
  };
}
