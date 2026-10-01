import { Container, Graphics } from "pixi.js";
import type { SceneLayout } from "./layout";
import { between, clamp, TAU, toRadians } from "./math";
import type { Random } from "./random";

const LOG_COUNT = 5;

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
 * Builds the fire's logs: 5 thick logs leaning against each other in a cone. Each has bark, a lighter cut end at
 * the bottom, a charred tip and glowing cracks and embers along its lower part, as if it were lit from inside.
 * It is mirror-symmetric about the vertical axis through the fire: a log at the front and two mirrored pairs. That
 * keeps the flames, which show through the gaps, evenly spread on both sides instead of leaning to one.
 */
export function createTeepee(layout: SceneLayout, rand: Random): Teepee {
  const { cx, cy, u } = layout;
  const back = new Container();
  const front = new Container();
  const bed = new Container();
  const burning: Burning[] = [];
  let tallest = 0;
  const crossingHeight = between(rand, 78, 90) * u;
  const thetas: number[] = [];
  let radiusSum = 0;
  // Angles around the fire, in degrees, with the group each log belongs to: front centre, then two mirrored pairs.
  const LOGS = [
    { degrees: 90, group: 0 },
    { degrees: 162, group: 1 },
    { degrees: 18, group: 1 },
    { degrees: 234, group: 2 },
    { degrees: 306, group: 2 },
  ] as const;
  // Logs in a group share their size, so a mirrored pair really is a mirror image.
  const groups = [0, 1, 2].map(() => ({
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

    const body = new Graphics();
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
    // A lighter edge along one side and darker furrows across it.
    body
      .moveTo(edge(0.02, 0.62).x, edge(0.02, 0.62).y)
      .lineTo(edge(0.95, 0.62).x, edge(0.95, 0.62).y);
    body.stroke({ width: widthAt(0.3) * 0.2, color: 0x5c3d27, alpha: 0.8, cap: "round" });
    for (let j = 0; j < 9; j++) {
      const t = between(rand, 0.05, 0.85);
      const side = between(rand, -0.45, 0.45);
      const start = edge(t, side * 2);
      const end = edge(
        Math.min(0.98, t + between(rand, 0.06, 0.16)),
        side * 2 + between(rand, -0.2, 0.2),
      );
      body.moveTo(start.x, start.y).lineTo(end.x, end.y);
    }
    body.stroke({ width: Math.max(0.8, u * 0.9), color: 0x1e120b, alpha: 0.65, cap: "round" });
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
    // Lighter cut end at the bottom, where the log meets the ground.
    body.ellipse(base.x, base.y, baseWidth * 0.55, baseWidth * 0.3).fill(0x9a7048);
    body.ellipse(base.x, base.y, baseWidth * 0.36, baseWidth * 0.19).fill(0x7a5236);
    body.ellipse(base.x, base.y, baseWidth * 0.14, baseWidth * 0.08).fill(0x9a7048);

    // Lit from inside: glowing cracks, a faint wide glow and embers, all on the lower part.
    const glow = new Graphics();
    glow.blendMode = "add";
    const lowest = 0.62;
    const centre = [] as number[];
    for (let t = 0.04; t <= lowest; t += 0.06) {
      const point = edge(t, between(rand, -0.3, 0.3));
      centre.push(point.x, point.y);
    }
    glow.poly(centre, false).stroke({
      width: baseWidth * 0.3,
      color: 0xff5a14,
      alpha: 0.1,
      cap: "round",
      join: "round",
    });
    for (let c = 0; c < 3; c++) {
      const crack = [] as number[];
      const side = between(rand, -0.5, 0.5);
      let t = between(rand, 0.03, 0.2);
      const end = Math.min(lowest, t + between(rand, 0.2, 0.4));
      for (; t <= end; t += 0.045) {
        const point = edge(t, side + between(rand, -0.22, 0.22));
        crack.push(point.x, point.y);
      }
      if (crack.length >= 4)
        glow.poly(crack, false).stroke({
          width: Math.max(1, u * 1.3),
          color: 0xff7a24,
          alpha: 0.85,
          cap: "round",
          join: "round",
        });
    }
    for (let e = 0; e < 7; e++) {
      const point = edge(between(rand, 0.02, lowest), between(rand, -0.7, 0.7));
      glow
        .circle(point.x, point.y, between(rand, 0.5, 1.1) * u)
        .fill({ color: 0xffb347, alpha: 0.9 });
    }

    // Logs on the far side of the fire sit behind the flames, the others in front of them.
    const layer = Math.sin(theta) < 0 ? back : front;
    layer.addChild(body, glow);
    burning.push({ glow, phase: rand() * TAU });
  }

  // The bed: charcoal and glowing embers on the ground inside the stone ring.
  const charcoal = new Graphics();
  for (let i = 0; i < 12; i++) {
    const a = rand() * TAU;
    const r = Math.sqrt(rand()) * 31 * u;
    charcoal
      .ellipse(
        cx + Math.cos(a) * r,
        cy + 2 * u + Math.sin(a) * r * 0.32,
        between(rand, 3, 6) * u,
        between(rand, 1.6, 3) * u,
      )
      .fill(0x1a100c);
  }
  const embersA = new Graphics();
  const embersB = new Graphics();
  embersA.blendMode = embersB.blendMode = "add";
  for (let i = 0; i < 34; i++) {
    const a = rand() * TAU;
    const r = Math.sqrt(rand()) * 32 * u;
    const target = i % 2 ? embersA : embersB;
    target
      .circle(cx + Math.cos(a) * r, cy + 2 * u + Math.sin(a) * r * 0.32, between(rand, 0.8, 2) * u)
      .fill({ color: i % 3 ? 0xff8a2e : 0xffc260, alpha: 0.9 });
  }
  const bedGlow = new Graphics();
  bedGlow.blendMode = "add";
  bedGlow.ellipse(cx, cy + 2 * u, 35 * u, 10.5 * u).fill({ color: 0xff5a14, alpha: 0.45 });
  bedGlow.ellipse(cx, cy + 2 * u, 19 * u, 5.5 * u).fill({ color: 0xff9a3a, alpha: 0.5 });
  bed.addChild(charcoal, bedGlow, embersA, embersB);

  const update = (time: number, flick: number, swing: number) => {
    for (const log of burning) {
      const wobble = 0.25 * Math.sin(time * 3 + log.phase) * swing;
      log.glow.alpha = clamp(0.55 + 0.45 * clamp(flick + wobble, 0, 1), 0.3, 1);
    }
    bedGlow.alpha = clamp(0.6 + 0.4 * flick, 0.4, 1);
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
