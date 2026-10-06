import { Container, Graphics } from "pixi.js";
import type { SceneLayout } from "./layout";
import { between, clamp, TAU, toRadians } from "./math";
import { createRandom, type Random } from "./random";

const LOG_COUNT = 3;

interface Teepee {
  /** Logs on the far side of the fire. They go behind the flames. */
  back: Container;
  /** Logs on the near side. They go in front of the flames, so the fire has depth. */
  front: Container;
  /** Charcoal and glowing embers on the ground inside the stone ring. Goes under everything else. */
  bed: Container;
  /** Height of the logs' tips above the ground, so the flames and smoke can be sized to the structure. */
  height: number;
  /** Height at which the logs cross, above the ground. */
  crossing: number;
  /** Average radius of the ring the logs stand on. */
  baseRadius: number;
  /**
   * The angle (around the fire, as for the seats) of each gap between two neighbouring logs. The flames
   * come out through these.
   */
  gapAngles: readonly number[];
  update(time: number, flick: number, swing: number): void;
}

interface Burning {
  glow: Graphics;
  phase: number;
}

/** Points along the log from `from` to `to`, at fraction `t` (0 at the base, 1 at the tip). */
function along(from: { x: number; y: number }, to: { x: number; y: number }, t: number) {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/**
 * Builds the fire's logs: 3 thick logs leaning against each other in a cone. Each has bark, a lighter cut end at
 * the bottom, a charred tip and glowing cracks and embers along its lower part, as if it were lit from inside.
 * It is mirror-symmetric about the vertical axis through the fire: a log at the front and one mirrored pair. That
 * keeps the flames, which show through the gaps, evenly spread on both sides instead of leaning to one.
 */
export function createTeepee(layout: SceneLayout, rand: Random): Teepee {
  const { cx, cy, u } = layout;
  const back = new Container();
  const front = new Container();
  const bed = new Container();
  const burning: Burning[] = [];
  // The look of the wood (bark, cracks, ash) comes from its own stream, so it never moves where the logs stand.
  const deco = createRandom(4242);
  let tallest = 0;
  const crossingHeight = between(rand, 78, 90) * u;
  const thetas: number[] = [];
  let radiusSum = 0;
  // Angles around the fire, in degrees, with the group each log belongs to: front centre, then one mirrored pair.
  const LOGS = [
    { degrees: 90, group: 0 },
    { degrees: 210, group: 1 },
    { degrees: 330, group: 1 },
  ] as const;
  // Logs in a group share their size, so a mirrored pair really is a mirror image.
  const groups = [0, 1].map(() => ({
    baseRadius: between(rand, 38, 45) * u,
    crossingY: crossingHeight * between(rand, 0.94, 1.06),
    stick: between(rand, 0.26, 0.36),
    baseWidth: between(rand, 21, 25) * u,
    tipRatio: between(rand, 0.4, 0.52),
  }));

  for (let i = 0; i < LOG_COUNT; i++) {
    const log = LOGS[i];
    const params = groups[log?.group ?? 0];
    if (!log || !params) continue;
    const theta = toRadians(log.degrees);
    const baseRadius = params.baseRadius;
    thetas.push(theta);
    radiusSum += baseRadius;
    const base = {
      x: cx + Math.cos(theta) * baseRadius,
      y: cy + Math.sin(theta) * baseRadius * 0.32 + 2 * u,
    };
    // Every log passes through about the same crossing point near the top, and sticks out a little past it
    // on the other side, so the logs cross each other instead of all meeting at one point.
    const crossing = { x: cx, y: cy - params.crossingY };
    const stick = params.stick;
    const tip = {
      x: crossing.x + (crossing.x - base.x) * stick,
      y: crossing.y + (crossing.y - base.y) * stick,
    };
    tallest = Math.max(tallest, cy - tip.y);

    const dx = tip.x - base.x;
    const dy = tip.y - base.y;
    const length = Math.hypot(dx, dy);
    const normal = { x: -dy / length, y: dx / length };
    const baseWidth = params.baseWidth;
    const tipWidth = baseWidth * params.tipRatio;
    const widthAt = (t: number) => baseWidth + (tipWidth - baseWidth) * t;
    const edge = (t: number, side: number) => {
      const point = along(base, tip, t);
      return {
        x: point.x + normal.x * side * widthAt(t) * 0.5,
        y: point.y + normal.y * side * widthAt(t) * 0.5,
      };
    };

    const axisDir = { x: dx / length, y: dy / length };
    const body = new Graphics();
    const foot = new Graphics();
    // Which face of the log the flames light: the one toward the heart of the fire. The log in front hides the
    // flames behind it, so it is lit along both edges instead (0).
    const heart = { x: cx, y: cy - params.crossingY * 0.35 };
    const middle = along(base, tip, 0.4);
    const toHeart = (heart.x - middle.x) * normal.x + (heart.y - middle.y) * normal.y;
    const lit = Math.abs(toHeart) < baseWidth * 0.3 ? 0 : Math.sign(toHeart);
    /** A strip of the log between two lengths (0 base, 1 tip) and two offsets across it (-1 and 1 are the edges). */
    const strip = (t0: number, t1: number, s0: number, s1: number) => [
      edge(t0, s0).x,
      edge(t0, s0).y,
      edge(t1, s0).x,
      edge(t1, s0).y,
      edge(t1, s1).x,
      edge(t1, s1).y,
      edge(t0, s1).x,
      edge(t0, s1).y,
    ];

    // A soft shadow where the log meets the ground.
    foot
      .ellipse(base.x, base.y + baseWidth * 0.2, baseWidth * 0.8, baseWidth * 0.24)
      .fill({ color: 0x000000, alpha: 0.34 });

    // Bark.
    body
      .poly([
        edge(0, 1).x,
        edge(0, 1).y,
        edge(1, 1).x,
        edge(1, 1).y,
        edge(1, -1).x,
        edge(1, -1).y,
        edge(0, -1).x,
        edge(0, -1).y,
      ])
      .fill(0x2b1a11);
    // The tip is tapered and rounded.
    const tipPoint = along(base, tip, 1);
    body.circle(tipPoint.x, tipPoint.y, tipWidth * 0.5).fill(0x2b1a11);
    // The round of the log: lighter along the middle, darker toward the edges.
    body.poly(strip(0.02, 0.98, -0.55, 0.55)).fill({ color: 0x3d2619, alpha: 0.75 });
    body.poly(strip(0.02, 0.98, -0.25, 0.25)).fill({ color: 0x4a2f1f, alpha: 0.5 });
    if (lit === 0) {
      // Backlit by the flames behind it: a warm line along each edge.
      for (const side of [-1, 1]) {
        body.poly(strip(0.04, 0.8, side * 0.78, side)).fill({ color: 0xb8622a, alpha: 0.32 });
        body.poly(strip(0.04, 0.55, side * 0.92, side)).fill({ color: 0xff9a4a, alpha: 0.3 });
      }
    } else {
      // The face toward the fire takes its light, the far face is in shadow.
      body.poly(strip(0.02, 0.9, lit * 0.1, lit)).fill({ color: 0x8a4a22, alpha: 0.24 });
      body.poly(strip(0.02, 0.7, lit * 0.45, lit)).fill({ color: 0xb8662c, alpha: 0.26 });
      body.poly(strip(0.02, 0.5, lit * 0.78, lit)).fill({ color: 0xff9a4a, alpha: 0.22 });
      body.poly(strip(0.02, 0.98, -lit * 0.55, -lit)).fill({ color: 0x0c0705, alpha: 0.42 });
    }
    // Ridges of bark running along the grain, some catching a little light.
    for (let j = 0; j < 12; j++) {
      const offset = between(deco, -0.85, 0.85);
      const from = between(deco, 0.03, 0.7);
      const reach = between(deco, 0.1, 0.32);
      const ridge: number[] = [];
      let wander = offset;
      for (let k = 0; k <= 4; k++) {
        wander = clamp(wander + between(deco, -0.05, 0.05), -0.95, 0.95);
        const point = edge(Math.min(0.98, from + (reach * k) / 4), wander);
        ridge.push(point.x, point.y);
      }
      const catchesLight = lit !== 0 && Math.sign(offset) === lit && j % 2 === 0;
      body.poly(ridge, false).stroke({
        width: Math.max(0.7, u * 0.8),
        color: catchesLight ? 0x7a5236 : 0x120a06,
        alpha: catchesLight ? 0.45 : 0.55,
        cap: "round",
        join: "round",
      });
    }
    // Knots.
    for (let k = 0; k < 2; k++) {
      const t = between(deco, 0.2, 0.75);
      const point = edge(t, between(deco, -0.4, 0.4));
      const radius = widthAt(t) * 0.12;
      body.circle(point.x, point.y, radius).fill({ color: 0x150c08, alpha: 0.8 });
      body
        .circle(point.x, point.y, radius * 1.5)
        .stroke({ width: Math.max(0.6, u * 0.6), color: 0x6a4630, alpha: 0.4 });
    }
    // Slightly charred toward the tip: translucent layers starting at different points and all ending at the
    // round tip, so the black deepens gradually and there is no hard edge or notch.
    for (let k = 0; k < 8; k++) {
      const from = 0.5 + k * 0.058;
      body
        .poly([
          edge(from, 1).x,
          edge(from, 1).y,
          edge(1, 1).x,
          edge(1, 1).y,
          edge(1, -1).x,
          edge(1, -1).y,
          edge(from, -1).x,
          edge(from, -1).y,
        ])
        .fill({ color: 0x100907, alpha: 0.13 });
      body.circle(tipPoint.x, tipPoint.y, tipWidth * 0.5).fill({ color: 0x100907, alpha: 0.13 });
    }
    // The foot: a rounded, burnt end square to the log, as it lies in the embers (not a pale flat disc).
    const end = (scale: number) => {
      const points: number[] = [];
      for (let a = 0; a < 18; a++) {
        const angle = (a / 18) * TAU;
        points.push(
          base.x +
            normal.x * Math.cos(angle) * baseWidth * 0.5 * scale -
            axisDir.x * Math.sin(angle) * baseWidth * 0.2 * scale,
          base.y +
            normal.y * Math.cos(angle) * baseWidth * 0.5 * scale -
            axisDir.y * Math.sin(angle) * baseWidth * 0.2 * scale,
        );
      }
      return points;
    };
    body.poly(end(1)).fill(0x140b07);
    body
      .poly(end(0.72))
      .fill({ color: 0x2a1a11, alpha: 0.9 })
      .stroke({ width: Math.max(0.6, u * 0.6), color: 0x5a3a24, alpha: 0.5 });

    // Lit from inside: a heat that is strongest where the log meets the embers, glowing cracks along the grain, a
    // glowing ring on the foot and a few embers, all on the lower part.
    const glow = new Graphics();
    glow.blendMode = "add";
    const lowest = 0.62;
    for (let h = 0; h < 6; h++) {
      glow.poly(strip(0, 0.1 + h * 0.09, -0.9, 0.9)).fill({ color: 0xff5a14, alpha: 0.045 });
    }
    glow.poly(end(0.55)).fill({ color: 0xff5a14, alpha: 0.32 });
    glow.poly(end(0.72), true).stroke({
      width: Math.max(0.8, u * 0.9),
      color: 0xff8a30,
      alpha: 0.5,
    });
    for (let c = 0; c < 3; c++) {
      const crack: number[] = [];
      let side = between(deco, -0.55, 0.55);
      const drift = between(deco, -0.05, 0.05);
      let t = between(deco, 0.04, 0.4);
      const finish = Math.min(lowest, t + between(deco, 0.14, 0.3));
      for (; t <= finish; t += 0.035) {
        side = clamp(side + drift + between(deco, -0.035, 0.035), -0.8, 0.8);
        const point = edge(t, side);
        crack.push(point.x, point.y);
      }
      if (crack.length < 4) continue;
      glow.poly(crack, false).stroke({
        width: Math.max(2, baseWidth * 0.1),
        color: 0xff4a10,
        alpha: 0.26,
        cap: "round",
        join: "round",
      });
      glow.poly(crack, false).stroke({
        width: Math.max(0.8, u * 0.75),
        color: 0xffa040,
        alpha: 0.78,
        cap: "round",
        join: "round",
      });
    }
    for (let e = 0; e < 7; e++) {
      const point = edge(between(deco, 0.02, lowest), between(deco, -0.7, 0.7));
      glow
        .circle(point.x, point.y, between(deco, 0.5, 1.1) * u)
        .fill({ color: 0xffb347, alpha: 0.9 });
    }

    // Ash and charcoal heaped against the foot, so the log sinks into the embers.
    const mound = new Graphics();
    const heap = baseWidth * 0.5;
    /** A low irregular heap, flatter than it is wide. */
    const heapShape = (x: number, y: number, rx: number, ry: number) => {
      const points: number[] = [];
      for (let v = 0; v < 8; v++) {
        const angle = (v / 8) * TAU;
        const reach = between(deco, 0.75, 1.1);
        points.push(x + Math.cos(angle) * rx * reach, y + Math.sin(angle) * ry * reach);
      }
      return points;
    };
    for (let m = 0; m < 5; m++) {
      const spread = (m / 4 - 0.5) * 2;
      const x = base.x + spread * heap * 0.7;
      const y = base.y + heap * (0.1 + 0.12 * Math.abs(spread));
      const rx = heap * between(deco, 0.3, 0.45);
      const ry = heap * between(deco, 0.14, 0.22);
      mound.poly(heapShape(x, y, rx, ry)).fill({ color: m % 2 ? 0x2a2420 : 0x3d3732, alpha: 0.9 });
      mound
        .poly(heapShape(x - rx * 0.1, y - ry * 0.3, rx * 0.7, ry * 0.5))
        .fill({ color: 0x5a524a, alpha: 0.55 });
    }
    for (let m = 0; m < 4; m++) {
      mound
        .circle(
          base.x + between(deco, -0.8, 0.8) * heap,
          base.y + heap * between(deco, 0.08, 0.26),
          between(deco, 0.6, 1.1) * u,
        )
        .fill(0x15100d);
    }
    const moundGlow = new Graphics();
    moundGlow.blendMode = "add";
    for (let m = 0; m < 4; m++) {
      moundGlow
        .circle(
          base.x + between(deco, -0.8, 0.8) * heap,
          base.y + heap * between(deco, 0.06, 0.24),
          between(deco, 0.5, 1.1) * u,
        )
        .fill({ color: m % 2 ? 0xff7a28 : 0xffb347, alpha: 0.85 });
    }

    // Logs on the far side of the fire sit behind the flames, the others in front of them.
    const layer = Math.sin(theta) < 0 ? back : front;
    layer.addChild(foot, body, glow, mound, moundGlow);
    burning.push({ glow, phase: rand() * TAU });
  }

  // The bed: ash, lumps of charcoal and glowing coals on the ground inside the stone ring.
  const ash = new Graphics();
  for (let i = 0; i < 9; i++) {
    const a = deco() * TAU;
    const r = Math.sqrt(deco()) * 33 * u;
    ash
      .ellipse(
        cx + Math.cos(a) * r,
        cy + 2 * u + Math.sin(a) * r * 0.32,
        between(deco, 4, 9) * u,
        between(deco, 1.6, 3.2) * u,
      )
      .fill({ color: 0x4a443f, alpha: 0.5 });
  }
  const charcoal = new Graphics();
  const coalGlow = new Graphics();
  coalGlow.blendMode = "add";
  /** An irregular lump, flatter than it is wide because the ground is seen at a slant. */
  const lump = (x: number, y: number, size: number, scale = 1) => {
    const points: number[] = [];
    for (let v = 0; v < 7; v++) {
      const angle = (v / 7) * TAU + between(deco, -0.2, 0.2);
      const reach = size * between(deco, 0.72, 1.1) * scale;
      points.push(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach * 0.45);
    }
    return points;
  };
  for (let i = 0; i < 16; i++) {
    const a = deco() * TAU;
    const r = Math.sqrt(deco()) * 30 * u;
    const x = cx + Math.cos(a) * r;
    const y = cy + 2 * u + Math.sin(a) * r * 0.32;
    const size = between(deco, 3, 6) * u;
    const shape = lump(x, y, size);
    charcoal.poly(shape).fill(0x1a100c);
    charcoal
      .poly(lump(x - size * 0.12, y - size * 0.1, size, 0.7))
      .fill({ color: 0x33241b, alpha: 0.7 });
    // Most lumps glow through their cracks, a few are cold and grey.
    if (i % 4 !== 3) {
      coalGlow.poly(lump(x, y + size * 0.08, size, 0.55)).fill({
        color: i % 3 ? 0xff6a20 : 0xff9a3a,
        alpha: 0.5,
      });
    }
  }
  const embersA = new Graphics();
  const embersB = new Graphics();
  embersA.blendMode = embersB.blendMode = "add";
  for (let i = 0; i < 34; i++) {
    const a = deco() * TAU;
    const r = Math.sqrt(deco()) * 32 * u;
    const target = i % 2 ? embersA : embersB;
    target
      .circle(cx + Math.cos(a) * r, cy + 2 * u + Math.sin(a) * r * 0.32, between(deco, 0.8, 2) * u)
      .fill({ color: i % 3 ? 0xff8a2e : 0xffc260, alpha: 0.9 });
  }
  const bedGlow = new Graphics();
  bedGlow.blendMode = "add";
  bedGlow.ellipse(cx, cy + 2 * u, 35 * u, 10.5 * u).fill({ color: 0xff5a14, alpha: 0.45 });
  bedGlow.ellipse(cx, cy + 2 * u, 19 * u, 5.5 * u).fill({ color: 0xff9a3a, alpha: 0.5 });
  bed.addChild(ash, charcoal, bedGlow, coalGlow, embersA, embersB);

  const update = (time: number, flick: number, swing: number) => {
    for (const log of burning) {
      const wobble = 0.25 * Math.sin(time * 3 + log.phase) * swing;
      log.glow.alpha = clamp(0.55 + 0.45 * clamp(flick + wobble, 0, 1), 0.3, 1);
    }
    bedGlow.alpha = clamp(0.6 + 0.4 * flick, 0.4, 1);
    coalGlow.alpha = clamp(0.55 + 0.45 * flick + 0.15 * Math.sin(time * 1.7) * swing, 0.35, 1);
    embersA.alpha = clamp(0.55 + 0.45 * Math.sin(time * 2.3) * swing + 0.2, 0.3, 1);
    embersB.alpha = clamp(0.55 + 0.45 * Math.sin(time * 2.3 + Math.PI) * swing + 0.2, 0.3, 1);
  };
  update(0, 0.5, 0);

  const sorted = [...thetas].sort((a, b) => a - b);
  const gapAngles = sorted.map((angle, i) => {
    const next = sorted[(i + 1) % sorted.length] ?? angle;
    return (angle + (i + 1 < sorted.length ? next : next + TAU)) / 2;
  });

  return {
    back,
    front,
    bed,
    height: tallest,
    crossing: crossingHeight,
    baseRadius: radiusSum / LOG_COUNT,
    gapAngles,
    update,
  };
}
