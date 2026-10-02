import { Container, Sprite, type Mesh, type Renderer, type Texture } from "pixi.js";
import { SPECIES_SCALE, type Species, type SpriteArt } from "./characters";
import type { FireLight } from "./fire";
import { directionToFire, type Point, type SceneLayout } from "./layout";
import { evaluateCurve, VIEW_LIGHTING, type ViewLighting } from "./lighting";
import { LOG } from "./logShape";
import { between, clamp, lerp, smoothstep } from "./math";
import { createRandom } from "./random";
import {
  arrivalFrame,
  FADE_SECONDS,
  leaveFrame,
  walkEase,
  type ArrivalFrame,
  type ArrivalTimeline,
  type LeaveFrame,
  type LeaveTimeline,
} from "./seatState";
import type { SeatSpec } from "./seatTable";
import { createIdle, type GestureDirector } from "./idle";
import { partsFor } from "./parts";
import { createSoftMesh, type SoftMesh } from "./softMesh";
import { OVERLAY_COLORS, type TextureBag } from "./textures";
import { pointAt, scaleRatioAt, type ArrivalPlan, type DeparturePlan } from "./walk";
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
  /** Spaces out the small gestures of seated characters so they are never in step. */
  director: GestureDirector;
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

/** A layer of a character: a plain sprite, or a mesh when the character has parts that move. */
type Layer = Sprite | Mesh;

interface LightSprites {
  lit: Layer;
  shade: Layer;
  rim: Layer;
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

function lightSprites(art: Art, light: LightTextures, soft?: SoftMesh): LightSprites {
  const sprite = (texture: Texture): Layer => {
    // A mesh already sits where the art does, with the feet at its origin.
    if (soft) return soft.layer(texture);
    const result = new Sprite(texture);
    result.anchor.set(art.originX / art.width, art.originY / art.height);
    result.setSize(art.width, art.height);
    return result;
  };
  return { lit: sprite(light.lit), shade: sprite(light.shade), rim: sprite(light.rim) };
}

function bodySprite(art: Art, soft?: SoftMesh): Layer {
  if (soft) return soft.layer(art.texture);
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

  // Characters with parts that move are drawn as meshes that share one shape, so the lighting moves with the parts.
  const parts = partsFor(species, spec.view);
  const soft = parts.length ? createSoftMesh(art, parts) : undefined;
  const body = bodySprite(art, soft);
  const layers = lightSprites(art, bakeLight(context, art, towardFire, lighting), soft);

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

  return { container, body, ...layers, soft, lighting, flip, scale, k, raise, distance, variation };
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

/** How someone first shows up: walking in, or with reduced motion fading in where they sit. */
export type Entrance = ({ kind: "walk" } & Arrival) | { kind: "fade" };

/** How someone goes: the arrival run backwards, or with reduced motion fading out where they sit. */
export type Exit =
  { kind: "walk"; timeline: LeaveTimeline; plan: DeparturePlan } | { kind: "fade" };

export interface Member {
  readonly id: string;
  update(time: number, dt: number, reduced: boolean): void;
  /**
   * Starts leaving. `onGone` is called, once, as the last thing an update does when they have gone; the owner
   * should then drop and destroy the member. Returns false if they have not finished arriving.
   */
  leave(exit: Exit, onGone: () => void): boolean;
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
/** A number from a name, so every character gets its own rhythm. */
function idSeed(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function createMember(
  context: BuildContext,
  placed: Placed,
  id: string,
  species: Species,
  fire: FireLight,
  layers: MemberLayers,
  entrance: Entrance | undefined,
  onSeated: () => void,
): Member {
  const { layout } = context;
  const { cx, cy, u, characterHeight } = layout;
  const { seat } = placed;
  const arrival = entrance?.kind === "walk" ? entrance : undefined;
  const rig = buildSeatRig(context, placed, species);
  let walker = arrival ? buildWalkerRig(context, species) : undefined;
  const cast = buildShadows(context);
  const idle = createIdle({
    species,
    view: placed.spec.view,
    seed: idSeed(id) + placed.index,
    director: context.director,
  });
  let elapsed = 0;
  /** Which way the walker heads on screen, kept while it is standing still. */
  let heading: 1 | -1 = seat.x < cx ? 1 : -1;
  let arrived = !arrival;
  /** Whether `onSeated` has been called: someone who fades in counts as seated once they are fully there. */
  let announced = !entrance;
  let leaving: { exit: Exit; elapsed: number; onGone: () => void } | undefined;

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
        fade: entrance?.kind === "fade" ? smoothstep(0, FADE_SECONDS, elapsed) : 1,
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

  /** The arrival run backwards: stand up, hop down off the log, turn, walk away into the dark. */
  const leavePoseAt = (frame: LeaveFrame, { plan }: { plan: DeparturePlan }): Pose => {
    const { path, approach } = plan;
    const atSeat = {
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
    const onGround = {
      x: approach.x,
      ground: approach.y,
      lift: 0,
      exposure: 1,
      fade: 1,
      travelled: 0,
    };
    switch (frame.phase) {
      case "standing":
        // Stretches up a little as it gets up.
        return { ...atSeat, sit: 1 + 0.06 * Math.sin(Math.PI * frame.progress) };
      case "hopping": {
        const t = 1 - smoothstep(0, 1, frame.progress);
        return {
          ...atSeat,
          x: lerp(approach.x, seat.x, t),
          ground: lerp(approach.y, seat.y, t),
          lift:
            rig.raise * t + Math.sin(Math.PI * frame.progress) * 0.16 * characterHeight * rig.scale,
        };
      }
      case "turning":
        return {
          ...onGround,
          walking: frame.progress >= 0.5,
          squash: turnWidth(frame.progress),
          sit: 1,
          onLog: false,
        };
      default: {
        const done = frame.phase === "gone";
        const progress = walkEase(done ? 1 : frame.progress);
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
          // The reverse of coming in: the light leaves it and it disappears into the dark.
          exposure: exposureAt(1 - progress),
          fade: fadeInAt(1 - progress),
          travelled,
          onLog: false,
        };
      }
    }
  };

  const applySeatRig = (pose: Pose, depth: number, breath: number) => {
    const intensity = fire.intensity;
    const light = clamp(fire.light, 0.4, 1.4);
    const falloff = 1 - rig.distance * 0.2;
    rig.body.tint = nightTint(evaluateCurve(rig.lighting.bodyTint, rig.distance, intensity));
    rig.lit.alpha = rig.lighting.litAlpha * light * falloff;
    rig.shade.alpha = rig.lighting.shadeAlpha;
    rig.rim.alpha = clamp(rig.lighting.rimAlpha * light * falloff, 0, 1);

    const k = rig.k * depth;
    rig.container.alpha = pose.fade;
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

  let gone = false;

  const update = (time: number, dt: number, reduced: boolean) => {
    if (gone) return;
    elapsed += dt;
    let pose: Pose;
    let frame: ArrivalFrame | undefined;
    let leaveDone = false;
    if (leaving) {
      leaving.elapsed += dt;
      const { exit } = leaving;
      if (exit.kind === "walk") {
        const leaveProgress = leaveFrame(exit.timeline, leaving.elapsed);
        pose = leavePoseAt(leaveProgress, exit);
        leaveDone = leaveProgress.phase === "gone";
      } else {
        // Fades out where it sits.
        pose = { ...poseAt(undefined), fade: 1 - smoothstep(0, FADE_SECONDS, leaving.elapsed) };
        leaveDone = leaving.elapsed >= FADE_SECONDS;
      }
    } else {
      frame = arrival ? arrivalFrame(arrival.timeline, elapsed) : undefined;
      pose = poseAt(frame);
    }
    const depth = scaleRatioAt(layout, pose.ground, seat.y);

    rig.container.visible = !pose.walking;
    show(rig.container, pose.ground);
    if (walker) {
      walker.container.visible = pose.walking;
      show(walker.container, pose.ground);
      applyWalker(walker, pose, depth, reduced);
    }
    // Only someone who has sat down breathes and moves; not while walking in, turning, hopping or leaving.
    const idlePose = idle.update(time, !leaving && (arrived || frame?.phase === "seated"), reduced);
    rig.soft?.pose(idlePose.angles);
    applySeatRig(pose, depth, idlePose.breath);
    applyCast(pose, depth);

    if (arrival && !arrived && frame?.phase === "seated") {
      arrived = true;
      announced = true;
      walker?.container.destroy({ children: true });
      walker = undefined;
      onSeated();
    }
    if (!announced && entrance?.kind === "fade" && elapsed >= FADE_SECONDS) {
      announced = true;
      onSeated();
    }
    if (leaveDone && leaving) {
      gone = true;
      leaving.onGone();
    }
  };

  update(0, 0, true);

  return {
    id,
    update,
    leave(exit, onGone) {
      if (!announced || leaving) return false;
      if (exit.kind === "walk") {
        // The walker takes over from the seated character at the turn.
        heading = exit.plan.startHeading;
        walker ??= buildWalkerRig(context, species);
      }
      leaving = { exit, elapsed: 0, onGone };
      return true;
    },
    destroy() {
      rig.container.destroy({ children: true });
      rig.soft?.destroy();
      walker?.container.destroy({ children: true });
      cast.shadow.destroy();
      cast.contact.destroy();
    },
  };
}
