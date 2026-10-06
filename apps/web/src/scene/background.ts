import { Container, Graphics, Sprite } from "pixi.js";
import { createDistantFireLayer } from "./distantFireLayer";
import { distantSlots, placeFires } from "./distantFires";
import type { DistantFire } from "@/data/types";
import { bakeGround, type Ground } from "./ground";
import { verticalGradient } from "./gradient";
import type { Point, SceneLayout } from "./layout";
import { between, clamp } from "./math";
import { createRandom, type Random } from "./random";
import type { Tree } from "./petitionStars";
import { createSky, type SkyOptions, type SkyPetitions } from "./sky";
import type { TextureBag } from "./textures";

export interface Background {
  /** Sky, stars, moon, trees and ground. Sits behind everything. */
  back: Container;
  /** Vignette and foreground grass. Sits in front of everything. */
  front: Container;
  /** `light` is the fire's current flicker, 1 at rest: the ground near it brightens and dims with it. */
  update(time: number, reduced: boolean, light?: number): void;
  /** Turns the sky's panorama so `offset` pixels of it are off the left edge. The trees and ground stay; the moon and Venus turn with it. */
  setOffset(offset: number): void;
  /** Where this petition's star is on screen now, or will be, in the sky. */
  petitionSpot(id: string): Point;
  /** Where that star is in the panorama, which stays as the sky turns. */
  petitionAnchor(id: string): Point;
  /** Where each star is in the panorama, by petition id. */
  petitionAnchors(): ReadonlyMap<string, Point>;
  /** The x, in the panorama, of the middle of the visitor's constellation (Venus included); `withId` counts a star about to be born. */
  constellationCenter(withId?: string): number;
  /** Puts a petition's star in the sky: it blooms as a light arrives, fades in (reduced motion) or was always there. */
  addPetitionStar(id: string, mode: "bloom" | "fade" | "instant"): void;
  /** Turns a star golden; `turn` in front of the viewer, `instant` for one answered before. */
  answerPetitionStar(id: string, mode: "turn" | "instant"): void;
  /** Takes a star out of the sky: it dims away, or goes at once. */
  removePetitionStar(id: string, mode: "dim" | "instant"): void;
  /** Where each star is on screen now, by petition id: off screen for one in a part of the sky turned away. */
  petitionSpots(): ReadonlyMap<string, Point>;
  /** Dims the petition stars a little while a word is over them, or brings them back. */
  dimPetitionStars(dimmed: boolean): void;
  /** The stars of other people's petitions: these are the only ones of theirs in the sky. */
  setOtherStars(stars: readonly { id: string; answered: boolean }[]): void;
  /** One soft pulse of light in a star, yours or another's. */
  pulseStar(id: string): void;
  /** A shooting star crosses the sky now (none with reduced motion), from the point `from` if given. `onDone` is called when it has gone. */
  shootingStar(from?: Point, onDone?: () => void): void;
  /** The other campfires burning far off at the tree line: `slots` says which spot each has. New ones fade in, gone ones fade out. */
  setDistantFires(
    fires: readonly DistantFire[],
    slots: ReadonlyMap<string, number>,
    instant: boolean,
  ): void;
}

/** How strongly the firelit copy of the ground shows at a flicker of 1. */
const LIT_ALPHA = 0.5;

function pine(g: Graphics, x: number, base: number, h: number, w: number, color: number): void {
  const tiers = 5;
  const right: [number, number][] = [];
  for (let i = 1; i <= tiers; i++) {
    const ty = base - h + h * (i / tiers) * 0.9;
    const tw = w * (i / tiers);
    right.push([x + tw / 2, ty]);
    if (i < tiers) right.push([x + tw * 0.22, ty - h * 0.03]);
  }
  const points: number[] = [x, base - h];
  for (const [px, py] of right) points.push(px, py);
  points.push(x + w * 0.06, base, x - w * 0.06, base);
  for (let i = right.length - 1; i >= 0; i--) {
    const [px, py] = right[i] ?? [x, base];
    points.push(2 * x - px, py);
  }
  g.poly(points).fill(color);
}

/** The land and where its pines stand, so whatever hangs in the sky can keep clear of them. */
interface Land {
  container: Container;
  trees: Tree[];
}

function buildLand(layout: SceneLayout, rand: Random, ground: Ground): Land {
  const { width, horizon, u, cx, rx } = layout;
  const land = new Container();
  land.addChild(
    new Graphics().rect(0, horizon - 70 * u, width, 80 * u).fill(
      verticalGradient([
        [0, "rgba(90,100,160,0)"],
        [1, "rgba(90,100,160,.14)"],
      ]),
    ),
  );
  land.addChild(ground.soil, ground.lit);
  const trees = new Graphics();
  const standing: Tree[] = [];
  const planted = (x: number, base: number, h: number, w: number, color: number) => {
    pine(trees, x, base, h, w, color);
    standing.push({ x, top: base - h, height: h, width: w });
  };
  let x = -20;
  while (x < width + 40) {
    const h = between(rand, 70, 160) * u;
    planted(x, horizon + 8 * u, h, h * 0.42, 0x0e1229);
    x += between(rand, 16, 32) * u;
  }
  x = -30;
  while (x < width + 40) {
    const h = between(rand, 90, 190) * u;
    if (Math.abs(x - cx) > rx * 0.85) planted(x, horizon + 24 * u, h, h * 0.44, 0x0a0c1c);
    x += between(rand, 26, 46) * u;
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const px =
        side < 0
          ? -30 * u + i * between(rand, 35, 65) * u
          : width + 30 * u - i * between(rand, 35, 65) * u;
      const h = between(rand, 220, 330) * u;
      // These huge pines used to stand so far down the soil that their flat bases made a hard black edge across the
      // ground, which shows most on a phone. Their tops stay where they were, but they now stand at the tree line, in the mist.
      const drop = between(rand, 60, 110) * u;
      const base = horizon + drop * 0.35;
      const height = h - drop * 0.65;
      planted(px, base, height, height * 0.46, 0x06070f);
    }
  }
  // The grass at the tree line stands in front of the trees' bases.
  // A low mist over the bases of the pines and the top of the soil: no hard saw-tooth line where they meet.
  const mist = new Graphics().rect(0, horizon - 30 * u, width, 90 * u).fill(
    verticalGradient([
      [0, "rgba(14,17,38,0)"],
      [0.3, "rgba(14,17,38,.85)"],
      [0.62, "rgba(14,17,38,.85)"],
      [1, "rgba(14,17,38,0)"],
    ]),
  );
  land.addChild(trees, mist, ground.tufts);
  return { container: land, trees: standing };
}

function buildFront(layout: SceneLayout, textures: TextureBag, ground: Ground): Container {
  const { width, height, cx, cy, u } = layout;
  const front = new Container();
  const vignette = new Sprite(
    textures.vignette(
      width,
      height,
      cx,
      cy - 60 * u,
      Math.min(width, height) * 0.3,
      Math.max(width, height) * 0.85,
    ),
  );
  vignette.width = width;
  vignette.height = height;
  front.addChild(vignette, ground.foreground);
  return front;
}

export function createBackground(
  layout: SceneLayout,
  textures: TextureBag,
  petitions: SkyPetitions = { ids: [], answered: new Set(), retired: new Set() },
  sky: SkyOptions = { offset: 0, others: [] },
  distant: { fires: readonly DistantFire[]; slots: ReadonlyMap<string, number> } = {
    fires: [],
    slots: new Map(),
  },
): Background {
  const rand = createRandom(20240601);
  // The trees were laid out from the same random stream as the old stars, 7 draws per star. Skipping them
  // keeps every tree where it was.
  const oldStars = Math.min(260, Math.floor((layout.width * layout.horizon) / 2600));
  for (let i = 0; i < oldStars * 7; i++) rand();

  const ground = bakeGround(layout, textures, createRandom(33011));
  // The land comes first: the sky needs to know where the pines are. They don't share a random stream.
  const land = buildLand(layout, rand, ground);
  const skyLayer = createSky(layout, textures, createRandom(70013), petitions, land.trees, sky);
  // Far campfires stand in the land, over the mist and under the grass: nothing turns them with the sky.
  const spots = distantSlots(layout, land.trees);
  const distantLayer = createDistantFireLayer(textures, spots);
  distantLayer.set(placeFires(distant.fires, distant.slots, spots), true);
  land.container.addChildAt(distantLayer.container, land.container.children.length - 1);
  let lastTime = 0;
  const back = new Container();
  back.addChild(skyLayer.container, land.container);
  const front = buildFront(layout, textures, ground);

  return {
    back,
    front,
    setOffset: skyLayer.setOffset,
    petitionSpot: skyLayer.petitionSpot,
    petitionAnchor: skyLayer.petitionAnchor,
    petitionAnchors: skyLayer.petitionAnchors,
    constellationCenter: skyLayer.constellationCenter,
    addPetitionStar: skyLayer.addPetitionStar,
    answerPetitionStar: skyLayer.answerPetitionStar,
    removePetitionStar: skyLayer.removePetitionStar,
    petitionSpots: skyLayer.petitionSpots,
    dimPetitionStars: skyLayer.dimPetitionStars,
    setOtherStars: skyLayer.setOtherStars,
    pulseStar: skyLayer.pulseStar,
    shootingStar: skyLayer.shootingStar,
    setDistantFires(fires, slots, instant) {
      distantLayer.set(placeFires(fires, slots, spots), instant);
    },
    update(time, reduced, light = 1) {
      skyLayer.update(time, reduced);
      distantLayer.update(time, Math.min(0.1, Math.max(0, time - lastTime)), reduced);
      lastTime = time;
      ground.lit.alpha = LIT_ALPHA * clamp(light, 0, 1.4);
    },
  };
}
