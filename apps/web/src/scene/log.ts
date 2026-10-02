import { Graphics } from "pixi.js";
import type { Point } from "./layout";
import type { Cap, LogShape } from "./logShape";
import { between } from "./math";
import type { Random } from "./random";

const BARK_SHADOW = 0x2a1b12;
const BARK_TOP = 0x6a4a32;
const WARM = 0xff9650;

function mixColor(from: number, to: number, t: number): number {
  const channel = (shift: number) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** An ellipse as a polygon path, so it can be filled or stroked after being built: `scale` shrinks it toward the centre. */
function ellipsePath(g: Graphics, cap: Cap, scale: number): void {
  const points: number[] = [];
  for (let i = 0; i < 24; i++) {
    const phi = (i / 24) * Math.PI * 2;
    points.push(
      cap.center.x + scale * (Math.cos(phi) * cap.up.x + Math.sin(phi) * cap.side.x),
      cap.center.y + scale * (Math.cos(phi) * cap.up.y + Math.sin(phi) * cap.side.y),
    );
  }
  g.poly(points, true);
}

/** Dark streaks and a couple of knots along the bark, on the part of the log that shows. */
function drawBark(g: Graphics, shape: LogShape, rand: Random): void {
  const streak = (width: number, color: number, alpha: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const theta = between(rand, 0, Math.PI * 2);
      if (!shape.visible(theta)) continue;
      const start = between(rand, -0.95, 0.5);
      const end = start + between(rand, 0.15, 0.45);
      const wobble = between(rand, -0.04, 0.04);
      const a = shape.surface(theta, start);
      const b = shape.surface(theta + wobble, (start + end) / 2);
      const c = shape.surface(theta, Math.min(end, 1));
      g.moveTo(a.x, a.y).quadraticCurveTo(b.x, b.y, c.x, c.y);
      g.stroke({ width, color, alpha, cap: "round" });
    }
  };
  streak(1.3, 0x100906, 0.6, 70);
  streak(1.1, 0x7a583d, 0.22, 40);

  for (let i = 0; i < 3; i++) {
    const theta = between(rand, -0.9, 0.9) * 0.5 + Math.PI * (rand() < 0.5 ? 0 : 0.35);
    if (!shape.visible(theta)) continue;
    const at: Point = shape.surface(theta, between(rand, -0.6, 0.6));
    g.ellipse(at.x, at.y, 3.4, 2.4).fill({ color: 0x1a0f09, alpha: 0.85 });
    g.ellipse(at.x, at.y, 1.7, 1.1).fill({ color: 0x4a3120, alpha: 0.9 });
  }
}

/** The sawn end: bark around pale wood, with growth rings, a dark heart and a crack. */
function drawCap(g: Graphics, cap: Cap, rand: Random): void {
  ellipsePath(g, cap, 1);
  g.fill(0x33231a);
  ellipsePath(g, cap, 0.9);
  g.fill(0x9a7048);
  for (const scale of [0.74, 0.55, 0.36]) {
    ellipsePath(g, cap, scale);
    g.stroke({ width: 0.9, color: 0x65462c, alpha: 0.85 });
  }
  ellipsePath(g, cap, 0.1);
  g.fill(0x4a321f);
  const phi = between(rand, 0, Math.PI * 2);
  const crack = (scale: number) => ({
    x: cap.center.x + scale * (Math.cos(phi) * cap.up.x + Math.sin(phi) * cap.side.x),
    y: cap.center.y + scale * (Math.cos(phi) * cap.up.y + Math.sin(phi) * cap.side.y),
  });
  g.moveTo(cap.center.x, cap.center.y).lineTo(crack(0.85).x, crack(0.85).y);
  g.stroke({ width: 0.8, color: 0x3d2918, alpha: 0.8, cap: "round" });
}

export interface LogGraphics {
  /** The log's own colours, lit by the sky alone. Tint it to darken it. */
  body: Graphics;
  /** The warm light of the fire where it reaches the log. Fade it with the fire. */
  warm: Graphics;
}

/** Draws a log from its shape: the side in strips, shaded around the log, then the bark, and the sawn end if it shows. */
export function drawLog(shape: LogShape, rand: Random): LogGraphics {
  const body = new Graphics();
  const warm = new Graphics();

  for (const strip of shape.strips) {
    const color = mixColor(BARK_SHADOW, BARK_TOP, strip.top);
    // A hairline in the same colour closes the seams between neighbouring strips.
    body.poly(
      strip.points.flatMap((p) => [p.x, p.y]),
      true,
    );
    body.fill(color).stroke({ width: 0.7, color });
    if (strip.lit > 0.02) {
      warm.poly(
        strip.points.flatMap((p) => [p.x, p.y]),
        true,
      );
      warm.fill({ color: WARM, alpha: Math.pow(strip.lit, 1.2) * 0.7 });
    }
  }
  drawBark(body, shape, rand);

  if (shape.cap) {
    drawCap(body, shape.cap, rand);
    if (shape.cap.lit > 0.02) {
      ellipsePath(warm, shape.cap, 0.97);
      warm.fill({ color: WARM, alpha: shape.cap.lit * 0.6 });
    }
  }
  return { body, warm };
}
