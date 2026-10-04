import { describe, expect, it } from "vitest";
import type { DistantFire } from "@/data/types";
import { computeLayout } from "./layout";
import type { Tree } from "./petitionStars";
import {
  DistantFireBoard,
  distantSlots,
  MAX_DISTANT_FIRES,
  MIN_FLAME_HEIGHT_PX,
  MIN_FLAME_WIDTH_PX,
  MIN_SPILL_WIDTH_PX,
  bodyHalf,
  placeFires,
} from "./distantFires";

const wide = computeLayout(1280, 800, { top: 0, bottom: 72 });
const phone = computeLayout(390, 844, { top: 0, bottom: 72 });

/** A row of pines like the scene's: bases a little under the horizon, 90 to 150 units tall, 16 to 28 apart. */
function trees(layout: { width: number; horizon: number; u: number }): Tree[] {
  const list: Tree[] = [];
  let x = -20;
  for (let i = 0; x < layout.width + 40; i++) {
    const height = (90 + ((i * 37) % 60)) * layout.u;
    list.push({ x, top: layout.horizon + 8 * layout.u - height, height, width: height * 0.42 });
    x += (16 + ((i * 11) % 12)) * layout.u;
  }
  return list;
}

const fires = (n: number): DistantFire[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `f${String(i).padStart(2, "0")}`,
    people: 1 + (i % 7),
  }));

describe("bodyHalf", () => {
  const tree: Tree = { x: 100, top: 0, height: 100, width: 40 };

  it("is a thin trunk at the ground, wider through the lowest branches, and nothing past the tip", () => {
    expect(bodyHalf(tree, 100)).toBeCloseTo(40 * 0.06);
    expect(bodyHalf(tree, 90)).toBeCloseTo(20);
    expect(bodyHalf(tree, 95)).toBeGreaterThan(bodyHalf(tree, 100));
    expect(bodyHalf(tree, 95)).toBeLessThan(bodyHalf(tree, 90));
    expect(bodyHalf(tree, 0)).toBe(0);
    expect(bodyHalf(tree, -5)).toBe(0);
  });
});

describe("distantSlots", () => {
  it("are the same for the same layout and trees", () => {
    expect(distantSlots(wide, trees(wide))).toEqual(distantSlots(wide, trees(wide)));
  });

  it("number at most eight, nearest first", () => {
    const slots = distantSlots(wide, trees(wide));
    expect(slots).toHaveLength(MAX_DISTANT_FIRES);
    expect(slots.map((slot) => slot.depth)).toEqual(
      [...slots.map((slot) => slot.depth)].sort((a, b) => a - b),
    );
  });

  it("lie deep in the forest band: under the horizon, never in the clearing or near the seats", () => {
    for (const layout of [wide, phone]) {
      for (const slot of distantSlots(layout, trees(layout))) {
        expect(slot.y).toBeGreaterThan(layout.horizon);
        // Behind the first row's bases, and far above the ring the seats and logs are on.
        expect(slot.y).toBeLessThanOrEqual(layout.horizon + 8 * layout.u);
        expect(layout.cy - layout.ry - slot.y).toBeGreaterThan(40 * layout.u);
        expect(slot.x).toBeGreaterThan(0);
        expect(slot.x).toBeLessThan(layout.width);
      }
    }
  });

  it("are never seen through a pine's branches: no body is over the flame", () => {
    for (const layout of [wide, phone]) {
      const standing = trees(layout);
      for (const slot of distantSlots(layout, standing)) {
        for (const tree of standing) {
          expect(Math.abs(tree.x - slot.x)).toBeGreaterThanOrEqual(bodyHalf(tree, slot.y) - 1e-6);
        }
      }
    }
  });

  it("have a trunk across the edge of the flame for some of them", () => {
    for (const layout of [wide, phone]) {
      const slots = distantSlots(layout, trees(layout));
      const covered = slots.filter((slot) =>
        slot.trunks.some(
          ({ tree }) => Math.abs(tree.x - slot.x) <= bodyHalf(tree, slot.y) + slot.flameWidth / 2,
        ),
      );
      expect(covered.length).toBeGreaterThanOrEqual(3);
      expect(covered.length).toBeLessThan(slots.length);
    }
  });

  it("have a flame taller than wide, and a light that is a flat ellipse", () => {
    for (const slot of distantSlots(wide, trees(wide))) {
      expect(slot.flameHeight).toBeGreaterThan(slot.flameWidth);
      expect(slot.spillWidth).toBeGreaterThan(slot.spillHeight * 3);
      expect(slot.flameHeight).toBeLessThanOrEqual(5);
    }
  });

  it("get smaller and dimmer the farther they are", () => {
    const slots = distantSlots(wide, trees(wide));
    for (let i = 1; i < slots.length; i++) {
      const near = slots[i - 1];
      const far = slots[i];
      expect(far && near && far.flameHeight <= near.flameHeight).toBe(true);
      expect(far && near && far.spillWidth <= near.spillWidth).toBe(true);
      expect(far && near && far.plumeHeight <= near.plumeHeight).toBe(true);
      expect(far && near && far.alpha < near.alpha).toBe(true);
      expect(far && near && far.y < near.y).toBe(true);
    }
  });

  it("keep a visible size on a phone", () => {
    for (const slot of distantSlots(phone, trees(phone))) {
      expect(slot.flameWidth).toBeGreaterThanOrEqual(MIN_FLAME_WIDTH_PX);
      expect(slot.flameHeight).toBeGreaterThanOrEqual(MIN_FLAME_HEIGHT_PX);
      expect(slot.spillWidth).toBeGreaterThanOrEqual(MIN_SPILL_WIDTH_PX);
    }
  });
});

describe("DistantFireBoard", () => {
  it("draws at most eight fires, the rest are not placed", () => {
    const board = new DistantFireBoard();
    const assignment = board.update(fires(12));
    expect(assignment.size).toBe(MAX_DISTANT_FIRES);
    expect(new Set(assignment.values()).size).toBe(MAX_DISTANT_FIRES);
  });

  it("keeps every fire in its slot when another lights or goes out", () => {
    const board = new DistantFireBoard();
    const before = new Map(board.update(fires(3)));
    const after = board.update([{ id: "a-new", people: 2 }, ...fires(3)]);
    for (const [id, slot] of before) expect(after.get(id)).toBe(slot);
    const gone = board.update(fires(3).slice(1));
    expect(gone.get("f01")).toBe(before.get("f01"));
    expect(gone.has("f00")).toBe(false);
  });

  it("gives a freed slot to a fire that was waiting beyond the eight", () => {
    const board = new DistantFireBoard();
    const all = fires(9);
    const first = board.update(all);
    expect(first.has("f08")).toBe(false);
    const next = board.update(all.filter((fire) => fire.id !== "f03"));
    expect(next.get("f08")).toBe(first.get("f03"));
  });

  it("places nothing when there are no other fires", () => {
    expect(new DistantFireBoard().update([]).size).toBe(0);
  });
});

describe("placeFires", () => {
  it("makes a fire with more people slightly brighter, never past 1", () => {
    const slots = distantSlots(wide, trees(wide));
    const list: DistantFire[] = [
      { id: "a", people: 1 },
      { id: "b", people: 7 },
    ];
    const [a, b] = placeFires(
      list,
      new Map([
        ["a", 0],
        ["b", 0],
      ]),
      slots,
    );
    expect(a && b && b.brightness > a.brightness).toBe(true);
    expect(b && b.brightness).toBeLessThanOrEqual(1);
    expect(a && b && b.brightness / a.brightness).toBeLessThan(1.2);
  });

  it("skips fires without a slot", () => {
    const slots = distantSlots(wide, trees(wide));
    expect(placeFires(fires(2), new Map([["f00", 0]]), slots).map((fire) => fire.id)).toEqual([
      "f00",
    ]);
  });
});
