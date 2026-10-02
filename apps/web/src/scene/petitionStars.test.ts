import { describe, expect, it } from "vitest";
import { computeLayout } from "./layout";
import { hashId, placeStar, starArea, treeLineAt, type StarArea, type Tree } from "./petitionStars";
import type { Point } from "./layout";

const SIZES = [
  { name: "phone portrait", width: 390, height: 844 },
  { name: "small phone", width: 320, height: 568 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "wide desktop", width: 1920, height: 1080 },
] as const;

const area = (width: number, height: number) =>
  starArea(computeLayout(width, height, { top: 0, bottom: 72 }));

function placeMany(area: StarArea, count: number): Point[] {
  const placed: Point[] = [];
  for (let i = 0; i < count; i++) placed.push(placeStar(`petition-${i}`, area, placed));
  return placed;
}

describe.each(SIZES)("a star's spot on a $name", ({ width, height }) => {
  const sky = area(width, height);

  it("is inside the area, which is away from the screen edges", () => {
    expect(sky.left).toBeGreaterThan(0);
    expect(sky.right).toBeLessThan(width);
    for (const spot of placeMany(sky, 12)) {
      expect(spot.x).toBeGreaterThanOrEqual(sky.left);
      expect(spot.x).toBeLessThanOrEqual(sky.right);
      expect(spot.y).toBeGreaterThanOrEqual(sky.top);
      expect(spot.y).toBeLessThanOrEqual(sky.bottom);
    }
  });

  it("is above the horizon, in the sky", () => {
    const layout = computeLayout(width, height, { top: 0, bottom: 72 });
    expect(sky.bottom).toBeLessThan(layout.horizon);
  });

  it("keeps clear of the moon and Venus", () => {
    for (let i = 0; i < 200; i++) {
      const spot = placeStar(`id-${i}`, sky, []);
      for (const k of sky.keepouts) {
        expect(Math.hypot(spot.x - k.x, spot.y - k.y)).toBeGreaterThanOrEqual(k.radius);
      }
    }
  });

  it("keeps its distance from the other stars while there is room", () => {
    const placed = placeMany(sky, 5);
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = placed[i] as Point;
        const b = placed[j] as Point;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(sky.minDistance);
      }
    }
  });

  it("always finds a place, even in a crowded sky", () => {
    const spot = placeStar("one-more", sky, placeMany(sky, 60));
    expect(Number.isFinite(spot.x) && Number.isFinite(spot.y)).toBe(true);
    expect(spot.x).toBeGreaterThanOrEqual(sky.left);
    expect(spot.y).toBeLessThanOrEqual(sky.bottom);
  });
});

describe("placeStar", () => {
  const sky = area(390, 844);

  it("gives the same spot for the same id and the same stars before it", () => {
    const before = [{ x: 100, y: 100 }];
    expect(placeStar("abc", sky, before)).toEqual(placeStar("abc", sky, before));
    expect(placeMany(sky, 6)).toEqual(placeMany(sky, 6));
  });

  it("gives different ids different spots", () => {
    const spots = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(placeStar(`p${i}`, sky, []))),
    );
    expect(spots.size).toBe(20);
  });

  it("does not move a star when others are added after it", () => {
    const first = placeStar("first", sky, []);
    placeStar("second", sky, [first]);
    expect(placeStar("first", sky, [])).toEqual(first);
  });
});

describe("hashId", () => {
  it("is stable and tells ids apart", () => {
    expect(hashId("a")).toBe(hashId("a"));
    expect(hashId("a")).not.toBe(hashId("b"));
  });
});

/** Pines like the scene's: rows of them along the horizon, short and tall, with a few huge ones at the sides. */
function forest(width: number, horizon: number, u: number): Tree[] {
  const trees: Tree[] = [];
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = -20; x < width + 40; x += (16 + next() * 16) * u) {
    const h = (70 + next() * 90) * u;
    trees.push({ x, top: horizon + 8 * u - h, height: h, width: h * 0.42 });
  }
  for (let x = -30; x < width + 40; x += (26 + next() * 20) * u) {
    const h = (90 + next() * 100) * u;
    trees.push({ x, top: horizon + 24 * u - h, height: h, width: h * 0.44 });
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const h = (220 + next() * 110) * u;
      const x = side < 0 ? -30 * u + i * 50 * u : width + 30 * u - i * 50 * u;
      trees.push({ x, top: horizon + 85 * u - h, height: h, width: h * 0.46 });
    }
  }
  return trees;
}

describe("treeLineAt", () => {
  const pine: Tree = { x: 100, top: 50, height: 100, width: 40 };

  it("is the tip at the pine's middle, falling toward its sides", () => {
    expect(treeLineAt([pine], 100)).toBe(50);
    expect(treeLineAt([pine], 110)).toBeGreaterThan(50);
    expect(treeLineAt([pine], 120)).toBeCloseTo(50 + 0.9 * 100, 6);
  });

  it("is open where no pine reaches", () => {
    expect(treeLineAt([pine], 200)).toBe(Infinity);
    expect(treeLineAt([], 100)).toBe(Infinity);
  });

  it("takes the highest of overlapping pines", () => {
    const taller: Tree = { x: 105, top: 20, height: 130, width: 50 };
    expect(treeLineAt([pine, taller], 105)).toBe(20);
  });
});

describe.each(SIZES)("a star never goes behind a pine on a $name", ({ width, height }) => {
  const layout = computeLayout(width, height, { top: 0, bottom: 72 });
  const trees = forest(width, layout.horizon, layout.u);
  const sky = starArea(layout, trees);

  it("keeps a margin above the pine at its own x", () => {
    const placed: Point[] = [];
    for (let i = 0; i < 300; i++) {
      const spot = placeStar(`petition-${i}`, sky, i < 8 ? placed : []);
      if (i < 8) placed.push(spot);
      expect(treeLineAt(trees, spot.x) - spot.y).toBeGreaterThanOrEqual(sky.treeMargin);
    }
  });
});
