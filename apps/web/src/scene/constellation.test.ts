import { describe, expect, it } from "vitest";
import {
  CLUSTER_CAPACITY,
  clearanceAbovePines,
  clusterArea,
  clusterExclusion,
  clusterGrowth,
  constellationCenter,
  clusterRegion,
  constellationLines,
  isSkyClear,
  MAX_GROWTH,
  MAX_SEGMENT,
  MIN_GAP,
  NEAR_MAX,
  NEAR_MIN,
  placeClusterStar,
  segmentsCross,
  type ClusterArea,
  type ClusterStar,
  type ConstellationStar,
} from "./constellation";
import { computeLayout, type Point } from "./layout";
import { placeOtherStars } from "./otherStars";
import { panoramaWidth, screenX } from "./panorama";
import { createRandom } from "./random";
import type { Tree } from "./petitionStars";
import { skyGeometry } from "./skyGeometry";

const SIZES = [
  { name: "phone portrait", width: 390, height: 844 },
  { name: "small phone", width: 320, height: 568 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "wide desktop", width: 1920, height: 1080 },
] as const;

/** Pines like the scene's, the worst case: rows of them along the horizon, short and tall, and huge ones at the sides. */
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

const setup = (width: number, height: number) => {
  const layout = computeLayout(width, height, { top: 0, bottom: 72 });
  const area = clusterArea(layout, forest(width, layout.horizon, layout.u));
  return { layout, area };
};

/** The petitions of a visitor, one after another, each placed given the ones before it. */
function grow(area: ClusterArea, count: number, prefix = "petition"): ClusterStar[] {
  const stars: ClusterStar[] = [];
  for (let i = 0; i < count; i++) {
    stars.push(placeClusterStar(`${prefix}-${i}`, i, area, stars));
  }
  return stars;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe.each(SIZES)("the cluster on a $name", ({ width, height }) => {
  const { layout, area } = setup(width, height);
  const { skyHeight } = skyGeometry(layout);

  it("starts compact: about a third of the screen wide, in the upper sky", () => {
    const region = clusterRegion(area, 1);
    const regionWidth = region.right - region.left;
    if (width < 600) {
      expect(regionWidth).toBeCloseTo(width * 0.7, 0);
    } else {
      expect(regionWidth).toBeCloseTo(Math.min(width * 0.35, 520), 0);
      expect(regionWidth).toBeLessThanOrEqual(520.5);
    }
    expect(region.top).toBeGreaterThanOrEqual(skyHeight * 0.12 - 0.5);
    expect(region.bottom).toBeLessThanOrEqual(skyHeight * 0.55 + 0.5);
    // Around the middle of the screen, where the sky is turned to centre the constellation.
    expect((region.left + region.right) / 2).toBeCloseTo(width / 2, 0);
  });

  it("does not start at Venus: the first star is near the centre of the region and has no line", () => {
    const [first] = grow(area, 1);
    const region = clusterRegion(area, 1);
    expect(first?.parent).toBeUndefined();
    expect(first && isSkyClear(area, first.spot)).toBe(true);
    const third = { x: (region.right - region.left) / 3, y: (region.bottom - region.top) / 3 };
    expect(Math.abs((first?.spot.x ?? 0) - area.center.x)).toBeLessThanOrEqual(third.x * 1.2);
    expect(Math.abs((first?.spot.y ?? 0) - area.center.y)).toBeLessThanOrEqual(third.y * 3);
    // A single petition has no line: its glow is what identifies it.
    expect(constellationLines([{ ...first!, id: "a" }], new Set(["a"]))).toEqual([]);
  });

  it("keeps Venus and the moon clear of the cluster, with Venus near the moon", () => {
    expect(distance(area.venus, area.moon)).toBeLessThan(area.keepouts[0]!.radius * 2.5);
    for (const star of grow(area, 30)) {
      for (const k of area.keepouts)
        expect(distance(star.spot, k)).toBeGreaterThanOrEqual(k.radius);
    }
  });

  it("keeps every star inside the region it has then, and above the pines and clear of the moon", () => {
    for (const count of [1, 5, 12, 30]) {
      const stars = grow(area, count);
      for (let i = 0; i < stars.length; i++) {
        const spot = (stars[i] as ClusterStar).spot;
        // The region it had when it was placed, widened by the most a crowded cluster may take.
        const region = clusterRegion(area, i + 1, MAX_GROWTH);
        expect(spot.x).toBeGreaterThanOrEqual(region.left);
        expect(spot.x).toBeLessThanOrEqual(region.right);
        expect(spot.y).toBeGreaterThanOrEqual(region.top);
        expect(spot.y).toBeLessThanOrEqual(region.bottom);
        // The real silhouette: the tallest pine at its x, or just beside it, plus a margin.
        expect(clearanceAbovePines(area, spot)).toBeGreaterThanOrEqual(area.treeMargin);
        for (const k of area.keepouts) {
          expect(distance(spot, k)).toBeGreaterThanOrEqual(k.radius);
        }
      }
    }
  });

  it("never comes within 40 px (scaled) of another star", () => {
    const stars = grow(area, 30);
    for (const star of stars)
      expect(distance(star.spot, area.venus)).toBeGreaterThanOrEqual(MIN_GAP * area.scale * 0.5);
    for (let i = 0; i < stars.length; i++) {
      for (let j = 0; j < i; j++) {
        expect(
          distance((stars[i] as ClusterStar).spot, (stars[j] as ClusterStar).spot),
        ).toBeGreaterThanOrEqual(MIN_GAP * area.scale * 0.5);
      }
    }
  });

  it("keeps its lines no longer than about 140 px (scaled), with every star joined to one before it", () => {
    for (const count of [5, 12, 30]) {
      const stars = grow(area, count);
      for (let i = 1; i < stars.length; i++) {
        const parent = (stars[i] as ClusterStar).parent;
        expect(parent).toBeDefined();
        expect(parent as number).toBeLessThan(i);
        expect(
          distance((stars[i] as ClusterStar).spot, (stars[parent as number] as ClusterStar).spot),
        ).toBeLessThanOrEqual(MAX_SEGMENT * area.scale * 1.05);
      }
    }
  });

  it("joins each star to its nearest earlier star: a tree, not a chain in creation order", () => {
    const stars = grow(area, 12);
    for (let i = 1; i < stars.length; i++) {
      const spot = (stars[i] as ClusterStar).spot;
      const nearest = stars
        .slice(0, i)
        .map((star, index) => ({ index, d: distance(spot, star.spot) }))
        .sort((a, b) => a.d - b.d)[0];
      expect((stars[i] as ClusterStar).parent).toBe(nearest?.index);
    }
    // Not every star hangs on the one before it.
    expect(stars.some((star, i) => i > 1 && star.parent !== i - 1)).toBe(true);
  });

  it("draws lines that never cross", () => {
    for (const count of [5, 12, 30]) {
      const stars = grow(area, count).map((star, i) => ({ ...star, id: `p${i}` }));
      const lines = constellationLines(stars, new Set(stars.map((star) => star.id)));
      expect(lines).toHaveLength(count - 1);
      for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < i; j++) {
          const [a, b] = lines[i] as [Point, Point];
          const [c, d] = lines[j] as [Point, Point];
          expect(segmentsCross(a, b, c, d)).toBe(false);
        }
      }
    }
  });

  it("is the same for the same ids in the same order, and different for other ids", () => {
    expect(grow(area, 12)).toEqual(grow(area, 12));
    expect(grow(area, 12)).not.toEqual(grow(area, 12, "other"));
    // A star stays where it is when more are added after it.
    expect(grow(area, 12)).toEqual(grow(area, 20).slice(0, 12));
  });
});

describe("how the region grows", () => {
  const { area } = setup(1280, 720);
  const width = (count: number) => {
    const r = clusterRegion(area, count);
    return r.right - r.left;
  };
  const height = (count: number) => {
    const r = clusterRegion(area, count);
    return r.bottom - r.top;
  };

  it("holds its starting size up to a dozen stars", () => {
    expect(clusterGrowth(1)).toBe(1);
    expect(clusterGrowth(5)).toBe(1);
    expect(clusterGrowth(CLUSTER_CAPACITY)).toBe(1);
    expect(width(5)).toBe(width(1));
    expect(width(12)).toBe(width(1));
  });

  it("grows slowly beyond that, around its centre", () => {
    expect(clusterGrowth(30)).toBeGreaterThan(1);
    expect(clusterGrowth(30)).toBeLessThanOrEqual(MAX_GROWTH);
    expect(width(30)).toBeGreaterThan(width(12));
    expect(height(30)).toBeGreaterThan(height(12));
    const small = clusterRegion(area, 12);
    const big = clusterRegion(area, 30);
    // Around the same centre, sideways exactly; up and down too, unless the sky's own limits stop it.
    expect((big.left + big.right) / 2).toBeCloseTo((small.left + small.right) / 2, 6);
    expect(big.top).toBeLessThanOrEqual(small.top);
    expect(big.bottom).toBeGreaterThanOrEqual(small.bottom);
    for (let n = 1; n < 60; n++)
      expect(clusterGrowth(n + 1)).toBeGreaterThanOrEqual(clusterGrowth(n));
  });

  it("never spreads across the whole sky, however many stars there are", () => {
    for (const count of [1, 5, 12, 30, 200]) {
      expect(width(count)).toBeLessThan(1280 * 0.6);
      expect(height(count)).toBeLessThan(720 * 0.7);
    }
    expect(clusterGrowth(10_000)).toBe(MAX_GROWTH);
  });

  it("shows in the stars: the cluster of 30 stays within the grown region", () => {
    const stars = grow(area, 30);
    const widest = clusterRegion(area, 30, MAX_GROWTH);
    for (const star of stars) {
      expect(star.spot.x).toBeGreaterThanOrEqual(widest.left);
      expect(star.spot.x).toBeLessThanOrEqual(widest.right);
    }
    const xs = stars.map((star) => star.spot.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1280 * 0.6);
  });

  it("keeps 12 stars close together: each is one step (60 to 120 px) from one before", () => {
    const stars = grow(area, 12);
    let steps = 0;
    for (let i = 1; i < stars.length; i++) {
      const spot = (stars[i] as ClusterStar).spot;
      const near = stars.slice(0, i).some((other) => {
        const d = distance(spot, other.spot);
        return d >= NEAR_MIN * area.scale - 0.001 && d <= NEAR_MAX * area.scale + 0.001;
      });
      if (near) steps++;
    }
    // Nearly always; a crowded region may loosen the rule for a star or two.
    expect(steps).toBeGreaterThanOrEqual(8);
  });
});

describe("the pines", () => {
  it("measures the clearance against the tallest pine at the star's x and a little to either side", () => {
    const layout = computeLayout(1280, 720, { top: 0, bottom: 72 });
    const tall: Tree = { x: 600, top: 60, height: 200, width: 90 };
    const area = clusterArea(layout, [tall]);
    // Right over the tip: only a few pixels.
    expect(clearanceAbovePines(area, { x: 600, y: 40 })).toBeCloseTo(20, 6);
    // Not over it, but within reach of its side: still counted.
    const beside = { x: 600 + area.treeReach + 10, y: 40 };
    expect(clearanceAbovePines(area, beside)).toBeGreaterThan(20);
    // And a spot too close above the tip is not clear.
    expect(isSkyClear(area, { x: 600, y: 60 - area.treeMargin + 4 })).toBe(false);
    expect(isSkyClear(area, { x: 600, y: 60 - area.treeMargin - 4 })).toBe(true);
  });

  it("is not behind a pine for stars placed in a forest with tall pines in the way", () => {
    const layout = computeLayout(1280, 720, { top: 0, bottom: 72 });
    // A wall of tall pines right across the cluster's region.
    const wall: Tree[] = [];
    for (let x = 0; x < 1300; x += 20) {
      wall.push({
        x,
        top: layout.horizon - 170 * layout.u,
        height: 200 * layout.u,
        width: 90 * layout.u,
      });
    }
    const area = clusterArea(layout, wall);
    for (const star of grow(area, 12)) {
      expect(clearanceAbovePines(area, star.spot)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("constellationLines", () => {
  const stars: ConstellationStar[] = [
    { id: "a", spot: { x: 0, y: 0 }, parent: undefined },
    { id: "b", spot: { x: 80, y: 10 }, parent: 0 },
    { id: "c", spot: { x: 70, y: 90 }, parent: 1 },
    { id: "d", spot: { x: 10, y: 80 }, parent: 0 },
  ];
  const all = new Set(["a", "b", "c", "d"]);

  it("joins each star to its parent: a branching tree, with no line from Venus", () => {
    expect(constellationLines(stars, all)).toEqual([
      [stars[0]?.spot, stars[1]?.spot],
      [stars[1]?.spot, stars[2]?.spot],
      [stars[0]?.spot, stars[3]?.spot],
    ]);
  });

  it("has no line for none or one star, and a line from two", () => {
    expect(constellationLines([], new Set())).toEqual([]);
    expect(constellationLines(stars.slice(0, 1), new Set(["a"]))).toEqual([]);
    expect(constellationLines(stars.slice(0, 2), new Set(["a", "b"]))).toHaveLength(1);
  });

  it("skips a star that is gone and joins its children to the star above it", () => {
    expect(constellationLines(stars, new Set(["a", "c", "d"]))).toEqual([
      [stars[0]?.spot, stars[2]?.spot],
      [stars[0]?.spot, stars[3]?.spot],
    ]);
  });

  it("leaves out the stars that aren't in the sky, so other people's never get lines", () => {
    expect(constellationLines(stars, new Set(["a", "b", "someone-else"]))).toEqual([
      [stars[0]?.spot, stars[1]?.spot],
    ]);
  });
});

describe("the middle of the constellation", () => {
  const { area } = setup(1280, 720);
  it("is the middle of the stars", () => {
    const spots = [
      { x: 500, y: 60 },
      { x: 800, y: 80 },
    ];
    expect(constellationCenter(area, spots)).toBe(650);
  });
  it("is the middle of the region before there is a star", () => {
    expect(constellationCenter(area, [])).toBe(area.center.x);
  });
});

describe("the moon and Venus turn with the sky", () => {
  const { layout, area } = setup(1280, 720);
  const panorama = panoramaWidth(layout.width);
  it("move across the screen by exactly the offset, together", () => {
    const gap = (offset: number) =>
      screenX(area.moon.x, offset, panorama, layout.width) -
      screenX(area.venus.x, offset, panorama, layout.width);
    for (const offset of [0, 137, 500, 1111, 3000, 5000]) {
      expect(gap(offset)).toBeCloseTo(gap(0), 6);
    }
    expect(screenX(area.venus.x, 200, panorama, layout.width)).toBeCloseTo(area.venus.x - 200, 6);
    expect(screenX(area.moon.x, 200, panorama, layout.width)).toBeCloseTo(area.moon.x - 200, 6);
  });
  it("hang in the panorama, Venus just below the moon and to its left", () => {
    expect(area.venus.x).toBeGreaterThan(0);
    expect(area.moon.x).toBeLessThan(layout.width);
    expect(area.venus.x).toBeLessThan(area.moon.x);
    expect(area.venus.y).toBeGreaterThan(area.moon.y);
  });
});

describe("the stars of other people stay above the pines", () => {
  it.each(SIZES)("on a $name, none is among the trees", ({ width, height }) => {
    const { layout, area } = setup(width, height);
    const stars = placeOtherStars(
      {
        width: width * 4,
        top: area.limits.top,
        bottom: area.limits.bottom,
        spacing: 12,
        exclude: [],
        isClear: (spot) =>
          clearanceAbovePines(area, { x: spot.x % layout.width, y: spot.y }) >= area.treeMargin,
      },
      600,
      createRandom(21),
    );
    expect(stars.length).toBeGreaterThan(20);
    for (const star of stars) {
      expect(
        clearanceAbovePines(area, { x: star.x % layout.width, y: star.y }),
      ).toBeGreaterThanOrEqual(area.treeMargin);
    }
  });
});

describe("the stars of other people keep out of the cluster", () => {
  it.each(SIZES)(
    "on a $name, none is within the margin around the cluster or Venus",
    ({ width, height }) => {
      const { area } = setup(width, height);
      const margin = 40 * area.scale;
      const widest = clusterRegion(area, 30, MAX_GROWTH);
      const boxes = clusterExclusion(area);
      expect(boxes).toHaveLength(1);
      const stars = placeOtherStars(
        {
          width: width * 4,
          top: area.limits.top,
          bottom: area.limits.bottom,
          spacing: 20,
          exclude: boxes,
          keepouts: area.keepouts,
        },
        400,
        createRandom(11),
      );
      expect(stars.length).toBeGreaterThan(50);
      const gapToBox = (
        p: Point,
        b: { left: number; right: number; top: number; bottom: number },
      ) =>
        Math.hypot(
          Math.max(b.left - p.x, 0, p.x - b.right),
          Math.max(b.top - p.y, 0, p.y - b.bottom),
        );
      for (const star of stars) {
        // At least the margin from the cluster at its widest, whatever it grows to.
        expect(gapToBox(star, widest)).toBeGreaterThanOrEqual(margin - 0.001);
        for (const k of area.keepouts) expect(distance(star, k)).toBeGreaterThanOrEqual(k.radius);
      }
      // And the stars of the visitor, however many, are inside what the others keep out of.
      for (const mine of grow(area, 30)) {
        expect(boxes.some((b) => gapToBox(mine.spot, b) === 0)).toBe(true);
      }
    },
  );
});

describe("segmentsCross", () => {
  const p = (x: number, y: number) => ({ x, y });
  it("is true for lines that cross and false for ones that don't or only share an end", () => {
    expect(segmentsCross(p(0, 0), p(10, 10), p(0, 10), p(10, 0))).toBe(true);
    expect(segmentsCross(p(0, 0), p(10, 0), p(0, 5), p(10, 5))).toBe(false);
    expect(segmentsCross(p(0, 0), p(10, 10), p(10, 10), p(20, 0))).toBe(false);
    expect(segmentsCross(p(0, 0), p(4, 4), p(6, 0), p(10, 10))).toBe(false);
  });
});
