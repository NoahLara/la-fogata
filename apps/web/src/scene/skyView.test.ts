import { describe, expect, it, vi } from "vitest";
import {
  AUTO_PIXELS_PER_SECOND,
  CAROUSEL_PIXELS_PER_SECOND,
  DRAG_THRESHOLD,
  dragIntent,
  glideDuration,
  inertiaStep,
  INERTIA_STOP_SPEED,
  SkyView,
  VelocityTracker,
} from "./skyView";

describe("dragIntent: a tap or a drag", () => {
  it("is a tap under the threshold, in any direction", () => {
    expect(dragIntent(0, 0)).toBe("tap");
    expect(dragIntent(5, 0)).toBe("tap");
    expect(dragIntent(-3, 4)).toBe("tap");
    expect(dragIntent(4, 4)).toBe("tap");
  });

  it("is a drag from the threshold on", () => {
    expect(DRAG_THRESHOLD).toBe(6);
    expect(dragIntent(6, 0)).toBe("turn");
    expect(dragIntent(-6, 1)).toBe("turn");
    expect(dragIntent(4.3, 4.3)).toBe("turn");
  });

  it("tells a turn from a vertical drag by the way it moves most", () => {
    expect(dragIntent(20, 5)).toBe("turn");
    expect(dragIntent(5, -20)).toBe("vertical");
    expect(dragIntent(8, 8)).toBe("turn");
  });
});

describe("inertiaStep: coasting", () => {
  it("loses speed each step and goes a shorter way", () => {
    let velocity = 1000;
    let last = Infinity;
    for (let i = 0; i < 20; i++) {
      const step = inertiaStep(velocity, 1 / 60);
      expect(step.velocity).toBeLessThan(velocity);
      expect(step.distance).toBeGreaterThan(0);
      expect(step.distance).toBeLessThan(last);
      last = step.distance;
      velocity = step.velocity;
    }
  });

  it("goes the same distance whatever the frame rate", () => {
    const run = (dt: number) => {
      let velocity = 800;
      let distance = 0;
      for (let t = 0; t < 1 - 1e-9; t += dt) {
        const step = inertiaStep(velocity, dt);
        velocity = step.velocity;
        distance += step.distance;
      }
      return distance;
    };
    expect(run(1 / 30)).toBeCloseTo(run(1 / 120), 3);
  });

  it("goes the other way for a negative speed", () => {
    expect(inertiaStep(-500, 0.016).distance).toBeLessThan(0);
  });

  it("stops once it is slow enough, and never starts again", () => {
    let velocity = 500;
    for (let i = 0; i < 600 && velocity !== 0; i++)
      velocity = inertiaStep(velocity, 1 / 60).velocity;
    expect(velocity).toBe(0);
    expect(inertiaStep(INERTIA_STOP_SPEED - 1, 1 / 60).velocity).toBe(0);
    expect(inertiaStep(0, 1 / 60)).toEqual({ velocity: 0, distance: 0 });
  });
});

describe("VelocityTracker", () => {
  it("measures speed over the last moments", () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0);
    tracker.add(10, 0.016);
    tracker.add(20, 0.032);
    expect(tracker.velocity(0.033)).toBeCloseTo(625, 0);
  });

  it("is zero if the finger rested before it lifted", () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0);
    tracker.add(50, 0.016);
    expect(tracker.velocity(0.5)).toBe(0);
  });

  it("is zero with fewer than two samples", () => {
    const tracker = new VelocityTracker();
    expect(tracker.velocity(0)).toBe(0);
    tracker.add(5, 0);
    expect(tracker.velocity(0.01)).toBe(0);
  });

  it("forgets what is older than a moment", () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0);
    tracker.add(500, 0.05);
    tracker.add(500, 0.4);
    tracker.add(510, 0.42);
    expect(tracker.velocity(0.42)).toBeCloseTo(500, 0);
  });
});

const WIDTH = 4000;
const VIEWPORT = 1000;
const newView = (turn = 0) => {
  const view = new SkyView(turn);
  view.setWidth(WIDTH);
  return view;
};

describe("SkyView", () => {
  it("keeps the turn as a share of the panorama", () => {
    const view = newView(0.25);
    expect(view.offset).toBe(1000);
    view.setWidth(2000);
    expect(view.turn).toBe(0.25);
    expect(view.offset).toBe(500);
  });

  it("follows a finger: dragging right brings what was on the left into view", () => {
    const view = newView(0);
    view.begin(0);
    view.drag(100, 0.016);
    expect(view.offset).toBeCloseTo(WIDTH - 100, 6);
    view.drag(-300, 0.032);
    expect(view.offset).toBeCloseTo(200, 6);
  });

  it("wraps past both ends", () => {
    const view = newView(0.999);
    view.begin(0);
    view.drag(-8, 0.016);
    expect(view.turn).toBeGreaterThanOrEqual(0);
    expect(view.turn).toBeLessThan(1);
    expect(view.offset).toBeCloseTo(4, 5);
  });

  it("coasts after a flick, then stops", () => {
    const view = newView(0);
    view.begin(0);
    for (let i = 1; i <= 5; i++) view.drag(-20, i * 0.016);
    view.release(0.082, false);
    const released = view.offset;
    expect(view.moving).toBe(true);
    expect(view.step(1 / 60, false)).toBe(true);
    expect(view.offset).toBeGreaterThan(released);
    for (let i = 0; i < 600; i++) view.step(1 / 60, false);
    expect(view.moving).toBe(false);
  });

  it("doesn't coast with reduced motion, but dragging still works", () => {
    const view = newView(0);
    view.begin(0);
    for (let i = 1; i <= 5; i++) view.drag(-20, i * 0.016);
    expect(view.offset).toBeCloseTo(100, 5);
    view.release(0.082, true);
    expect(view.moving).toBe(false);
    const before = view.offset;
    expect(view.step(1 / 60, true)).toBe(false);
    expect(view.offset).toBe(before);
  });

  it("turns by itself when nothing else is going on", () => {
    const view = newView(0);
    expect(view.step(1, false)).toBe(true);
    expect(view.offset).toBeCloseTo(AUTO_PIXELS_PER_SECOND, 6);
  });

  it("turns like a carousel after an arrow, in the chosen way, and doesn't stop", () => {
    const view = newView(0.5);
    view.setCarousel(-1);
    view.step(1, false);
    expect(view.offset).toBeCloseTo(WIDTH / 2 - CAROUSEL_PIXELS_PER_SECOND, 6);
    const before = view.turn;
    for (let i = 0; i < 600; i++) view.step(1 / 60, false);
    expect(view.turn).toBeLessThan(before);
    view.setCarousel(1);
    const reversed = view.turn;
    view.step(1, false);
    expect(view.turn).toBeCloseTo(reversed + CAROUSEL_PIXELS_PER_SECOND / WIDTH, 8);
    expect(CAROUSEL_PIXELS_PER_SECOND).toBeGreaterThan(AUTO_PIXELS_PER_SECOND);
  });

  it("keeps the carousel after a drag, and holds it in reduced motion", () => {
    const view = newView(0.5);
    view.setCarousel(-1);
    view.begin(0);
    view.drag(10, 0.016);
    view.release(1, true);
    const at = view.turn;
    view.step(1, false);
    expect(view.turn).toBeLessThan(at);
    expect(view.step(1, true)).toBe(false);
  });

  it("never stops by itself: it turns on every frame, however long it goes", () => {
    const view = newView(0);
    let last = view.offset;
    let stalled = 0;
    for (let i = 0; i < 6000; i++) {
      view.step(1 / 60, false);
      if (view.offset === last) stalled++;
      last = view.offset;
    }
    expect(stalled).toBe(0);
    // A hundred seconds of it.
    expect(view.offset).toBeCloseTo(AUTO_PIXELS_PER_SECOND * 100, 3);
  });

  it("drifts at the same speed in pixels on a phone and on a laptop, so a laptop doesn't race", () => {
    const speeds = [390, 820, 1280, 1920].map((viewport) => {
      const view = new SkyView(0);
      view.setWidth(viewport * 4);
      const before = view.offset;
      view.step(10, false);
      return (view.offset - before) / 10;
    });
    for (const speed of speeds) expect(speed).toBeCloseTo(AUTO_PIXELS_PER_SECOND, 6);
    // A calm drift: about ten pixels a second.
    expect(AUTO_PIXELS_PER_SECOND).toBeGreaterThanOrEqual(6);
    expect(AUTO_PIXELS_PER_SECOND).toBeLessThanOrEqual(14);
  });

  it("stops by itself while a card is open (paused), and goes on when it closes", () => {
    const view = newView(0);
    const resume = view.pauseAuto();
    expect(view.step(1, false)).toBe(false);
    expect(view.autoSpeed(false)).toBe(0);
    resume();
    resume();
    expect(view.step(1, false)).toBe(true);
    const a = view.pauseAuto();
    const b = view.pauseAuto();
    a();
    expect(view.step(1, false)).toBe(false);
    b();
    expect(view.step(1, false)).toBe(true);
  });

  it("only stops turning by itself with reduced motion or while a finger is on it, and starts again after", () => {
    const view = newView(0);
    expect(view.step(1, true)).toBe(false);
    view.begin(0);
    expect(view.step(1, false)).toBe(false);
    view.release(1, true);
    expect(view.step(1, false)).toBe(true);
  });

  it("tells how fast it is turning, so a light can aim where a star will be: nothing with reduced motion", () => {
    const view = newView(0);
    expect(view.autoSpeed(false)).toBeCloseTo(AUTO_PIXELS_PER_SECOND, 8);
    expect(view.autoSpeed(true)).toBe(0);
    // It matches what a step really does.
    const before = view.offset;
    view.step(2, false);
    expect(view.offset - before).toBeCloseTo(view.autoSpeed(false) * 2, 6);
    view.setCarousel(-1);
    expect(view.autoSpeed(false)).toBeCloseTo(-CAROUSEL_PIXELS_PER_SECOND, 8);
  });

  describe("turning to a place", () => {
    it("glides there and then says so", () => {
      const view = newView(0);
      const done = vi.fn();
      view.glideBy(1000, { reduced: false, viewport: VIEWPORT, done });
      expect(view.moving).toBe(true);
      view.step(0.3, true);
      expect(view.offset).toBeGreaterThan(0);
      expect(view.offset).toBeLessThan(1000);
      expect(done).not.toHaveBeenCalled();
      for (let i = 0; i < 200; i++) view.step(1 / 60, true);
      expect(view.offset).toBeCloseTo(1000, 6);
      expect(done).toHaveBeenCalledTimes(1);
      expect(view.moving).toBe(false);
    });

    it("goes backward past the start of the panorama", () => {
      const view = newView(0.01);
      view.glideBy(-200, { reduced: false, viewport: VIEWPORT });
      for (let i = 0; i < 200; i++) view.step(1 / 60, true);
      expect(view.offset).toBeCloseTo(40 - 200 + WIDTH, 5);
    });

    it("jumps at once with reduced motion, and with nowhere to go", () => {
      const view = newView(0);
      const done = vi.fn();
      view.glideBy(700, { reduced: true, viewport: VIEWPORT, done });
      expect(view.offset).toBe(700);
      expect(done).toHaveBeenCalledTimes(1);
      view.glideBy(0, { reduced: false, viewport: VIEWPORT, done });
      expect(done).toHaveBeenCalledTimes(2);
    });

    it("can be cancelled, and then never says it is done", () => {
      const view = newView(0);
      const done = vi.fn();
      const cancel = view.glideBy(1000, { reduced: false, viewport: VIEWPORT, done });
      view.step(0.2, true);
      cancel();
      const stopped = view.offset;
      for (let i = 0; i < 200; i++) view.step(1 / 60, true);
      expect(view.offset).toBe(stopped);
      expect(done).not.toHaveBeenCalled();
    });

    it("is cut short by a finger, and still says it is done once, so whatever waited for it goes on", () => {
      const view = newView(0);
      const done = vi.fn();
      view.glideBy(1000, { reduced: false, viewport: VIEWPORT, done });
      view.step(0.3, true);
      const reached = view.offset;
      view.begin(0);
      expect(done).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 100; i++) view.step(1 / 60, true);
      expect(done).toHaveBeenCalledTimes(1);
      // It stopped where the finger found it.
      expect(view.offset).toBe(reached);
    });

    it("says it is done when another turn takes its place", () => {
      const view = newView(0);
      const first = vi.fn();
      const second = vi.fn();
      view.glideBy(1000, { reduced: false, viewport: VIEWPORT, done: first });
      view.glideBy(-300, { reduced: false, viewport: VIEWPORT, done: second });
      expect(first).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 200; i++) view.step(1 / 60, true);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it("keeps its course across a resize", () => {
      const view = newView(0);
      view.glideBy(1000, { reduced: false, viewport: VIEWPORT });
      view.step(0.2, true);
      view.setWidth(2000);
      for (let i = 0; i < 200; i++) view.step(1 / 60, true);
      expect(view.turn).toBeCloseTo(0.25, 6);
    });

    it("takes longer for a longer way, within limits", () => {
      expect(glideDuration(0, VIEWPORT)).toBe(0.6);
      expect(glideDuration(500, VIEWPORT)).toBeGreaterThan(0.6);
      expect(glideDuration(2000, VIEWPORT)).toBeLessThanOrEqual(1.8);
      expect(glideDuration(-500, VIEWPORT)).toBe(glideDuration(500, VIEWPORT));
    });
  });
});
