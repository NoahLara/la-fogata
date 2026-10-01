import { Container, Sprite, type Renderer } from "pixi.js";
import {
  CharacterArtSet,
  SPECIES_SCALE,
  type Species,
  type SpriteArt,
  type View,
} from "./characters";
import type { FireLight } from "./fire";
import { capNearScales, seatPosition, type SceneLayout } from "./layout";
import { bakeLogArt, LOG, type LogArt } from "./log";
import { between, clamp, createRandom } from "./random";
import type { TextureBag } from "./textures";

/** The rim on characters is thin and hugs the edge; near characters, which are backlit, get a slightly wider one. */
const RIM = { far: { fade: 2.2, lean: 1 }, near: { fade: 3, lean: 1.2 } } as const;

interface SeatSpec {
  /** Angle on the seat ellipse; 90° is the point closest to the viewer. */
  degrees: number;
  /** How the seat is seen: near seats show their back, the seat straight across and its neighbours their front, the outer far seats a profile. */
  view: View;
  /** Sits on a log instead of the ground. */
  log?: boolean;
}

/**
 * Seven seats: two near ones (seen from behind) and five far ones. The far seats to the sides, at 200° and
 * 340°, are seen in profile, turned toward the fire; the other far seats face the viewer. Three seats have a
 * log (one near, two far). A seat knows nothing about who sits in it: the seat decides the view, the
 * lighting, the log and the lean, and the species only decides the art, so any animal works in any seat.
 */
export const SEATS: readonly SeatSpec[] = [
  { degrees: 60, view: "back" },
  { degrees: 120, view: "back", log: true },
  { degrees: 200, view: "side", log: true },
  { degrees: 235, view: "front" },
  { degrees: 270, view: "front" },
  { degrees: 305, view: "front", log: true },
  { degrees: 340, view: "side" },
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

/** The side seats sit closer to the fire: the far part of the ring is squeezed sideways by this much. Near seats stay put. */
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
  back: boolean;
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
  const angle = (degrees * Math.PI) / 180;
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

export function createSeats(
  renderer: Renderer,
  layout: SceneLayout,
  textures: TextureBag,
  fire: FireLight,
  sprites: SpriteArt,
  assignment: readonly Species[] = DEFAULT_ASSIGNMENT,
): Seats {
  const { cx, cy, rx, u, characterHeight } = layout;
  const pixelsPerUnit = (characterHeight / 100) * renderer.resolution;
  const characters = new CharacterArtSet(renderer, pixelsPerUnit, sprites);

  const shadows = new Container();
  const contactShadows = new Container();
  const far = new Container();
  const near = new Container();
  const seated: Seated[] = [];
  let logArt: LogArt | undefined;

  const ringScaleFor = (degrees: number) =>
    seatPosition(layout, degrees).near ? 1 : FAR_RING_SCALE;
  const positions = capNearScales(
    SEATS.map((spec) => seatPosition(layout, spec.degrees, ringScaleFor(spec.degrees))),
  );
  const placed = SEATS.map((spec, index) => ({ spec, index, seat: positions[index] }))
    .flatMap((entry) => (entry.seat ? [{ ...entry, seat: entry.seat }] : []))
    .sort((a, b) => a.seat.y - b.seat.y);

  for (const { spec, index, seat } of placed) {
    // An animal without art (only possible with the drawn fallback, which has the panda alone) sits as the panda.
    const wanted = assignment[index] ?? "panda";
    const species = characters.has(wanted) ? wanted : "panda";
    const back = seat.near;
    const ringScale = ringScaleFor(spec.degrees);
    const scale = seat.scale * SPECIES_SCALE[species];
    const k = (characterHeight / 100) * scale;
    const art = characters.get(species, spec.view);
    // The side art faces left. Seats on the left of the fire face right, so they use it mirrored.
    const flip: 1 | -1 = art.directional && seat.x < cx ? -1 : 1;
    // On a log the character sits into it, so it is raised by less than the log's height.
    const charY = seat.y - (spec.log ? LOG.seatHeight * k : 0);

    const dx = cx - seat.x;
    const dy = cy - 45 * u - (charY - 55 * k);
    const length = Math.hypot(dx, dy) || 1;
    // Direction to the fire in the art's own space: mirrored art sees the fire on its other side.
    const towardFire = { x: (flip * dx) / length, y: dy / length };
    const distance = Math.min(1.6, length / Math.max(rx, 1));
    const anchor = { x: art.originX / art.width, y: art.originY / art.height };
    const centerX = art.originX;
    const centerY = art.originY - 55;

    const body = new Sprite(art.texture);
    body.anchor.set(anchor.x, anchor.y);
    body.setSize(art.width, art.height);

    const masks: Sprite[] = [];
    /** Clips an overlay to the character's silhouette. */
    const clipToSilhouette = (overlay: Sprite) => {
      overlay.anchor.set(anchor.x, anchor.y);
      overlay.setSize(art.width, art.height);
      const silhouette = new Sprite(art.texture);
      silhouette.anchor.set(anchor.x, anchor.y);
      silhouette.setSize(art.width, art.height);
      overlay.setMask({ mask: silhouette });
      masks.push(silhouette);
    };

    // The fire does all the work: a warm light that fades smoothly across the whole body from the side facing it
    // (laid over the colours rather than added to them, so dark markings warm up too and nothing glows like a hole), deep shadow on the far side, and a
    // thin warm rim hugging the edges that face it. All of it points along the line from the seat to the fire.
    const lit = new Sprite(
      textures.rimLight(art.width, art.height, pixelsPerUnit, {
        x0: centerX + towardFire.x * 62,
        y0: centerY + towardFire.y * 62,
        x1: centerX - towardFire.x * 56,
        y1: centerY - towardFire.y * 56,
      }),
    );
    clipToSilhouette(lit);

    const shade = new Sprite(
      textures.sideShade(art.width, art.height, pixelsPerUnit, {
        x0: centerX - towardFire.x * 44,
        y0: centerY - towardFire.y * 44,
        x1: centerX + towardFire.x * 4,
        y1: centerY + towardFire.y * 4,
      }),
    );
    clipToSilhouette(shade);

    const rim = new Sprite(
      textures.edgeRim(
        renderer,
        art.texture,
        art.width,
        towardFire,
        back ? RIM.near.fade : RIM.far.fade,
        back ? RIM.near.lean : RIM.far.lean,
      ),
    );
    rim.anchor.set(anchor.x, anchor.y);
    rim.setSize(art.width, art.height);

    const container = new Container();
    container.position.set(seat.x, charY);
    // Each character leans a little toward the fire (the head more than the hips) and is built slightly
    // differently, so they don't look like clones. Deterministic per seat.
    const rnd = createRandom(index * 977 + 13);
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
    // Masks must be in the scene graph.
    for (const mask of masks) container.addChild(mask);

    const layer = seat.y < cy ? far : near;

    // The log goes in first so the character sits into it. It follows the circle around the fire and is
    // lit like the fire's own logs: an edge light toward the fire that flickers with it.
    let log: Seated["log"];
    let logSkew = 0;
    let logStretch = 1;
    if (spec.log) {
      logArt ??= bakeLogArt(renderer, pixelsPerUnit);
      const logAnchor = { x: logArt.originX / logArt.width, y: logArt.originY / logArt.height };
      const logDx = cx - seat.x;
      const logDy = cy - 45 * u - (seat.y - 10 * k);
      const logLength = Math.hypot(logDx, logDy) || 1;
      const logToward = { x: logDx / logLength, y: logDy / logLength };
      ({ skew: logSkew, stretch: logStretch } = logPlacement(layout, spec.degrees, ringScale));

      const logBody = new Sprite(logArt.texture);
      logBody.anchor.set(logAnchor.x, logAnchor.y);
      logBody.setSize(logArt.width, logArt.height);
      const logRim = new Sprite(
        textures.edgeRim(renderer, logArt.texture, logArt.width, logToward),
      );
      logRim.anchor.set(logAnchor.x, logAnchor.y);
      logRim.setSize(logArt.width, logArt.height);
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

      const logContainer = new Container();
      logContainer.position.set(seat.x, seat.y);
      logContainer.scale.set(k * logStretch, k);
      logContainer.skew.set(0, logSkew);
      logContainer.addChild(logBody, logRim, topShade);
      layer.addChild(logContainer);
      log = { body: logBody, rim: logRim };
    }
    layer.addChild(container);

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
    shadows.addChild(shadow);

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
    contactShadows.addChild(contact);

    seated.push({
      container,
      body,
      lit,
      shade,
      rim,
      shadow,
      back,
      flip,
      scale,
      x: seat.x,
      y: seat.y,
      distance,
      seed: index * 17.3,
      variation,
      log,
    });
  }
  shadows.addChild(contactShadows);

  const update = (time: number, reduced: boolean) => {
    const intensity = fire.intensity;
    for (const s of seated) {
      // Near characters are almost black against the fire; far ones are lit by it.
      const light = clamp(fire.light, 0.4, 1.4);
      s.body.tint = nightTint(
        s.back
          ? clamp(0.94 - (intensity - 1) * 0.04, 0.86, 0.96)
          : clamp(0.46 + s.distance * 0.1 - (intensity - 1) * 0.1, 0.3, 0.6),
      );
      s.lit.alpha = (s.back ? 0.2 : 0.6) * light * (1 - s.distance * 0.2);
      s.shade.alpha = s.back ? 0.55 : 1;
      s.rim.alpha = clamp((s.back ? 1.1 : 0.7) * light * (1 - s.distance * 0.2), 0, 1);

      if (s.log) {
        s.log.body.tint = nightTint(
          s.back ? 0.5 : clamp(0.2 + s.distance * 0.18 - (intensity - 1) * 0.1, 0.08, 0.45),
        );
        s.log.rim.alpha = clamp(clamp(fire.light, 0.4, 1.4) * (1 - s.distance * 0.25), 0, 1);
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
  update(0, true);

  return {
    shadows,
    far,
    near,
    update,
    destroy() {
      characters.destroy();
      logArt?.texture.destroy(true);
    },
  };
}
