import type { Graphics } from "pixi.js";

const TAU = Math.PI * 2;

interface Paint {
  color: number;
  alpha: number;
}

/** Parses the two CSS color forms the prototype uses: `#rrggbb` and `rgba(r,g,b,a)`. */
export function paint(css: string): Paint {
  if (css.startsWith("#")) return { color: parseInt(css.slice(1), 16), alpha: 1 };
  const match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(css);
  if (!match) throw new Error(`Unsupported color: ${css}`);
  const [, r, g, b, a] = match;
  return { color: (Number(r) << 16) | (Number(g) << 8) | Number(b), alpha: Number(a) };
}

/** Ellipse centered at (x, y) with radii a, b, rotated by `rot` radians. Pixi ellipses can't rotate, so tilted ones are polygons. */
export function ellipse(
  g: Graphics,
  css: string,
  x: number,
  y: number,
  a: number,
  b: number,
  rot = 0,
): void {
  if (rot === 0) {
    g.ellipse(x, y, a, b).fill(paint(css));
    return;
  }
  const points: number[] = [];
  const steps = 28;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TAU;
    const px = a * Math.cos(t);
    const py = b * Math.sin(t);
    points.push(x + px * cos - py * sin, y + px * sin + py * cos);
  }
  g.poly(points).fill(paint(css));
}

export function circle(g: Graphics, css: string, x: number, y: number, r: number): void {
  g.circle(x, y, r).fill(paint(css));
}

export function polygon(g: Graphics, css: string, points: readonly number[]): void {
  g.poly([...points]).fill(paint(css));
}

export function roundRect(
  g: Graphics,
  css: string,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  g.roundRect(x, y, w, h, r).fill(paint(css));
}

/** Strokes whatever `path` adds to `g` (moveTo / lineTo / curves) with a round pen. */
export function stroke(g: Graphics, css: string, width: number, path: () => void): void {
  path();
  const { color, alpha } = paint(css);
  g.stroke({ width, color, alpha, cap: "round", join: "round" });
}

/** The part of a circle between two heights; stands in for the prototype's canvas clip. */
export function circleBand(
  g: Graphics,
  css: string,
  cx: number,
  cy: number,
  r: number,
  top: number,
  bottom: number,
): void {
  const steps = 16;
  const halfWidth = (y: number) => Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = top + ((bottom - top) * i) / steps;
    points.push(cx - halfWidth(y), y);
  }
  for (let i = steps; i >= 0; i--) {
    const y = top + ((bottom - top) * i) / steps;
    points.push(cx + halfWidth(y), y);
  }
  g.poly(points).fill(paint(css));
}

export function smile(g: Graphics, css: string, y: number): void {
  stroke(g, css, 1.2, () => {
    g.moveTo(-3, y)
      .quadraticCurveTo(-1.5, y + 1.6, 0, y)
      .quadraticCurveTo(1.5, y + 1.6, 3, y);
  });
}

export function blush(g: Graphics, alpha: number): void {
  circle(g, `rgba(255,130,140,${alpha})`, -15.5, -67, 4);
  circle(g, `rgba(255,130,140,${alpha})`, 15.5, -67, 4);
}

export function eyes(g: Graphics, css: string, y: number): void {
  circle(g, css, -9, y, 2.8);
  circle(g, css, 9, y, 2.8);
  circle(g, "rgba(255,255,255,.85)", -8, y - 1, 0.9);
  circle(g, "rgba(255,255,255,.85)", 10, y - 1, 0.9);
}

interface BaseOptions {
  body: string;
  belly?: string;
  arm?: string;
  foot?: string;
  back: boolean;
}

/** The round body shared by most animals: body, belly, feet and arms. */
export function base(g: Graphics, o: BaseOptions): void {
  ellipse(g, o.body, 0, -31, 31, 31);
  if (!o.back && o.belly) ellipse(g, o.belly, 0, -26, 18, 21);
  if (!o.back && o.foot) {
    ellipse(g, o.foot, -14, -4, 10, 6);
    ellipse(g, o.foot, 14, -4, 10, 6);
  }
  if (o.arm) {
    ellipse(g, o.arm, -25, -33, 8, 14, 0.35);
    ellipse(g, o.arm, 25, -33, 8, 14, -0.35);
  }
}
