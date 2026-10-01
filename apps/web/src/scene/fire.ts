import { Container, Graphics, Particle, ParticleContainer, Sprite } from "pixi.js";
import type { SceneLayout } from "./layout";
import { between, clamp, createRandom, pick, TAU, type Random } from "./random";
import { createTeepee } from "./teepee";
import type { TextureBag } from "./textures";


/**
 * Colours along a flame tongue's life: a pale base, then yellow, orange, and a deep red-orange at the tip.
 * Only the very first stretch is near white, so the fire reads as defined orange and yellow tongues.
 */
const TONGUE_COLORS = [
  0xffe9a0, 0xffcb55, 0xffa534, 0xff8226, 0xff5e1e, 0xd9421a, 0x9c2a14,
] as const;

const SOFT_DISC = [
  [0, 1],
  [0.4, 0.55],
  [1, 0],
] as const;
const GLOW = [
  [0, 1],
  [0.3, 0.45],
  [1, 0],
] as const;
const GROUND_LIGHT = [
  [0, 1],
  [0.5, 0.33],
  [1, 0],
] as const;
const DISC_SIZE = 128;
/** Size of the flame tongue texture (see `TextureBag.flameTongue`). */
const TONGUE_WIDTH = 64;
const TONGUE_HEIGHT = 128;

interface Tongue {
  sprite: Sprite;
  /** Where around the fire the tongue climbs (as for the seats), and how far from the centre it starts. */
  angle: number;
  radius: number;
  x: number;
  y: number;
  /** Rise speed, px/s. */
  speed: number;
  life: number;
  max: number;
  width: number;
  height: number;
  phase: number;
}
interface Ember {
  particle: Particle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  radius: number;
  phase: number;
}
interface Smoke {
  particle: Particle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  radius: number;
}

/** What the characters need to know about the fire to be lit by it. */
export interface FireLight {
  /** Overall fire strength; grows with the number of people around it. */
  intensity: number;
  /** Fast random-looking 0..1 flicker. */
  flick: number;
  /** Brightness the fire casts, intensity modulated by flicker. */
  light: number;
}

export interface Fire {
  /** Warm light on the ground. Goes under the characters. */
  groundLight: Sprite;
  /** Stones, logs and flames. The far characters sit behind this, the near ones in front of it. */
  body: Container;
  /** Big additive halo. Goes over the near characters' feet but under the foreground. */
  glow: Sprite;
  state: FireLight;
  update(dt: number, time: number, reduced: boolean): void;
}

function buildStones(
  layout: SceneLayout,
  rand: Random,
): { far: Graphics; near: Graphics; farLit: Graphics; nearLit: Graphics } {
  const { cx, cy, u } = layout;
  const far = new Graphics();
  const near = new Graphics();
  const farLit = new Graphics();
  const nearLit = new Graphics();
  const count = 11;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + between(rand, -0.1, 0.1);
    const x = cx + Math.cos(a) * 48 * u;
    const y = cy + Math.sin(a) * 15 * u;
    const rx = between(rand, 8, 11) * u;
    const ry = between(rand, 5, 7) * u;
    const isNear = Math.sin(a) > 0;
    (isNear ? near : far).ellipse(x, y, rx, ry).fill(0x2b2833);
    (isNear ? nearLit : farLit).ellipse(x, y - ry * 0.35, rx * 0.78, ry * 0.5).fill(0xff9650);
  }
  return { far, near, farLit, nearLit };
}

export function createFire(
  layout: SceneLayout,
  textures: TextureBag,
  initialIntensity: number,
): Fire {
  const { cx, cy, rx, u } = layout;
  const rand = createRandom(7);
  const disc = textures.radial(SOFT_DISC, DISC_SIZE);
  const tongueTexture = textures.flameTongue();

  const groundLight = new Sprite(textures.radial(GROUND_LIGHT, DISC_SIZE));
  groundLight.anchor.set(0.5);
  groundLight.position.set(cx, cy);
  groundLight.tint = 0xff873a;
  groundLight.blendMode = "add";

  const glow = new Sprite(textures.radial(GLOW, DISC_SIZE));
  glow.anchor.set(0.5);
  glow.position.set(cx, cy - 60 * u);
  glow.tint = 0xff8c41;
  glow.blendMode = "add";

  const stones = buildStones(layout, rand);
  const teepee = createTeepee(layout, rand);

  // A small pale-yellow flare right at the base: the only near-white in the fire.
  const baseFlare = new Sprite(disc);
  baseFlare.anchor.set(0.5);
  baseFlare.position.set(cx, cy - 3 * u);
  baseFlare.tint = 0xffe2a0;
  baseFlare.blendMode = "add";

  // A handful of sprites: these are tall and rotate and scale individually, which a ParticleContainer
  // did not handle reliably here.
  const tongueLayer = new Container();
  tongueLayer.blendMode = "add";
  const emberLayer = new ParticleContainer({
    texture: disc,
    dynamicProperties: { vertex: true, position: true, color: true },
  });
  emberLayer.blendMode = "add";
  const smokeLayer = new ParticleContainer({
    texture: disc,
    dynamicProperties: { vertex: true, position: true, color: true },
  });

  stones.farLit.alpha = 0.42;
  stones.nearLit.alpha = 0.2;
  // Back to front: the far stones, the ember bed, the logs on the far side, smoke, the flames, the logs on
  // the near side, the rising embers, the near stones. Flames between the two sets of logs is what gives the
  // fire depth: they show through the gaps and lick up past the logs behind them.
  const body = new Container();
  body.addChild(
    stones.far,
    stones.farLit,
    teepee.bed,
    teepee.back,
    smokeLayer,
    baseFlare,
    tongueLayer,
    teepee.front,
    emberLayer,
    stones.near,
    stones.nearLit,
  );

  const state: FireLight = { intensity: initialIntensity, flick: 0.5, light: 1 };
  const tongues: Tongue[] = [];
  const embers: Ember[] = [];
  const smoke: Smoke[] = [];
  let tongueBudget = 0;
  let emberBudget = 0;
  let smokeBudget = 0;

  const spawnTongue = () => {
    const strength = Math.sqrt(state.intensity);
    const sprite = new Sprite(tongueTexture);
    sprite.anchor.set(0.5, 0.97);
    // Most tongues climb through one of the gaps between two logs, so the fire shows through the logs
    // instead of rising as one column. A few stay near the middle, under where the logs cross.
    const gaps = teepee.gapAngles;
    const inGap = gaps.length > 0 && rand() < 0.75;
    const angle = inGap
      ? pick(rand, gaps) + between(rand, -0.14, 0.14)
      : rand() * TAU;
    const radius = inGap ? teepee.baseRadius * between(rand, 0.62, 0.8) : between(rand, 0, 7) * u;
    const tongue: Tongue = {
      sprite,
      angle,
      radius,
      x: cx,
      y: cy,
      speed: between(rand, 26, 56) * u,
      life: 0,
      max: between(rand, 0.55, 1.05),
      width: between(rand, 22, 38) * u * strength,
      // The few that stay in the middle are taller, so a little flame licks up past the crossing.
      height: between(rand, 95, 160) * u * strength * (inGap ? 1 : 1.2),
      phase: rand() * TAU,
    };
    tongues.push(tongue);
    tongueLayer.addChild(sprite);
  };

  const spawnEmber = () => {
    const particle = new Particle({ texture: disc, anchorX: 0.5, anchorY: 0.5 });
    const ember: Ember = {
      particle,
      x: cx + between(rand, -22, 22) * u,
      y: cy - between(rand, 8, teepee.height * 0.8),
      vx: between(rand, -20, 20) * u,
      vy: -between(rand, 60, 150) * u,
      life: 0,
      max: between(rand, 1.6, 3.6),
      radius: between(rand, 0.8, 1.9),
      phase: rand() * TAU,
    };
    embers.push(ember);
    emberLayer.addParticle(particle);
  };

  const spawnSmoke = () => {
    const particle = new Particle({ texture: disc, anchorX: 0.5, anchorY: 0.5 });
    particle.tint = 0x968ca5;
    const puff: Smoke = {
      particle,
      x: cx + between(rand, -10, 10) * u,
      y: cy - (teepee.height + 24 * u) * Math.sqrt(state.intensity),
      vx: between(rand, -8, 8) * u,
      vy: -between(rand, 20, 35) * u,
      life: 0,
      max: between(rand, 4, 6),
      radius: between(rand, 8, 14) * u,
    };
    smoke.push(puff);
    smokeLayer.addParticle(particle);
  };

  const setDisc = (particle: Particle, diameter: number) => {
    particle.scaleX = particle.scaleY = diameter / DISC_SIZE;
  };

  const update = (dt: number, time: number, reduced: boolean) => {
    const swing = reduced ? 0.35 : 1;
    state.flick =
      0.5 +
      swing *
        (0.22 * Math.sin(time * 7.1) +
          0.16 * Math.sin(time * 12.7 + 1.3) +
          0.12 * Math.sin(time * 2.3 + 0.5));
    state.light = clamp(state.intensity * (0.82 + 0.3 * state.flick), 0.4, 1.7);

    tongueBudget += (reduced ? 24 : 48) * state.intensity * dt;
    while (tongueBudget > 1) {
      tongueBudget--;
      spawnTongue();
    }
    emberBudget += (reduced ? 4 : 10) * state.intensity * dt;
    while (emberBudget > 1) {
      emberBudget--;
      spawnEmber();
    }
    smokeBudget += 3 * dt;
    while (smokeBudget > 1) {
      smokeBudget--;
      spawnSmoke();
    }

    for (let i = tongues.length - 1; i >= 0; i--) {
      const t = tongues[i];
      if (!t) continue;
      t.life += dt;
      if (t.life >= t.max) {
        tongueLayer.removeChild(t.sprite);
        t.sprite.destroy();
        tongues.splice(i, 1);
        continue;
      }
      const p = t.life / t.max;
      // Climbs along the surface of the cone: the further up, the closer to the middle, like the logs themselves.
      const rise = t.speed * t.life;
      const reach = t.radius * clamp(1 - rise / teepee.crossing, 0, 1);
      const sway = Math.sin(time * 6 + t.phase) * 3 * u * swing;
      t.x = cx + Math.cos(t.angle) * reach + sway;
      t.y = cy + 2 * u + Math.sin(t.angle) * reach * 0.32 - rise;
      const grow = Math.sin(Math.min(1, p * 1.15) * Math.PI * 0.5);
      const fade = 1 - p * p;
      t.sprite.position.set(t.x, t.y);
      t.sprite.scale.set(
        ((t.width * (1 - p * 0.45)) / TONGUE_WIDTH) * (0.6 + 0.4 * grow),
        ((t.height * grow * (0.55 + 0.45 * fade)) / TONGUE_HEIGHT) * (0.9 + 0.2 * state.flick),
      );
      const lean = clamp((cx - t.x) / Math.max(1, t.height * 0.9), -0.45, 0.45);
      t.sprite.rotation = lean + Math.sin(time * 5 + t.phase) * 0.1 * swing;
      t.sprite.tint =
        TONGUE_COLORS[Math.min(TONGUE_COLORS.length - 1, (p * TONGUE_COLORS.length) | 0)] ??
        0xff6420;
      t.sprite.alpha = clamp(0.8 * fade * (p < 0.08 ? p / 0.08 : 1), 0, 1);
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      if (!e) continue;
      e.life += dt;
      if (e.life >= e.max || e.y < -10) {
        emberLayer.removeParticle(e.particle);
        embers.splice(i, 1);
        continue;
      }
      e.vx += Math.sin(time * 3 + e.phase) * 20 * u * dt;
      e.vx *= 0.99;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy *= 0.996;
      const p = e.life / e.max;
      e.particle.x = e.x;
      e.particle.y = e.y;
      setDisc(e.particle, e.radius * 5);
      e.particle.tint = (255 << 16) | (((195 - p * 80) | 0) << 8) | ((95 - p * 40) | 0);
      e.particle.alpha = clamp(
        (1 - p) * (reduced ? 0.8 : 0.6 + 0.4 * Math.sin(time * 20 + e.phase)),
        0,
        1,
      );
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i];
      if (!s) continue;
      s.life += dt;
      if (s.life >= s.max) {
        smokeLayer.removeParticle(s.particle);
        smoke.splice(i, 1);
        continue;
      }
      s.x += (s.vx + Math.sin(time * 0.7 + i) * 6 * u) * dt;
      s.y += s.vy * dt;
      s.radius += 6 * u * dt;
      const p = s.life / s.max;
      s.particle.x = s.x;
      s.particle.y = s.y;
      setDisc(s.particle, s.radius * 2);
      s.particle.alpha = 0.09 * Math.sin(p * Math.PI);
    }

    teepee.update(time, state.flick, swing);

    baseFlare.width = 30 * u * Math.sqrt(state.intensity) * (0.92 + 0.12 * state.flick);
    baseFlare.height = baseFlare.width * 0.55;
    baseFlare.alpha = 0.26 * clamp(state.light, 0.5, 1.3);

    const glowRadius = 480 * u * (0.75 + 0.25 * state.intensity) * (0.94 + 0.1 * state.flick);
    glow.width = glow.height = glowRadius * 2;
    glow.alpha = 0.17 * state.light;

    const groundRadius = rx * 1.55 * (0.85 + 0.15 * state.intensity);
    groundLight.width = groundRadius * 2;
    groundLight.height = groundRadius * 2 * 0.34;
    groundLight.alpha = 0.3 * state.light;

    stones.farLit.alpha = 0.42 * state.light;
    stones.nearLit.alpha = 0.2 * state.light;
  };

  return {
    groundLight,
    body,
    glow,
    state,
    update,
  };
}
