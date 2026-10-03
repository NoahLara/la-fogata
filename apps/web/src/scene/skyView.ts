import { clamp, smoothstep } from "./math";
import { turnOf, wrap } from "./panorama";

/** Under this much movement (pixels) a press is a tap, not a drag. */
export const DRAG_THRESHOLD = 6;

export type DragIntent = "tap" | "turn" | "vertical";

/** What a press that has moved `dx`, `dy` pixels is: a tap, a drag that turns the sky, or a mostly vertical one. */
export function dragIntent(dx: number, dy: number, threshold = DRAG_THRESHOLD): DragIntent {
  if (Math.hypot(dx, dy) < threshold) return "tap";
  return Math.abs(dx) >= Math.abs(dy) ? "turn" : "vertical";
}

/** How long (seconds) the sky takes to lose most of its speed after it is let go, and when it counts as stopped (px/s). */
export const INERTIA_TAU = 0.6;
export const INERTIA_STOP_SPEED = 8;
export const MAX_SPEED = 4000;

/** One step of the sky coasting: the speed it has after `dt` seconds and how far it went. Frame-rate independent. */
export function inertiaStep(
  velocity: number,
  dt: number,
  tau = INERTIA_TAU,
): { velocity: number; distance: number } {
  const decay = Math.exp(-dt / tau);
  const next = velocity * decay;
  return {
    velocity: Math.abs(next) < INERTIA_STOP_SPEED ? 0 : next,
    distance: velocity * tau * (1 - decay),
  };
}

/**
 * The sky is always turning by itself, at this many pixels a second whatever the screen: about what feels right on a
 * phone, and the same speed on a laptop, where a faster drift (the same time per turn) would race. Nothing stops it
 * but a finger while it is down, an open star card and reduced motion.
 */
export const AUTO_PIXELS_PER_SECOND = 10;
/** Once an arrow has been pressed it turns like a carousel, faster, and doesn't stop. */
export const CAROUSEL_PIXELS_PER_SECOND = 16;

/** How long (seconds) a smooth turn takes for `distance` pixels on a viewport this wide. */
export function glideDuration(distance: number, viewport: number): number {
  return clamp(0.6 + 0.5 * (Math.abs(distance) / Math.max(1, viewport)), 0.6, 1.8);
}

/** The speed of a finger from its last few positions: 0 if it stopped before it was lifted. */
export class VelocityTracker {
  private samples: { position: number; time: number }[] = [];
  private static readonly WINDOW = 0.1;
  private static readonly STALE = 0.08;

  reset(): void {
    this.samples = [];
  }

  add(position: number, time: number): void {
    this.samples.push({ position, time });
    while (
      this.samples.length > 2 &&
      time - (this.samples[0]?.time ?? time) > VelocityTracker.WINDOW
    )
      this.samples.shift();
  }

  /** Pixels per second at `now`. */
  velocity(now: number): number {
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (!first || !last || first === last) return 0;
    if (now - last.time > VelocityTracker.STALE) return 0;
    const span = last.time - first.time;
    return span > 0 ? (last.position - first.position) / span : 0;
  }
}

interface Glide {
  /** Where it started and how far it goes, as shares of the panorama. */
  from: number;
  delta: number;
  duration: number;
  elapsed: number;
  done: (() => void) | undefined;
}

/**
 * How the panorama is turned: the view's one state, free of PixiJS. The turn is a share of the panorama (0 to 1),
 * so a resize or a rotated phone keeps the same view. It changes by a finger dragging, by coasting once let go,
 * by a smooth turn to a place (a ritual, a star that took focus), and, when nothing else is going on, a very slow
 * turn of its own.
 */
export class SkyView {
  private current: number;
  private panorama = 1;
  private velocity = 0;
  private dragging = false;
  private position = 0;
  private tracker = new VelocityTracker();
  private glide: Glide | undefined;
  /** Which way it turns by itself, and whether at the carousel's speed (set by an arrow) or the idle one. */
  private direction: 1 | -1 = 1;
  private fast = false;
  private pauses = 0;

  constructor(turn = 0) {
    this.current = wrap(turn, 1);
  }

  /** How far the sky is turned, from 0 up to (not including) 1. */
  get turn(): number {
    return this.current;
  }

  get width(): number {
    return this.panorama;
  }

  /** How far the sky is turned, in pixels. */
  get offset(): number {
    return this.current * this.panorama;
  }

  /** The panorama is this wide now; the view keeps its share. */
  setWidth(width: number): void {
    this.panorama = Math.max(1, width);
  }

  setOffset(offset: number): void {
    this.current = turnOf(offset, this.panorama);
  }

  /** A finger went down on the sky. */
  begin(time: number): void {
    // A smooth turn that a finger cuts short still says it is done, so whatever waited for it goes on.
    const cut = this.glide;
    this.glide = undefined;
    cut?.done?.();
    this.velocity = 0;
    this.dragging = true;
    this.position = 0;
    this.tracker.reset();
    this.tracker.add(0, time);
  }

  /** The finger moved `dx` pixels to the right: the sky follows it. */
  drag(dx: number, time: number): void {
    if (!this.dragging) return;
    this.moveBy(-dx);
    this.position -= dx;
    this.tracker.add(this.position, time);
  }

  /** The finger lifted: the sky coasts on at the speed it had, unless motion is reduced. */
  release(time: number, reduced: boolean): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.velocity = reduced ? 0 : clamp(this.tracker.velocity(time), -MAX_SPEED, MAX_SPEED);
  }

  /**
   * Turns smoothly by `delta` pixels (positive moves the stars to the left), then calls `done`; at once when motion
   * is reduced or there is nowhere to go. A turn in progress is replaced. Returns a way to cancel it (`done` is
   * then never called).
   */
  glideBy(
    delta: number,
    options: { reduced: boolean; viewport: number; done?: () => void },
  ): () => void {
    const replaced = this.glide;
    this.glide = undefined;
    replaced?.done?.();
    this.velocity = 0;
    if (delta === 0 || options.reduced) {
      this.moveBy(delta);
      options.done?.();
      return () => {};
    }
    const glide: Glide = {
      from: this.current,
      delta: delta / this.panorama,
      duration: glideDuration(delta, options.viewport),
      elapsed: 0,
      done: options.done,
    };
    this.glide = glide;
    return () => {
      if (this.glide === glide) this.glide = undefined;
    };
  }

  /** Whether a smooth turn or coasting is going on. */
  get moving(): boolean {
    return this.glide !== undefined || this.velocity !== 0;
  }

  /**
   * Sets the sky turning like a carousel: `1` moves the stars to the left (the sky reveals what is to the right),
   * `-1` moves them to the right. It keeps going, and nothing but another arrow changes its way.
   */
  setCarousel(direction: 1 | -1): void {
    this.direction = direction;
    this.fast = true;
  }

  /** Stops the sky turning by itself (a star's card is open) until the returned function is called. */
  pauseAuto(): () => void {
    this.pauses++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.pauses--;
    };
  }

  /**
   * How fast the sky turns by itself, in pixels per second: positive moves the stars to the left. 0 with reduced
   * motion, or while it is paused, when it doesn't turn by itself. A ritual uses it to know where a star will be when its light arrives.
   */
  autoSpeed(reduced: boolean): number {
    if (reduced) return 0;
    return this.pauses > 0
      ? 0
      : this.direction * (this.fast ? CAROUSEL_PIXELS_PER_SECOND : AUTO_PIXELS_PER_SECOND);
  }

  /** Moves the sky on by `dt` seconds. True if the view changed. */
  step(dt: number, reduced: boolean): boolean {
    const before = this.current;
    const glide = this.glide;
    if (glide) {
      glide.elapsed += dt;
      const progress = smoothstep(0, glide.duration, glide.elapsed);
      this.current = wrap(glide.from + glide.delta * progress, 1);
      if (glide.elapsed >= glide.duration) {
        this.glide = undefined;
        glide.done?.();
      }
    } else if (!this.dragging && this.velocity !== 0) {
      const next = inertiaStep(this.velocity, dt);
      this.velocity = next.velocity;
      this.moveBy(next.distance);
    } else if (!this.dragging && !reduced && this.pauses === 0) {
      this.moveBy(this.autoSpeed(false) * dt);
    }
    return this.current !== before;
  }

  private moveBy(pixels: number): void {
    this.current = wrap(this.current + pixels / this.panorama, 1);
  }
}
