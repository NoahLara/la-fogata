import { Container, Sprite, type Renderer, type Texture } from "pixi.js";
import { SPECIES_SCALE, type Species, type SpriteArt } from "./characters";
import type { FireLight } from "./fire";
import { directionToFire, type Point, type SceneLayout } from "./layout";
import { evaluateCurve, VIEW_LIGHTING, type ViewLighting } from "./lighting";
import { LOG } from "./logShape";
import { between, clamp, lerp, smoothstep } from "./math";
import { createRandom } from "./random";
import { arrivalFrame, walkEase, type ArrivalFrame, type ArrivalTimeline } from "./seatState";
import type { SeatSpec } from "./seatTable";
import { OVERLAY_COLORS, type TextureBag } from "./textures";
import { pointAt, scaleRatioAt, type ArrivalPlan } from "./walk";
import { bobAt, exposureAt, fadeInAt, turnWidth, walkerTint } from "./walkerLook";
import type { SeatPosition } from "./layout";

/** What every member is built from, fixed for one scene build. */
export interface BuildContext {
  renderer: Renderer;
  layout: SceneLayout;
  textures: TextureBag;
  sprites: SpriteArt;
  pixelsPerUnit: number;
  /** Light overlays for walkers, baked once per animal and shared by everyone who walks in as it. */
  walkerLight: Map<Species, WalkerLight>;
}

export interface Placed {
  spec: SeatSpec;
  index: number;
  seat: SeatPosition;
}

const NIGHT = { r: 8, g: 9, b: 24 };

/** Multiplies a sprite toward the night color by `amount` (0..1). */
export function nightTint(amount: number): number {
  const channel = (c: number) => Math.round(255 * (1 - amount + (amount * c) / 255));
  return (channel(NIGHT.r) << 16) | (channel(NIGHT.g) << 8) | channel(NIGHT.b);
}

interface Art {
  texture: Texture;
  width: number;
  height: number;
  originX: number;
  originY: number;
}

/** The three overlays a fire puts on a character, as textures that can be shared. */
interface LightTextures {
  lit: Texture;
  shade: Texture;
  rim: Texture;
}

interface LightSprites {
  lit: Sprite;
  shade: Sprite;
  rim: Sprite;
}

/**
 * The fire does all the work: a warm light that fades smoothly across the whole body from the side facing it
 * (laid over the colours rather than added to them, so dark markings warm up too and nothing glows like a hole),
 * deep shadow on the far side, and a thin warm rim hugging the edges that face it. All of it points along the
 * line from the character to the fire, given in the art's own space.
 */
function bakeLight(
  { renderer, textures, pixelsPerUnit }: BuildContext,
  art: Art,
  towardFire: Point,
  lighting: ViewLighting,
): LightTextures {
  const centerX = art.originX;
  const centerY = art.originY - 55;
  // Clipped the way a Pixi mask of the art would: by its red channel, so dark markings take less light.
  const clip = textures.redMask(renderer, art.texture);
  return {
    lit: textures.gradientOverlay(
      art.width,
      art.height,
      pixelsPerUnit,
      {
        x0: centerX + towardFire.x * 62,
        y0: centerY + towardFire.y * 62,
        x1: centerX - towardFire.x * 56,
        y1: centerY - towardFire.y * 56,
      },
      OVERLAY_COLORS.light,
      clip,
    ),
    shade: textures.gradientOverlay(
      art.width,
      art.height,
      pixelsPerUnit,
      {
        x0: centerX - towardFire.x * 44,
        y0: centerY - towardFire.y * 44,
        x1: centerX + towardFire.x * 4,
        y1: centerY + towardFire.y * 4,
      },
      OVERLAY_COLORS.shade,
      clip,
    ),
    rim: textures.edgeRim(
      renderer,
      art.texture,
      art.width,
      towardFire,
      lighting.rimFade,
      lighting.rimLean,
    ),
  };
}

function lightSprites(art: Art, light: LightTextures): LightSprites {
  const sprite = (texture: Texture) => {
    const result = new Sprite(texture);
    result.anchor.set(art.originX / art.width, art.originY / art.height);
    result.setSize(art.width, art.height);
    return result;
  };
  return { lit: sprite(light.lit), shade: sprite(light.shade), rim: sprite(light.rim) };
}

function bodySprite(art: Art): Sprite {
  const body = new Sprite(art.texture);
  body.anchor.set(art.originX / art.width, art.originY / art.height);
  body.setSize(art.width, art.height);
  return body;
}

/** A character seated, in its seat's view. */
function buildSeatRig(context: BuildContext, { spec, index, seat }: Placed, species: Species) {
  const { layout, sprites } = context;
  const { cx, cy, rx, u, characterHeight } = layout;
  const lighting = VIEW_LIGHTING[spec.view];
  const scale = seat.scale * SPECIES_SCALE[species];
  const k = (characterHeight / 100) * scale;
  const art = sprites.art(species, spec.view);
  // The side art faces left. Seats on the left of the fire face right, so they use it mirrored.
  const flip: 1 | -1 = art.directional && seat.x < cx ? -1 : 1;
  // On a log the character sits into it, so it is raised by less than the log's height.
  const raise = spec.log ? LOG.seatHeight * k : 0;

  const toFire = directionToFire(
    { x: seat.x, y: seat.y - raise - 55 * k },
    { x: cx, y: cy - 45 * u },
  );
  // Direction to the fire in the art's own space: mirrored art sees the fire on its other side.
  const towardFire = { x: flip * toFire.x, y: toFire.y };
  const distance = Math.min(1.6, toFire.length / Math.max(rx, 1));

  const body = bodySprite(art);
  const layers = lightSprites(art, bakeLight(context, art, towardFire, lighting));

  const container = new Container();
  // Each character leans a little toward the fire (the head more than the hips) and is built slightly
  // differently, so they don't look like clones. Deterministic per seat.
  const rnd = createRandom(index * 977 + 13);
  const dx = cx - seat.x;
  const leanDirection = Math.abs(dx) > 8 ? Math.sign(dx) : rnd() < 0.5 ? -1 : 1;
  const variation = {
    skewX: -leanDirection * between(rnd, 0.03, 0.09) * (0.5 + 0.5 * Math.abs(towardFire.x)),
    rotation: between(rnd, -0.025, 0.025),
    width: between(rnd, 0.95, 1.06),
    height: between(rnd, 0.96, 1.05),
  };
  container.skew.set(variation.skewX, 0);
  container.rotation = variation.rotation;
  container.addChild(body, layers.lit, layers.shade, layers.rim);

  return { container, body, ...layers, lighting, flip, scale, k, raise, distance, variation };
}

/** What a walker needs beyond the art: its light from the front and from behind, relative to where it faces. */
export interface WalkerLight {
  front: LightTextures;
  back: LightTextures;
}

/**
 * A character walking, in side view. It can be lit from the side it faces or from behind, so the light bakes
 * both and the fire's direction picks how much of each shows. Light is baked in the art's own space, where
 * the art faces left, so "front" is toward the left of the art.
 */
function buildWalkerRig(context: BuildContext, species: Species) {
  const art = context.sprites.art(species, "side");
  let light = context.walkerLight.get(species);
  if (!light) {
    light = {
      front: bakeLight(context, art, { x: -1, y: 0 }, VIEW_LIGHTING.side),
      back: bakeLight(context, art, { x: 1, y: 0 }, VIEW_LIGHTING.side),
    };
    context.walkerLight.set(species, light);
  }
  const body = bodySprite(art);
  const front = lightSprites(art, light.front);
  const back = lightSprites(art, light.back);
  const container = new Container();
  container.addChild(body, front.lit, front.shade, front.rim, back.lit, back.shade, back.rim);
  return { container, body, front, back, directional: art.directional };
}

/** The sprites a member casts onto the ground; where and how big they are is set every frame. */
function buildShadows(context: BuildContext) {
  // A long, soft cast shadow: it fades out gradually instead of ending at an edge.
  const shadow = new Sprite(
    context.textures.radial([
      [0, 0.9],
      [0.5, 0.45],
      [1, 0],
    ]),
  );
  shadow.anchor.set(0.5);
  shadow.tint = 0x020208;

  const contact = new Sprite(
    context.textures.radial([
      [0, 1],
      [0.6, 0.45],
      [1, 0],
    ]),
  );
  contact.anchor.set(0.5);
  contact.tint = 0x020208;
  return { shadow, contact };
}

export interface MemberLayers {
  far: Container;
  near: Container;
  shadows: Container;
  contactShadows: Container;
}

export interface Arrival {
  timeline: ArrivalTimeline;
  plan: ArrivalPlan;
}

export interface Member {
  readonly id: string;
  update(time: number, dt: number, reduced: boolean): void;
  destroy(): void;
}

/** Where a member is and what it looks like this frame. */
interface Pose {
  x: number;
  /** Where the feet touch the ground. */
  ground: number;
  /** How far above the ground the character is: raised onto a log, or mid-hop. */
  lift: number;
  /** Whether the walker (side view) or the seated character (seat's view) is the one showing. */
  walking: boolean;
  /** How wide the character is drawn, 0..1: it narrows to nothing while turning. */
  squash: number;
  /** How tall it is drawn, around 1: it squashes a little as it sits down. */
  sit: number;
  /** How much of the fire's light has reached it, and how visible it is at all, 0..1. */
  exposure: number;
  fade: number;
  /** Distance walked so far. */
  travelled: number;
  onLog: boolean;
}

/**
 * Someone around the fire. With an arrival it walks in first (see `Arrival`); without one it is just seated.
 * The log under a log seat belongs to the seat, not to the member.
 */
export function createMember(
  context: BuildContext,
  placed: Placed,
  id: string,
  species: Species,
  fire: FireLight,
  layers: MemberLayers,
  arrival: Arrival | undefined,
  onSeated: () => void,
): Member {
  const { layout } = context;
  const { cx, cy, u, characterHeight } = layout;
  const { seat } = placed;
  const rig = buildSeatRig(context, placed, species);
  let walker = arrival ? buildWalkerRig(context, species) : undefined;
  const cast = buildShadows(context);
  const seed = placed.index * 17.3;
  let elapsed = 0;
  /** Which way the walker heads on screen, kept while it is standing still. */
  let heading: 1 | -1 = seat.x < cx ? 1 : -1;
  let arrived = !arrival;

  layers.shadows.addChild(cast.shadow);
  layers.contactShadows.addChild(cast.contact);
  const layerFor = (ground: number) => (ground < cy ? layers.far : layers.near);
  const show = (container: Container, ground: number) => {
    const layer = layerFor(ground);
    if (container.parent !== layer) layer.addChild(container);
    container.zIndex = ground;
  };

  const poseAt = (frame: ArrivalFrame | undefined): Pose => {
    if (!arrival || !frame || frame.phase === "seated") {
      return {
        x: seat.x,
        ground: seat.y,
        lift: rig.raise,
        walking: false,
        squash: 1,
        sit: 1,
        exposure: 1,
        fade: 1,
        travelled: 0,
        onLog: placed.spec.log === true,
      };
    }
    const { path, approach } = arrival.plan;
    if (frame.phase === "walking") {
      const progress = walkEase(frame.progress);
      const travelled = progress * path.length;
      const at = pointAt(path, travelled);
      if (Math.abs(at.dx) > 0.15) heading = at.dx > 0 ? 1 : -1;
      return {
        x: at.x,
        ground: at.y,
        lift: 0,
        walking: true,
        squash: 1,
        sit: 1,
        exposure: exposureAt(progress),
        fade: fadeInAt(progress),
        travelled,
        onLog: false,
      };
    }
    const base = { x: approach.x, exposure: 1, fade: 1, travelled: path.length };
    if (frame.phase === "turning") {
      return {
        ...base,
        ground: approach.y,
        lift: 0,
        // Edge on halfway through: the walker narrows to nothing and the seated view widens back.
        walking: frame.progress < 0.5,
        squash: turnWidth(frame.progress),
        sit: 1,
        onLog: false,
      };
    }
    if (frame.phase === "settling") {
      // Already facing the way the seat does: just stop, and sink a little as it sits.
      return {
        ...base,
        ground: approach.y,
        lift: 0,
        walking: false,
        squash: 1,
        sit: 1 - 0.07 * Math.sin(Math.PI * frame.progress),
        onLog: false,
      };
    }
    // Hopping onto the log: up and over in a small arc, landing on its top.
    const t = smoothstep(0, 1, frame.progress);
    return {
      ...base,
      x: lerp(approach.x, seat.x, t),
      ground: lerp(approach.y, seat.y, t),
      lift: rig.raise * t + Math.sin(Math.PI * frame.progress) * 0.16 * characterHeight * rig.scale,
      walking: false,
      squash: 1,
      sit: 1,
      onLog: true,
    };
  };

  const applySeatRig = (pose: Pose, depth: number, time: number, reduced: boolean) => {
    const intensity = fire.intensity;
    const light = clamp(fire.light, 0.4, 1.4);
    const falloff = 1 - rig.distance * 0.2;
    rig.body.tint = nightTint(evaluateCurve(rig.lighting.bodyTint, rig.distance, intensity));
    rig.lit.alpha = rig.lighting.litAlpha * light * falloff;
    rig.shade.alpha = rig.lighting.shadeAlpha;
    rig.rim.alpha = clamp(rig.lighting.rimAlpha * light * falloff, 0, 1);

    const breath = reduced ? 0 : Math.sin(time * 1.8 + seed) * 0.018;
    const k = rig.k * depth;
    rig.container.position.set(pose.x, pose.ground - pose.lift);
    // Sinking makes it a little wider as well as lower.
    rig.container.scale.set(
      rig.flip *
        k *
        rig.variation.width *
        (1 + breath * 0.4) *
        pose.squash *
        (1 + (1 - pose.sit) * 0.5),
      k * rig.variation.height * (1 + breath) * pose.sit,
    );
  };

  const applyWalker = (
    w: NonNullable<typeof walker>,
    pose: Pose,
    depth: number,
    reduced: boolean,
  ) => {
    const intensity = fire.intensity;
    const k = rig.k * depth;
    const heightPx = k * 100;
    const bob = bobAt(pose.travelled / heightPx, reduced || !pose.walking || pose.squash < 1);
    const toFire = directionToFire(
      { x: pose.x, y: pose.ground - 55 * k },
      { x: cx, y: cy - 45 * u },
    );
    const distance = Math.min(1.6, toFire.length / Math.max(layout.rx, 1));

    const flip = w.directional && heading > 0 ? -1 : 1;
    w.container.position.set(pose.x, pose.ground - bob.lift * heightPx);
    w.container.rotation = bob.sway;
    w.container.scale.set(flip * k * rig.variation.width * pose.squash, k * rig.variation.height);
    w.container.alpha = pose.fade;

    // Far from the fire it is a silhouette; its light arrives with it.
    const lighting = VIEW_LIGHTING.side;
    w.body.tint = nightTint(
      walkerTint(pose.exposure, evaluateCurve(lighting.bodyTint, distance, intensity)),
    );
    const light = clamp(fire.light, 0.4, 1.4) * (1 - distance * 0.2) * pose.exposure;
    // Which way the art faces on screen: the unmirrored art faces left.
    const facing = w.directional ? (heading > 0 ? 1 : -1) : -1;
    const front = smoothstep(-0.6, 0.6, toFire.x * facing);
    const set = (side: typeof w.front, weight: number) => {
      side.lit.alpha = lighting.litAlpha * light * weight;
      side.shade.alpha = lighting.shadeAlpha * weight;
      side.rim.alpha = clamp(lighting.rimAlpha * light * weight, 0, 1);
    };
    set(w.front, front);
    set(w.back, 1 - front);
  };

  const applyCast = (pose: Pose, depth: number) => {
    const k = rig.k * depth;
    const scale = rig.scale * depth;
    const light = clamp(fire.light, 0.4, 1.4);
    const visible = pose.fade * (0.35 + 0.65 * pose.exposure);

    let dx = pose.x - cx;
    let dy = (pose.ground - cy) / 0.32;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    // Long, pointing away from the fire, and it stretches and shrinks with the flames.
    const len = (100 + 42 * fire.flick) * u * scale * clamp(fire.intensity, 0.6, 1.5);
    cast.shadow.position.set(pose.x + dx * len * 0.5, pose.ground + dy * len * 0.5 * 0.32);
    cast.shadow.rotation = Math.atan2(dy * 0.32, dx);
    cast.shadow.width = len * 1.15;
    cast.shadow.height = 24 * u * scale;
    cast.shadow.alpha = clamp(0.28 + 0.22 * light, 0.2, 0.55) * visible;

    cast.contact.position.set(pose.x, pose.ground - k);
    cast.contact.setSize(76 * k, 20 * k);
    // On a log the log casts the shadow.
    cast.contact.alpha = pose.onLog ? 0 : 0.6 * visible;
  };

  const update = (time: number, dt: number, reduced: boolean) => {
    elapsed += dt;
    const frame = arrival ? arrivalFrame(arrival.timeline, elapsed) : undefined;
    const pose = poseAt(frame);
    const depth = arrival ? scaleRatioAt(layout, pose.ground, seat.y) : 1;

    rig.container.visible = !pose.walking;
    show(rig.container, pose.ground);
    if (walker) {
      walker.container.visible = pose.walking;
      show(walker.container, pose.ground);
      applyWalker(walker, pose, depth, reduced);
    }
    applySeatRig(pose, depth, time, reduced);
    applyCast(pose, depth);

    if (!arrived && frame?.phase === "seated") {
      arrived = true;
      walker?.container.destroy({ children: true });
      walker = undefined;
      onSeated();
    }
  };

  update(0, 0, true);

  return {
    id,
    update,
    destroy() {
      rig.container.destroy({ children: true });
      walker?.container.destroy({ children: true });
      cast.shadow.destroy();
      cast.contact.destroy();
    },
  };
}
