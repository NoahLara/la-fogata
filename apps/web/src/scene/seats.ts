import { Container, Sprite, type Renderer } from "pixi.js";
import { SPECIES, SPECIES_SCALE, type Species, type SpriteArt, type View } from "./characters";
import type { FireLight } from "./fire";
import {
  capNearScales,
  directionToFire,
  seatPosition,
  type SceneLayout,
  type SeatPosition,
} from "./layout";
import { evaluateCurve, VIEW_LIGHTING, type ViewLighting } from "./lighting";
import { bakeLogArt, LOG, type LogArt } from "./log";
import { between, clamp, toRadians } from "./math";
import { createRandom } from "./random";
import { OVERLAY_COLORS, type GradientLine, type OverlayColors, type TextureBag } from "./textures";

interface SeatSpec {
  /** Angle on the seat ellipse; 90° is the point closest to the viewer. */
  degrees: number;
  /** How the seat is seen: from behind (near seats), in profile (beside the fire) or head-on (far seats). */
  view: View;
  /** Sits on a log instead of the ground. */
  log?: boolean;
}

/**
 * Seven seats around the fire, in an asymmetric ring so no seat is directly behind the flames:
 * two near seats seen from behind (65°, 115°), two beside the fire seen in profile and turned toward it
 * (165°, 15°), and three far seats facing the viewer (225°, 255°, 300°). Three seats have a log (one near,
 * two far). A seat knows nothing about who sits in it: the seat decides the view, the lighting, the log and
 * the lean, and the species only decides the art, so any animal works in any seat.
 */
export const SEATS: readonly SeatSpec[] = [
  { degrees: 65, view: "back" },
  { degrees: 115, view: "back", log: true },
  { degrees: 165, view: "side" },
  { degrees: 15, view: "side" },
  { degrees: 225, view: "front", log: true },
  { degrees: 255, view: "front" },
  { degrees: 300, view: "front", log: true },
];

/** Who sits where, by seat index. People join in any order, so this is just one possible arrangement. */
export const DEFAULT_ASSIGNMENT: readonly Species[] = [
  "cat",
  "panda",
  "fox",
  "capybara",
  "owl",
  "rabbit",
  "bear",
];

/** Every seat except the ones seen from behind sits closer to the fire sideways: the ring is squeezed by this much there. */
const FAR_RING_SCALE = 0.8;

const NIGHT = { r: 8, g: 9, b: 24 };

/** Multiplies a sprite toward the night color by `amount` (0..1). */
function nightTint(amount: number): number {
  const channel = (c: number) => Math.round(255 * (1 - amount + (amount * c) / 255));
  return (channel(NIGHT.r) << 16) | (channel(NIGHT.g) << 8) | channel(NIGHT.b);
}

export interface Seats {
  /** Soft shadows: cast away from the fire, plus a contact shadow under each character (or its log). */
  shadows: Container;
  /** Characters behind the fire. */
  far: Container;
  /** Characters in front of the fire. */
  near: Container;
  update(time: number, reduced: boolean): void;
  destroy(): void;
}

interface Seated {
  container: Container;
  body: Sprite;
  /** Warm light on the side facing the fire. */
  lit: Sprite;
  /** Deep shadow on the side facing away. */
  shade: Sprite;
  /** Thin warm light along the edges facing the fire. */
  rim: Sprite;
  shadow: Sprite;
  lighting: ViewLighting;
  /** -1 when the art is mirrored for a seat on the left of the fire, otherwise 1. */
  flip: 1 | -1;
  scale: number;
  x: number;
  y: number;
  /** Distance to the fire relative to the seat ellipse, capped at 1.6. */
  distance: number;
  seed: number;
  /** What makes this seat's character not a clone of the others: a lean toward the fire and a slightly different build. */
  variation: { skewX: number; rotation: number; width: number; height: number };
  /** Present when the character sits on a log. */
  log?: { body: Sprite; rim: Sprite };
}

interface Placed {
  spec: SeatSpec;
  index: number;
  seat: SeatPosition;
}

/** What every seat is built from, fixed for one scene build. */
interface BuildContext {
  renderer: Renderer;
  layout: SceneLayout;
  textures: TextureBag;
  sprites: SpriteArt;
  pixelsPerUnit: number;
}

const ringScaleFor = (spec: SeatSpec) => (spec.view === "back" ? 1 : FAR_RING_SCALE);

/** Seat positions, back to front, so nearer characters are drawn over farther ones. */
function placeSeats(layout: SceneLayout): Placed[] {
  const positions = capNearScales(
    SEATS.map((spec) => seatPosition(layout, spec.degrees, ringScaleFor(spec))),
  );
  return SEATS.map((spec, index) => ({ spec, index, seat: positions[index] }))
    .flatMap((entry) => (entry.seat ? [{ ...entry, seat: entry.seat }] : []))
    .sort((a, b) => a.seat.y - b.seat.y);
}

/**
 * The animal that sits in a seat. If the wanted one has no art (a file that failed to load), any animal that
 * does sits there instead. With no art at all the seat stays empty.
 */
function resolveSpecies(sprites: SpriteArt, wanted: Species | undefined): Species | undefined {
  return wanted && sprites.has(wanted)
    ? wanted
    : SPECIES.find((candidate) => sprites.has(candidate));
}

/**
 * Where a log lies and how it looks. The log follows the circle around the fire, so its axis is the tangent
 * of the seat ellipse. It is sheared, not rotated, so it still lies flat: its ends move up or down while
 * everything vertical stays vertical, and it is shortened where it points toward or away from the viewer.
 */
function logPlacement(
  layout: SceneLayout,
  degrees: number,
  ringScale: number,
): { skew: number; stretch: number } {
  const angle = toRadians(degrees);
  const tx = -Math.sin(angle);
  const ty = Math.cos(angle) * (layout.ry / (layout.rx * ringScale));
  let slope = Math.atan2(ty, tx);
  // A log looks the same end to end, so fold the angle into -90°..90°.
  if (slope > Math.PI / 2) slope -= Math.PI;
  if (slope <= -Math.PI / 2) slope += Math.PI;
  // Capped well short of the true angle: at the extreme side seats the full slope hides the log under its sitter.
  const skew = clamp(slope, -0.38, 0.38);
  return { skew, stretch: clamp(Math.hypot(tx, ty) / Math.cos(skew), 0.88, 1) };
}

/** Everything about a seated character except the log and the shadows. */
function buildCharacter(
  { renderer, layout, textures, sprites, pixelsPerUnit }: BuildContext,
  { spec, index, seat }: Placed,
  species: Species,
) {
  const { cx, cy, rx, u, characterHeight } = layout;
  const lighting = VIEW_LIGHTING[spec.view];
  const scale = seat.scale * SPECIES_SCALE[species];
  const k = (characterHeight / 100) * scale;
  const art = sprites.art(species, spec.view);
  // The side art faces left. Seats on the left of the fire face right, so they use it mirrored.
  const flip: 1 | -1 = art.directional && seat.x < cx ? -1 : 1;
  // On a log the character sits into it, so it is raised by less than the log's height.
  const charY = seat.y - (spec.log ? LOG.seatHeight * k : 0);

  const toFire = directionToFire({ x: seat.x, y: charY - 55 * k }, { x: cx, y: cy - 45 * u });
  // Direction to the fire in the art's own space: mirrored art sees the fire on its other side.
  const towardFire = { x: flip * toFire.x, y: toFire.y };
  const distance = Math.min(1.6, toFire.length / Math.max(rx, 1));
  const anchor = { x: art.originX / art.width, y: art.originY / art.height };
  const centerX = art.originX;
  const centerY = art.originY - 55;

  const body = new Sprite(art.texture);
  body.anchor.set(anchor.x, anchor.y);
  body.setSize(art.width, art.height);

  // Clipped the way a Pixi mask of the art would: by its red channel, so dark markings take less light.
  const clip = textures.redMask(renderer, art.texture);
  /** An overlay already clipped to the character. */
  const overlay = (line: GradientLine, colors: OverlayColors) => {
    const sprite = new Sprite(
      textures.gradientOverlay(art.width, art.height, pixelsPerUnit, line, colors, clip),
    );
    sprite.anchor.set(anchor.x, anchor.y);
    sprite.setSize(art.width, art.height);
    return sprite;
  };

  // The fire does all the work: a warm light that fades smoothly across the whole body from the side facing it
  // (laid over the colours rather than added to them, so dark markings warm up too and nothing glows like a hole), deep shadow on the far side, and a
  // thin warm rim hugging the edges that face it. All of it points along the line from the seat to the fire.
  const lit = overlay(
    {
      x0: centerX + towardFire.x * 62,
      y0: centerY + towardFire.y * 62,
      x1: centerX - towardFire.x * 56,
      y1: centerY - towardFire.y * 56,
    },
    OVERLAY_COLORS.light,
  );
  const shade = overlay(
    {
      x0: centerX - towardFire.x * 44,
      y0: centerY - towardFire.y * 44,
      x1: centerX + towardFire.x * 4,
      y1: centerY + towardFire.y * 4,
    },
    OVERLAY_COLORS.shade,
  );

  const rim = new Sprite(
    textures.edgeRim(
      renderer,
      art.texture,
      art.width,
      towardFire,
      lighting.rimFade,
      lighting.rimLean,
    ),
  );
  rim.anchor.set(anchor.x, anchor.y);
  rim.setSize(art.width, art.height);

  const container = new Container();
  container.position.set(seat.x, charY);
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
  container.scale.set(flip * k * variation.width, k * variation.height);
  container.addChild(body, lit, shade, rim);

  return { container, body, lit, shade, rim, lighting, flip, scale, k, distance, variation };
}

/**
 * The log under a seat. It goes in first so the character sits into it. It follows the circle around the fire
 * and is lit like the fire's own logs: an edge light toward the fire that flickers with it.
 */
function buildLog(
  { renderer, layout, textures }: BuildContext,
  logArt: LogArt,
  { spec, seat }: Placed,
  k: number,
) {
  const { cx, cy, u } = layout;
  const anchor = { x: logArt.originX / logArt.width, y: logArt.originY / logArt.height };
  const toFire = directionToFire({ x: seat.x, y: seat.y - 10 * k }, { x: cx, y: cy - 45 * u });
  const { skew, stretch } = logPlacement(layout, spec.degrees, ringScaleFor(spec));

  const body = new Sprite(logArt.texture);
  body.anchor.set(anchor.x, anchor.y);
  body.setSize(logArt.width, logArt.height);
  const rim = new Sprite(textures.edgeRim(renderer, logArt.texture, logArt.width, toFire));
  rim.anchor.set(anchor.x, anchor.y);
  rim.setSize(logArt.width, logArt.height);
  // Where the character presses into the top of the log.
  const topShade = new Sprite(
    textures.radial([
      [0, 1],
      [1, 0],
    ]),
  );
  topShade.anchor.set(0.5);
  topShade.tint = 0x050308;
  topShade.alpha = 0.5;
  topShade.position.set(0, -LOG.thickness + 1);
  topShade.setSize(54, 9);

  const container = new Container();
  container.position.set(seat.x, seat.y);
  container.scale.set(k * stretch, k);
  container.skew.set(0, skew);
  container.addChild(body, rim, topShade);
  return { container, log: { body, rim }, skew, stretch };
}

/** The shadow a seat casts away from the fire, and the contact shadow under its character (or its log). */
function buildShadows(
  textures: TextureBag,
  { spec, seat }: Placed,
  k: number,
  logSkew: number,
  logStretch: number,
) {
  // A long, soft cast shadow: it fades out gradually instead of ending at an edge.
  const shadow = new Sprite(
    textures.radial([
      [0, 0.9],
      [0.5, 0.45],
      [1, 0],
    ]),
  );
  shadow.anchor.set(0.5);
  shadow.tint = 0x020208;

  const contact = new Sprite(
    textures.radial([
      [0, 1],
      [0.6, 0.45],
      [1, 0],
    ]),
  );
  contact.anchor.set(0.5);
  contact.tint = 0x020208;
  contact.alpha = 0.6;
  contact.position.set(seat.x, seat.y - k);
  // Under the log when there is one, following its slope; otherwise under the character.
  if (spec.log) {
    contact.rotation = logSkew;
    contact.setSize((LOG.length + 12) * k * logStretch * Math.cos(logSkew), 22 * k);
  } else {
    contact.setSize(76 * k, 20 * k);
  }
  return { shadow, contact };
}

function createSeatUpdater(
  seated: readonly Seated[],
  fire: FireLight,
  layout: SceneLayout,
): Seats["update"] {
  const { cx, cy, u, characterHeight } = layout;
  return (time, reduced) => {
    const intensity = fire.intensity;
    for (const s of seated) {
      // Near characters are almost black against the fire; far ones are lit by it.
      const light = clamp(fire.light, 0.4, 1.4);
      const falloff = 1 - s.distance * 0.2;
      s.body.tint = nightTint(evaluateCurve(s.lighting.bodyTint, s.distance, intensity));
      s.lit.alpha = s.lighting.litAlpha * light * falloff;
      s.shade.alpha = s.lighting.shadeAlpha;
      s.rim.alpha = clamp(s.lighting.rimAlpha * light * falloff, 0, 1);

      if (s.log) {
        s.log.body.tint = nightTint(evaluateCurve(s.lighting.logTint, s.distance, intensity));
        s.log.rim.alpha = clamp(light * (1 - s.distance * 0.25), 0, 1);
      }

      const breath = reduced ? 0 : Math.sin(time * 1.8 + s.seed) * 0.018;
      const k = (characterHeight / 100) * s.scale;
      s.container.scale.set(
        s.flip * k * s.variation.width * (1 + breath * 0.4),
        k * s.variation.height * (1 + breath),
      );

      let dx = s.x - cx;
      let dy = (s.y - cy) / 0.32;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      // Long, pointing away from the fire, and it stretches and shrinks with the flames. The wobble in
      // angle comes from the same flicker, and stops when motion is reduced.
      const len = (100 + 42 * fire.flick) * u * s.scale * clamp(intensity, 0.6, 1.5);
      const wobble = reduced ? 0 : Math.sin(time * 2.1 + s.seed) * 0.02 * fire.flick;
      s.shadow.position.set(s.x + dx * len * 0.5, s.y + dy * len * 0.5 * 0.32);
      s.shadow.rotation = Math.atan2(dy * 0.32, dx) + wobble;
      s.shadow.width = len * 1.15;
      s.shadow.height = 24 * u * s.scale;
      s.shadow.alpha = clamp(0.28 + 0.22 * light, 0.2, 0.55);
    }
  };
}

export function createSeats(
  renderer: Renderer,
  layout: SceneLayout,
  textures: TextureBag,
  fire: FireLight,
  sprites: SpriteArt,
  assignment: readonly Species[] = DEFAULT_ASSIGNMENT,
): Seats {
  const context: BuildContext = {
    renderer,
    layout,
    textures,
    sprites,
    pixelsPerUnit: (layout.characterHeight / 100) * renderer.resolution,
  };
  const shadows = new Container();
  const contactShadows = new Container();
  const far = new Container();
  const near = new Container();
  const seated: Seated[] = [];
  let logArt: LogArt | undefined;

  for (const placed of placeSeats(layout)) {
    const species = resolveSpecies(sprites, assignment[placed.index]);
    if (!species) continue;
    const { spec, index, seat } = placed;
    const character = buildCharacter(context, placed, species);
    const layer = seat.y < layout.cy ? far : near;

    let log: ReturnType<typeof buildLog> | undefined;
    if (spec.log) {
      logArt ??= bakeLogArt(renderer, context.pixelsPerUnit);
      log = buildLog(context, logArt, placed, character.k);
      layer.addChild(log.container);
    }
    layer.addChild(character.container);

    const cast = buildShadows(textures, placed, character.k, log?.skew ?? 0, log?.stretch ?? 1);
    shadows.addChild(cast.shadow);
    contactShadows.addChild(cast.contact);

    seated.push({
      container: character.container,
      body: character.body,
      lit: character.lit,
      shade: character.shade,
      rim: character.rim,
      shadow: cast.shadow,
      lighting: character.lighting,
      flip: character.flip,
      scale: character.scale,
      x: seat.x,
      y: seat.y,
      distance: character.distance,
      seed: index * 17.3,
      variation: character.variation,
      log: log?.log,
    });
  }
  shadows.addChild(contactShadows);

  const update = createSeatUpdater(seated, fire, layout);
  update(0, true);

  return {
    shadows,
    far,
    near,
    update,
    destroy() {
      logArt?.texture.destroy(true);
    },
  };
}
