import { Container, type Graphics, Sprite, type Renderer } from "pixi.js";
import { SPECIES, type Species, type SpriteArt } from "./characters";
import type { FireLight } from "./fire";
import {
  capNearScales,
  directionToFire,
  seatPosition,
  type SceneLayout,
  type SeatPosition,
} from "./layout";
import { evaluateCurve, VIEW_LIGHTING, type ViewLighting } from "./lighting";
import { drawLog } from "./log";
import { LOG, logShape } from "./logShape";
import { clamp, toRadians } from "./math";
import {
  createMember,
  nightTint,
  type BuildContext,
  type Arrival,
  type Member,
  type MemberLayers,
  type Placed,
} from "./member";
import { createRandom, type Random } from "./random";
import type { MemberSpec } from "./roster";
import { arrivalTimeline, needsTurn } from "./seatState";
import { ringScaleFor, SEATS } from "./seatTable";
import type { TextureBag } from "./textures";
import { planArrival } from "./walk";

export { DEFAULT_ASSIGNMENT, SEATS } from "./seatTable";

export interface Seats {
  /** Soft shadows: cast away from the fire, plus a contact shadow under each character (or its log). */
  shadows: Container;
  /** Characters and logs behind the fire. */
  far: Container;
  /** Characters and logs in front of the fire. */
  near: Container;
  /**
   * Seats someone. With `animate` they walk in from outside the scene; without it they are just there.
   * Returns false when the seat is not free or nothing can be drawn for them.
   */
  addMember(member: MemberSpec, animate: boolean, rand: Random): boolean;
  update(time: number, dt: number, reduced: boolean): void;
  destroy(): void;
}

interface SeatLog {
  body: Graphics;
  warm: Graphics;
  lighting: ViewLighting;
  distance: number;
}

/** Every seat's position, by seat index. */
function placeSeats(layout: SceneLayout): Placed[] {
  const positions = capNearScales(
    SEATS.map((spec) => seatPosition(layout, spec.degrees, ringScaleFor(spec))),
  );
  return SEATS.flatMap((spec, index) => {
    const seat: SeatPosition | undefined = positions[index];
    return seat ? [{ spec, index, seat }] : [];
  });
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
 * The log under a log seat. It belongs to the seat and is there with or without anyone on it. It lies tangent
 * to the circle around the fire, seen in perspective (see `logShape`), and is lit on the side facing the fire.
 */
function buildLog({ layout, textures }: BuildContext, { spec, index, seat }: Placed) {
  const { cx, cy, rx, ry, characterHeight } = layout;
  const k = (characterHeight / 100) * seat.scale;
  const squash = ry / rx;
  const toFire = directionToFire({ x: seat.x, y: seat.y }, { x: cx, y: cy });
  const shape = logShape({
    angle: toRadians(spec.degrees),
    squash,
    // On the ground, depth is stretched back out: a step toward the fire on screen is longer on the ground.
    toFire: unit({ x: toFire.x * toFire.length, y: (toFire.y * toFire.length) / squash }),
  });
  const { body, warm } = drawLog(shape, createRandom(index * 389 + 5));

  const container = new Container();
  container.position.set(seat.x, seat.y);
  container.scale.set(k);
  // Just under whoever sits on it, and over anyone behind it.
  container.zIndex = seat.y - 0.01;
  container.addChild(body, warm);

  // A soft shadow on the ground along the log.
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
  contact.position.set(seat.x, seat.y);
  contact.rotation = Math.atan2(shape.axis.y, shape.axis.x);
  contact.setSize(
    (Math.hypot(shape.axis.x, shape.axis.y) + LOG.radius * 1.8) * k,
    (2 * LOG.radius * Math.abs(shape.axis.x / LOG.length) * squash + LOG.radius * 0.9) * k,
  );

  const distance = Math.min(1.6, toFire.length / Math.max(rx, 1));
  return { container, contact, log: { body, warm, lighting: VIEW_LIGHTING[spec.view], distance } };
}

const unit = (v: { x: number; y: number }) => {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
};

export function createSeats(
  renderer: Renderer,
  layout: SceneLayout,
  textures: TextureBag,
  fire: FireLight,
  sprites: SpriteArt,
  onSeated: (id: string) => void,
): Seats {
  const context: BuildContext = {
    renderer,
    layout,
    textures,
    sprites,
    pixelsPerUnit: (layout.characterHeight / 100) * renderer.resolution,
    walkerLight: new Map(),
  };
  // Contact shadows go over the long cast ones.
  const shadows = new Container({ sortableChildren: true });
  const contactShadows = new Container();
  contactShadows.zIndex = 1;
  shadows.addChild(contactShadows);
  // People and logs sort by how far down the screen their feet are, so nobody walks over someone in front.
  const far = new Container({ sortableChildren: true });
  const near = new Container({ sortableChildren: true });
  const layers: MemberLayers = { far, near, shadows, contactShadows };
  const places = placeSeats(layout);
  const members = new Map<string, { member: Member; seat: number }>();
  const logs: SeatLog[] = [];

  for (const placed of places) {
    if (!placed.spec.log) continue;
    const built = buildLog(context, placed);
    (placed.seat.y < layout.cy ? far : near).addChild(built.container);
    contactShadows.addChild(built.contact);
    logs.push(built.log);
  }

  const updateLogs = () => {
    const light = clamp(fire.light, 0.4, 1.4);
    for (const log of logs) {
      log.body.tint = nightTint(evaluateCurve(log.lighting.logTint, log.distance, fire.intensity));
      log.warm.alpha = clamp(light * (1 - log.distance * 0.25), 0, 1);
    }
  };
  updateLogs();

  return {
    shadows,
    far,
    near,
    addMember(spec, animate, rand) {
      const placed = places[spec.seat];
      if (!placed || [...members.values()].some((entry) => entry.seat === spec.seat)) return false;
      const species = resolveSpecies(sprites, spec.species);
      if (!species || members.has(spec.id)) return false;
      const log = placed.spec.log === true;
      let arrival: Arrival | undefined;
      if (animate) {
        // Side seats face the fire already, so they walk in facing it and need no turn.
        const plan = planArrival(layout, placed.seat, {
          log,
          rand,
          faceFire: placed.spec.view === "side",
        });
        const seatFacing = placed.seat.x < layout.cx ? 1 : -1;
        const turn = needsTurn(placed.spec.view, plan.endHeading, seatFacing);
        arrival = { timeline: arrivalTimeline(rand, { log, turn }), plan };
      }
      const member = createMember(context, placed, spec.id, species, fire, layers, arrival, () =>
        onSeated(spec.id),
      );
      members.set(spec.id, { member, seat: spec.seat });
      return true;
    },
    update(time, dt, reduced) {
      updateLogs();
      for (const { member } of members.values()) member.update(time, dt, reduced);
    },
    destroy() {},
  };
}
