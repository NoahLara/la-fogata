import {
  Container,
  FillGradient,
  Graphics,
  Particle,
  ParticleContainer,
  Sprite,
  Texture,
} from "pixi.js";
import type { SceneLayout } from "./layout";
import { between, createRandom, type Random } from "./random";
import type { TextureBag } from "./textures";

const TAU = Math.PI * 2;

interface Star {
  particle: Particle;
  alpha: number;
  speed: number;
  phase: number;
}

export interface Background {
  /** Sky, stars, moon, trees and ground. Sits behind everything. */
  back: Container;
  /** Vignette and foreground grass. Sits in front of everything. */
  front: Container;
  update(time: number, reduced: boolean): void;
}

function verticalGradient(stops: readonly (readonly [number, string])[]): FillGradient {
  return new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: stops.map(([offset, color]) => ({ offset, color })),
    textureSpace: "local",
  });
}

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

function buildSky(layout: SceneLayout, textures: TextureBag): Container {
  const { width, horizon, u, sceneTop } = layout;
  const sky = new Container();
  sky.addChild(
    new Graphics().rect(0, 0, width, horizon + 4).fill(
      verticalGradient([
        [0, "#05060f"],
        [0.6, "#0d1027"],
        [1, "#1b1d3a"],
      ]),
    ),
  );

  const mx = width * 0.84;
  const my = Math.max(sceneTop + 40 * u, 70);
  const mr = Math.max(10, 18 * u);
  const halo = new Sprite(
    textures.radial([
      [0, 1],
      [1, 0],
    ]),
  );
  halo.anchor.set(0.5);
  halo.position.set(mx, my);
  halo.width = halo.height = mr * 14;
  halo.tint = 0xdcd7f0;
  halo.alpha = 0.16;
  sky.addChild(halo);

  const moon = new Graphics().circle(mx, my, mr).fill(0xebe5d4);
  for (const [a, b, r] of [
    [-0.3, -0.2, 0.22],
    [0.25, 0.15, 0.16],
    [-0.05, 0.4, 0.12],
  ] as const) {
    moon.circle(mx + a * mr, my + b * mr, r * mr).fill({ color: 0xaaa096, alpha: 0.32 });
  }
  sky.addChild(moon);
  return sky;
}

function buildLand(layout: SceneLayout, rand: Random): Container {
  const { width, height, horizon, u, cx, rx } = layout;
  const land = new Container();
  land.addChild(
    new Graphics().rect(0, horizon - 70 * u, width, 80 * u).fill(
      verticalGradient([
        [0, "rgba(90,100,160,0)"],
        [1, "rgba(90,100,160,.14)"],
      ]),
    ),
  );
  land.addChild(
    new Graphics().rect(0, horizon, width, height - horizon).fill(
      verticalGradient([
        [0, "#0f1120"],
        [1, "#06070c"],
      ]),
    ),
  );

  const trees = new Graphics();
  let x = -20;
  while (x < width + 40) {
    const h = between(rand, 70, 160) * u;
    pine(trees, x, horizon + 8 * u, h, h * 0.42, 0x0e1229);
    x += between(rand, 16, 32) * u;
  }
  x = -30;
  while (x < width + 40) {
    const h = between(rand, 90, 190) * u;
    if (Math.abs(x - cx) > rx * 0.85) pine(trees, x, horizon + 24 * u, h, h * 0.44, 0x0a0c1c);
    x += between(rand, 26, 46) * u;
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const px =
        side < 0
          ? -30 * u + i * between(rand, 35, 65) * u
          : width + 30 * u - i * between(rand, 35, 65) * u;
      const h = between(rand, 220, 330) * u;
      pine(trees, px, horizon + between(rand, 60, 110) * u, h, h * 0.46, 0x06070f);
    }
  }
  land.addChild(trees);
  return land;
}

function buildFront(layout: SceneLayout, rand: Random, textures: TextureBag): Container {
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
  front.addChild(vignette);

  const grass = new Graphics();
  for (let x = 0; x < width; x += 5) {
    if (x > width * 0.22 && x < width * 0.78) continue;
    const h = between(rand, 12, 40) * u;
    const lean = between(rand, -10, 10) * u;
    grass
      .moveTo(x, height)
      .quadraticCurveTo(x + lean * 0.3, height - h * 0.6, x + lean, height - h);
  }
  grass.stroke({ width: Math.max(1.5, 2 * u), color: 0x04050a, cap: "round" });
  front.addChild(grass);
  return front;
}

function buildStars(
  layout: SceneLayout,
  rand: Random,
): { container: ParticleContainer; stars: Star[] } {
  const { width, horizon, u } = layout;
  const container = new ParticleContainer({
    texture: Texture.WHITE,
    dynamicProperties: { color: true },
  });
  const stars: Star[] = [];
  const count = Math.min(260, Math.floor((width * horizon) / 2600));
  for (let i = 0; i < count; i++) {
    const size = rand() < 0.85 ? between(rand, 0.6, 1.2) : between(rand, 1.3, 2);
    const particle = new Particle({
      texture: Texture.WHITE,
      x: rand() * width,
      y: rand() * Math.max(10, horizon - 30 * u),
      scaleX: size / Texture.WHITE.width,
      scaleY: size / Texture.WHITE.height,
      tint: 0xebe8ff,
    });
    container.addParticle(particle);
    stars.push({
      particle,
      alpha: between(rand, 0.35, 0.95),
      speed: between(rand, 0.6, 2.2),
      phase: rand() * TAU,
    });
  }
  return { container, stars };
}

export function createBackground(layout: SceneLayout, textures: TextureBag): Background {
  const rand = createRandom(20240601);
  const back = new Container();
  back.addChild(buildSky(layout, textures));
  const { container: starLayer, stars } = buildStars(layout, rand);
  back.addChild(starLayer);
  back.addChild(buildLand(layout, rand));
  const front = buildFront(layout, rand, textures);

  const setStars = (time: number, reduced: boolean) => {
    for (const star of stars) {
      star.particle.alpha = reduced
        ? star.alpha
        : star.alpha * (0.6 + 0.4 * Math.sin(time * star.speed + star.phase));
    }
  };
  setStars(0, true);

  return { back, front, update: setStars };
}
