import { describe, expect, it } from "vitest";
import {
  capNearScales,
  computeLayout,
  directionToFire,
  NEAR_SCALE_RATIO,
  seatPosition,
  skyDragBottom,
  wordBandBottom,
} from "./layout";

const none = { top: 0, bottom: 0 };

describe("computeLayout", () => {
  it("centers the fire horizontally and keeps the seat ellipse inside the scene", () => {
    const layout = computeLayout(1200, 800, none);
    expect(layout.cx).toBe(600);
    expect(layout.cy + layout.ry).toBeLessThanOrEqual(layout.sceneBottom);
    expect(layout.rx).toBeLessThanOrEqual(1200 * 0.44);
  });

  it("scales down on small screens but never below the minimum", () => {
    expect(computeLayout(360, 640, none).u).toBeLessThan(computeLayout(1200, 800, none).u);
    expect(computeLayout(100, 100, none).u).toBe(0.35);
  });

  it("respects insets", () => {
    const layout = computeLayout(800, 600, { top: 80, bottom: 150 });
    expect(layout.sceneTop).toBe(80);
    expect(layout.sceneBottom).toBe(450);
    expect(layout.cy + layout.ry).toBeLessThanOrEqual(450);
  });
});

describe("seatPosition", () => {
  const layout = computeLayout(1000, 700, none);

  it("marks the viewer's side as near and the far side as far", () => {
    expect(seatPosition(layout, 90).near).toBe(true);
    expect(seatPosition(layout, 270).near).toBe(false);
  });

  it("squeezes the ring sideways without changing depth", () => {
    const full = seatPosition(layout, 200);
    const narrow = seatPosition(layout, 200, 0.8);
    expect(Math.abs(narrow.x - layout.cx)).toBeCloseTo(Math.abs(full.x - layout.cx) * 0.8);
    expect(narrow.y).toBe(full.y);
    expect(narrow.scale).toBe(full.scale);
  });

  it("makes near seats larger than far seats", () => {
    expect(seatPosition(layout, 90).scale).toBeGreaterThan(seatPosition(layout, 270).scale);
  });
});

describe("capNearScales", () => {
  const layout = computeLayout(1000, 700, none);
  const seats = [60, 120, 200, 235, 270, 305, 340].map((degrees) => seatPosition(layout, degrees));

  it("keeps near characters within the ratio of the biggest far one", () => {
    const capped = capNearScales(seats);
    const farMax = Math.max(...capped.filter((s) => !s.near).map((s) => s.scale));
    for (const seat of capped.filter((s) => s.near)) {
      expect(seat.scale).toBeLessThanOrEqual(farMax * NEAR_SCALE_RATIO + 1e-9);
    }
  });

  it("leaves far seats untouched and never grows a near seat", () => {
    const capped = capNearScales(seats);
    capped.forEach((seat, i) => {
      const original = seats[i];
      if (!original) throw new Error("missing seat");
      if (!seat.near) expect(seat).toEqual(original);
      else expect(seat.scale).toBeLessThanOrEqual(original.scale);
    });
  });

  it("returns the seats as they are when there is no far side", () => {
    const nearOnly = [seatPosition(layout, 90)];
    expect(capNearScales(nearOnly)).toEqual(nearOnly);
  });
});

describe("directionToFire", () => {
  it("returns a unit vector toward the fire and the distance to it", () => {
    const toward = directionToFire({ x: 0, y: 0 }, { x: 3, y: -4 });
    expect(toward.length).toBe(5);
    expect(toward.x).toBeCloseTo(0.6, 12);
    expect(toward.y).toBeCloseTo(-0.8, 12);
    expect(Math.hypot(toward.x, toward.y)).toBeCloseTo(1, 12);
  });

  it("points the other way when the fire is on the other side", () => {
    const left = directionToFire({ x: 10, y: 5 }, { x: 0, y: 5 });
    expect(left.x).toBe(-1);
    expect(left.y).toBe(0);
  });

  it("does not divide by zero when the seat is at the fire", () => {
    const here = directionToFire({ x: 4, y: 4 }, { x: 4, y: 4 });
    expect(here).toEqual({ x: 0, y: 0, length: 1 });
  });
});

describe("wordBandBottom", () => {
  it.each([
    [1519, 784],
    [390, 844],
    [820, 1180],
    [1920, 1080],
  ])("is above the trees and the heads of the far seats at %ix%i", (width, height) => {
    const layout = computeLayout(width, height, { top: 0, bottom: 72 });
    const bottom = wordBandBottom(layout);
    expect(bottom).toBeLessThan(layout.horizon);
    for (const degrees of [225, 255, 300]) {
      const seat = seatPosition(layout, degrees, 0.8);
      expect(bottom).toBeLessThanOrEqual(seat.y - layout.characterHeight * seat.scale);
    }
  });
});

describe("skyDragBottom", () => {
  it("ends above the horizon and above the far characters' heads, on every screen", () => {
    for (const [w, h] of [
      [390, 844],
      [820, 1180],
      [1280, 720],
      [1920, 1080],
    ] as const) {
      const layout = computeLayout(w, h, { top: 0, bottom: 72 });
      const bottom = skyDragBottom(layout);
      expect(bottom).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(layout.horizon);
      expect(bottom).toBeLessThanOrEqual(layout.cy - layout.ry - layout.characterHeight);
      expect(bottom).toBeLessThan(layout.cy - layout.ry);
    }
  });
});
