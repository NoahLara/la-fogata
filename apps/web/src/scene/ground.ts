import { Sprite } from "pixi.js";
import type { SceneLayout } from "./layout";
import { between, clamp, randomInt, smoothstep, TAU } from "./math";
import { pick, type Random } from "./random";
import { createCanvas, type TextureBag } from "./textures";

/** The baked ground. Everything here is drawn once per build; only `lit` changes, in alpha. */
export interface Ground {
  /** Packed dirt, soil texture, pebbles, twigs and leaves, from the horizon down. */
  soil: Sprite;
  /** The same soil again in warm firelight, strongest next to the fire. Its alpha follows the flicker. */
  lit: Sprite;
  /** Grass tufts, denser toward the sides and the tree line. Goes over the tree bases. */
  tufts: Sprite;
  /** Tall grass along the bottom edge. Goes in front of everything. */
  foreground: Sprite;
}

/** A canvas drawn in scene pixels but stored at a lower resolution when the scene is huge. */
interface Surface {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  resolution: number;
}

const MAX_PIXELS = 3_000_000;

function surface(width: number, height: number): Surface {
  const resolution = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)));
  return { ...createCanvas(width, height, resolution), resolution };
}

/** An ellipse that fades out from its center by the given `[offset, color]` stops. */
function softEllipse(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  stops: readonly (readonly [number, string])[],
): void {
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  const gradient = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  g.fillStyle = gradient;
  g.beginPath();
  g.arc(0, 0, rx, 0, TAU);
  g.fill();
  g.restore();
}

function rgba(color: string, alpha: number): string {
  return `rgba(${color},${alpha})`;
}

/** Where things are, shared by everything that gets scattered over the soil. Coordinates are soil pixels. */
interface Terrain {
  width: number;
  height: number;
  /** Scene unit. */
  u: number;
  /** The fire, and the worn circle around it. */
  fireX: number;
  fireY: number;
  wornRx: number;
  wornRy: number;
  /** Things drawn farther down the soil are bigger. */
  scaleAt(y: number): number;
  /** The fire's stones and ash, which nothing is scattered over. */
  nearFire(x: number, y: number): boolean;
  /** 0 outside the worn circle, 1 in its middle. */
  worn(x: number, y: number): number;
}

function terrainFor(layout: SceneLayout): Terrain {
  const { width, height, horizon, u, cx, cy, rx, ry } = layout;
  const soilHeight = height - horizon;
  const fireX = cx;
  const fireY = cy - horizon;
  const wornRx = rx * 1.14 + 30 * u;
  const wornRy = ry * 1.4 + 16 * u;
  return {
    width,
    height: soilHeight,
    u,
    fireX,
    fireY,
    wornRx,
    wornRy,
    scaleAt: (y) => u * (0.55 + 0.75 * clamp(y / soilHeight, 0, 1)),
    nearFire: (x, y) => ((x - fireX) / (72 * u)) ** 2 + ((y - fireY) / (22 * u)) ** 2 < 1,
    worn: (x, y) => 1 - smoothstep(0.55, 1, Math.hypot((x - fireX) / wornRx, (y - fireY) / wornRy)),
  };
}

function paintSoil(g: CanvasRenderingContext2D, t: Terrain, rand: Random): void {
  const { width, height, u, fireX, fireY } = t;

  // Dark, cool earth, paler toward the tree line and darkest at the bottom.
  const base = g.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#0f1120");
  base.addColorStop(0.5, "#14121a");
  base.addColorStop(1, "#09090d");
  g.fillStyle = base;
  g.fillRect(0, 0, width, height);

  // Patches of slightly different earth: warm brown, cool slate, moss and plum.
  for (let i = 0; i < 90; i++) {
    const color = pick(rand, ["74,54,40", "60,66,100", "50,66,46", "70,52,72"]);
    const radius = between(rand, 40, 150) * u;
    softEllipse(g, rand() * width, rand() * height, radius, radius * between(rand, 0.35, 0.6), [
      [0, rgba(color, between(rand, 0.04, 0.1))],
      [1, rgba(color, 0)],
    ]);
  }

  // The worn circle: packed, slightly lighter dirt with an uneven rim.
  softEllipse(g, fireX, fireY, t.wornRx, t.wornRy, [
    [0, "rgba(108,82,60,.4)"],
    [0.5, "rgba(94,70,54,.32)"],
    [0.78, "rgba(66,50,42,.16)"],
    [1, "rgba(40,32,34,0)"],
  ]);
  for (let i = 0; i < 46; i++) {
    const angle = rand() * TAU;
    const reach = between(rand, 0.8, 1.02);
    const radius = between(rand, 10, 32) * u;
    softEllipse(
      g,
      fireX + Math.cos(angle) * t.wornRx * reach,
      fireY + Math.sin(angle) * t.wornRy * reach,
      radius,
      radius * 0.5,
      [
        [0, rgba("84,62,48", between(rand, 0.05, 0.11))],
        [1, "rgba(84,62,48,0)"],
      ],
    );
  }
  // Scorched, ashy ground right around the stones.
  softEllipse(g, fireX, fireY, 82 * u, 27 * u, [
    [0, "rgba(14,11,12,.6)"],
    [0.6, "rgba(18,14,14,.38)"],
    [1, "rgba(18,14,14,0)"],
  ]);

  // Grain: thousands of tiny dark and light flecks.
  const flecks = Math.round((width * height) / 140);
  for (let i = 0; i < flecks; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const size = between(rand, 0.6, 2.2) * t.scaleAt(y);
    g.fillStyle = rand() < 0.55 ? "rgba(0,0,0,.2)" : "rgba(160,128,100,.1)";
    g.fillRect(x, y, size, size * 0.8);
  }
}

function paintPebbles(g: CanvasRenderingContext2D, t: Terrain, rand: Random): void {
  const { width, height } = t;
  const stones = ["78,73,84", "90,80,72", "64,60,70", "84,75,65"];
  const pebble = (x: number, y: number) => {
    if (t.nearFire(x, y)) return;
    const w = between(rand, 1.8, 5) * t.scaleAt(y);
    const h = w * between(rand, 0.55, 0.8);
    g.fillStyle = "rgba(0,0,0,.4)";
    g.beginPath();
    g.ellipse(x + w * 0.15, y + h * 0.3, w / 2, h / 2, 0, 0, TAU);
    g.fill();
    g.fillStyle = rgba(pick(rand, stones), 0.9);
    g.beginPath();
    g.ellipse(x, y, w / 2, h / 2, 0, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(255,240,220,.12)";
    g.beginPath();
    g.ellipse(x - w * 0.12, y - h * 0.18, w * 0.28, h * 0.22, 0, 0, TAU);
    g.fill();
  };
  const total = Math.round((width * height) / 5500);
  for (let i = 0; i < total * 0.7; i++) pebble(rand() * width, rand() * height);
  for (let cluster = 0; cluster < total * 0.05; cluster++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const spread = 14 * t.u;
    for (let i = 0; i < 5; i++)
      pebble(cx + between(rand, -spread, spread), cy + between(rand, -spread, spread) * 0.5);
  }
}

function paintTwigs(g: CanvasRenderingContext2D, t: Terrain, rand: Random): void {
  g.lineCap = "round";
  const stroke = (x: number, y: number, angle: number, length: number, thickness: number) => {
    const bend = between(rand, -0.25, 0.25);
    const tipX = x + Math.cos(angle) * length;
    const tipY = y + Math.sin(angle) * length;
    const midX = x + Math.cos(angle + bend) * length * 0.5;
    const midY = y + Math.sin(angle + bend) * length * 0.5;
    for (const [dy, color, width] of [
      [0, "#2e2018", thickness],
      [-0.5, "rgba(130,92,60,.35)", thickness * 0.4],
    ] as const) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x, y + dy);
      g.quadraticCurveTo(midX, midY + dy, tipX, tipY + dy);
      g.stroke();
    }
    return { midX, midY };
  };
  for (let i = 0; i < 16; i++) {
    const x = rand() * t.width;
    const y = rand() * t.height;
    if (t.nearFire(x, y)) continue;
    const s = t.scaleAt(y);
    const angle = between(rand, -0.5, 0.5) + (rand() < 0.5 ? 0 : Math.PI);
    const length = between(rand, 10, 26) * s;
    const thickness = Math.max(0.8, 1.4 * s);
    const { midX, midY } = stroke(x, y, angle, length, thickness);
    for (let fork = 0; fork < 2; fork++) {
      if (rand() < 0.45) continue;
      const side = rand() < 0.5 ? -1 : 1;
      stroke(
        midX,
        midY,
        angle + side * between(rand, 0.45, 0.7),
        length * between(rand, 0.3, 0.5),
        thickness * 0.7,
      );
    }
  }
}

function paintLeaves(g: CanvasRenderingContext2D, t: Terrain, rand: Random): void {
  const colors = ["94,64,38", "111,76,42", "122,90,46", "74,51,34", "106,90,48"];
  for (let i = 0; i < 36; i++) {
    const x = rand() * t.width;
    const y = rand() * t.height;
    if (t.nearFire(x, y)) continue;
    const w = between(rand, 3, 6.5) * t.scaleAt(y);
    const turn = rand() * Math.PI;
    g.save();
    g.translate(x, y);
    g.rotate(turn);
    g.fillStyle = rgba(pick(rand, colors), 0.85);
    g.beginPath();
    g.ellipse(0, 0, w / 2, w * 0.23, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,.3)";
    g.lineWidth = Math.max(0.5, w * 0.06);
    g.beginPath();
    g.moveTo(-w / 2, 0);
    g.lineTo(w / 2, 0);
    g.stroke();
    g.restore();
  }
}

/** Grass colors, from the cold bluish tufts far away to the greener, darker ones up close. */
function grassColor(depth: number, shade: number): string {
  const r = Math.round(14 + 4 * depth + 5 * shade);
  const gr = Math.round(21 + 7 * depth + 8 * shade);
  const b = Math.round(27 - 4 * depth + 3 * shade);
  return `rgb(${r},${gr},${b})`;
}

function blades(
  g: CanvasRenderingContext2D,
  rand: Random,
  x: number,
  y: number,
  height: number,
  count: number,
  width: number,
  color: string,
): void {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  const lean = between(rand, -0.3, 0.3) * height;
  for (let i = 0; i < count; i++) {
    const spread = ((i + 0.5) / count - 0.5) * height * 0.9;
    const h = height * between(rand, 0.6, 1);
    const tipX = x + spread + lean * between(rand, 0.5, 1);
    g.beginPath();
    g.moveTo(x + spread * 0.25, y);
    g.quadraticCurveTo(x + spread * 0.5, y - h * 0.6, tipX, y - h);
    g.stroke();
  }
}

/** Tufts of grass over the soil, thicker toward the sides and up at the tree line, none on the worn ground. */
function paintTufts(g: CanvasRenderingContext2D, t: Terrain, rand: Random): void {
  const half = t.width / 2;
  const tufts: { x: number; y: number; depth: number }[] = [];
  const attempts = Math.round((t.width * t.height) / 110);
  for (let i = 0; i < attempts; i++) {
    const x = rand() * t.width;
    const y = rand() * t.height;
    const sides = smoothstep(0.4, 1, Math.abs(x - t.fireX) / half);
    const treeLine = (1 - clamp(y / (t.height * 0.45), 0, 1)) ** 1.5;
    const density = clamp(Math.max(sides, treeLine * 0.9) + 0.03, 0, 1) * (1 - 0.95 * t.worn(x, y));
    if (rand() < density ** 1.4 * 0.32) tufts.push({ x, y, depth: y / t.height });
  }
  tufts.sort((a, b) => a.y - b.y);
  for (const tuft of tufts) {
    const s = t.scaleAt(tuft.y);
    blades(
      g,
      rand,
      tuft.x,
      tuft.y,
      between(rand, 6, 14) * s,
      randomInt(rand, 3, 7),
      Math.max(0.7, 1.2 * s),
      grassColor(tuft.depth, rand()),
    );
  }
}

/** The tall dark grass along the bottom of the scene, denser toward the sides. Nothing in the middle. */
function paintForeground(
  g: CanvasRenderingContext2D,
  rand: Random,
  width: number,
  height: number,
  u: number,
): void {
  const half = width / 2;
  for (let x = 0; x < width; x += 3) {
    const sides = smoothstep(0.28, 1, Math.abs(x - half) / half);
    if (sides === 0 || rand() > 0.15 + 0.85 * sides) continue;
    const h = between(rand, 12, 30 + 24 * sides) * u;
    blades(
      g,
      rand,
      x,
      height,
      h,
      randomInt(rand, 2, 4),
      Math.max(1.5, 2 * u),
      rand() < 0.5 ? "#04050a" : "#06080b",
    );
  }
}

export function bakeGround(layout: SceneLayout, textures: TextureBag, rand: Random): Ground {
  const { width, height, horizon, u, rx, ry } = layout;
  const terrain = terrainFor(layout);
  const soilHeight = terrain.height;

  const soil = surface(width, soilHeight);
  paintSoil(soil.g, terrain, rand);
  paintPebbles(soil.g, terrain, rand);
  paintTwigs(soil.g, terrain, rand);
  paintLeaves(soil.g, terrain, rand);

  // The lit copy: the soil, kept only near the fire. Tinted warm and added over the soil, it brings out
  // whatever is lighter in the dirt, the pebbles and the leaves.
  const lit = surface(width, soilHeight);
  lit.g.drawImage(soil.canvas, 0, 0, width, soilHeight);
  lit.g.globalCompositeOperation = "destination-in";
  softEllipse(lit.g, terrain.fireX, terrain.fireY, rx * 1.3 + 40 * u, ry * 2 + 30 * u, [
    [0, "rgba(0,0,0,1)"],
    [0.4, "rgba(0,0,0,.6)"],
    [1, "rgba(0,0,0,0)"],
  ]);

  const tufts = surface(width, soilHeight);
  paintTufts(tufts.g, terrain, rand);

  const foregroundHeight = Math.ceil(56 * u);
  const foreground = surface(width, foregroundHeight);
  paintForeground(foreground.g, rand, width, foregroundHeight, u);

  const sprite = (from: Surface, spriteWidth: number, spriteHeight: number, y: number): Sprite => {
    const result = new Sprite(textures.fromCanvas(from.canvas, from.resolution));
    result.width = spriteWidth;
    result.height = spriteHeight;
    result.position.set(0, y);
    return result;
  };
  const litSprite = sprite(lit, width, soilHeight, horizon);
  litSprite.tint = 0xff9440;
  litSprite.blendMode = "add";
  return {
    soil: sprite(soil, width, soilHeight, horizon),
    lit: litSprite,
    tufts: sprite(tufts, width, soilHeight, horizon),
    foreground: sprite(foreground, width, foregroundHeight, height - foregroundHeight),
  };
}
