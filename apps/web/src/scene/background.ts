import { Container, Graphics, Sprite } from "pixi.js";
import { bakeGround, type Ground } from "./ground";
import { verticalGradient } from "./gradient";
import type { Point, SceneLayout } from "./layout";
import { between, clamp } from "./math";
import { createRandom, type Random } from "./random";
import type { Tree } from "./petitionStars";
import { createSky, type SkyPetitions } from "./sky";
import type { TextureBag } from "./textures";

export interface Background {
  /** Sky, stars, moon, trees and ground. Sits behind everything. */
  back: Container;
  /** Vignette and foreground grass. Sits in front of everything. */
  front: Container;
  /** `light` is the fire's current flicker, 1 at rest: the ground near it brightens and dims with it. */
  update(time: number, reduced: boolean, light?: number): void;
  /** Where this petition's star is, or will be, in the sky. */
  petitionSpot(id: string): Point;
  /** Puts a petition's star in the sky: it blooms as a light arrives, fades in (reduced motion) or was always there. */
  addPetitionStar(id: string, mode: "bloom" | "fade" | "instant"): void;
  /** Turns a star golden; `turn` in front of the viewer, `instant` for one answered before. */
  answerPetitionStar(id: string, mode: "turn" | "instant"): void;
  /** Takes a star out of the sky: it dims away, or goes at once. */
  removePetitionStar(id: string, mode: "dim" | "instant"): void;
  /** Where each star is now, by petition id. */
  petitionSpots(): ReadonlyMap<string, Point>;
  /** Dims the petition stars a little while a word is over them, or brings them back. */
  dimPetitionStars(dimmed: boolean): void;
  /** A shooting star crosses the sky now (none with reduced motion). */
  shootingStar(): void;
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
      planted(px, horizon + between(rand, 60, 110) * u, h, h * 0.46, 0x06070f);
    }
  }
  // The grass at the tree line stands in front of the trees' bases.
  land.addChild(trees, ground.tufts);
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
): Background {
  const rand = createRandom(20240601);
  // The trees were laid out from the same random stream as the old stars, 7 draws per star. Skipping them
  // keeps every tree where it was.
  const oldStars = Math.min(260, Math.floor((layout.width * layout.horizon) / 2600));
  for (let i = 0; i < oldStars * 7; i++) rand();

  const ground = bakeGround(layout, textures, createRandom(33011));
  // The land comes first: the sky needs to know where the pines are. They don't share a random stream.
  const land = buildLand(layout, rand, ground);
  const sky = createSky(layout, textures, createRandom(70013), petitions, land.trees);
  const back = new Container();
  back.addChild(sky.container, land.container);
  const front = buildFront(layout, textures, ground);

  return {
    back,
    front,
    petitionSpot: sky.petitionSpot,
    addPetitionStar: sky.addPetitionStar,
    answerPetitionStar: sky.answerPetitionStar,
    removePetitionStar: sky.removePetitionStar,
    petitionSpots: sky.petitionSpots,
    dimPetitionStars: sky.dimPetitionStars,
    shootingStar: sky.shootingStar,
    update(time, reduced, light = 1) {
      sky.update(time, reduced);
      ground.lit.alpha = LIT_ALPHA * clamp(light, 0, 1.4);
    },
  };
}
