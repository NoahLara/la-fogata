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
import { createDirector } from "./idle";
import { drawLog } from "./log";
import { LOG, logShape } from "./logShape";
import { clamp, toRadians } from "./math";
import {
  createMember,
  nightTint,
  type BuildContext,
  type Entrance,
  type ErrandHooks,
  type Exit,
  type HandPosition,
  type Member,
  type MemberLayers,
  type Placed,
} from "./member";
import { createRandom, type Random } from "./random";
import type { MemberSpec } from "./roster";
import { errandTimeline, returnTimeline } from "./errand";
import { arrivalTimeline, leaveTimeline, needsTurn } from "./seatState";
import { ringScaleFor, SEATS } from "./seatTable";
import type { TextureBag } from "./textures";
import { planArrival, planDeparture, planErrand } from "./walk";

export { DEFAULT_ASSIGNMENT, SEATS } from "./seatTable";

export type EntranceMode = "walk" | "fade" | "instant";

export interface Seats {
  /** Soft shadows: cast away from the fire, plus a contact shadow under each character (or its log). */
  shadows: Container;
  /** Characters and logs behind the fire. */
  far: Container;
  /** Characters and logs in front of the fire. */
  near: Container;
  /**
   * Seats someone: `walk` has them walk in from outside the scene, `fade` (for reduced motion) has them fade in
   * where they sit, and `instant` has them just there. Returns false when the seat is not free or nothing can
   * be drawn for them.
   */
  addMember(member: MemberSpec, mode: EntranceMode, rand: Random): boolean;
  /**
   * Sends someone away, the arrival run backwards (`walk`), fading out where they sit (`fade`), or at once
   * (`instant`). `onGone` is called when they are gone. Returns false if they are not around or still arriving.
   */
  removeMember(id: string, mode: EntranceMode, rand: Random, onGone: () => void): boolean;
  /** Has someone swing an arm to throw a log; see `Member.toss`. */
  toss(id: string): { x: number; y: number; scale: number } | undefined;
  /** Where someone's hands are, without them moving; see `Member.anchor`. */
  anchor(id: string): { x: number; y: number; scale: number } | undefined;
  /**
   * Sends someone to the stones to put something on the fire and back to their seat; see `Member.errand`. Works
   * for anyone around the fire. Returns false unless they are sitting down with nothing else going on.
   */
  errand(id: string, hooks: ErrandHooks): boolean;
  /** Where someone's hands are right now, wherever they are; see `Member.hand`. */
  hand(id: string): HandPosition | undefined;
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
    director: createDirector(),
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
    const light = clamp(fire.light, 0.12, 1.4);
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
    addMember(spec, mode, rand) {
      const placed = places[spec.seat];
      if (!placed || [...members.values()].some((entry) => entry.seat === spec.seat)) return false;
      const species = resolveSpecies(sprites, spec.species);
      if (!species || members.has(spec.id)) return false;
      const log = placed.spec.log === true;
      let entrance: Entrance | undefined;
      if (mode === "walk") {
        // Side seats face the fire already, so they walk in facing it and need no turn.
        const plan = planArrival(layout, placed.seat, {
          log,
          rand,
          faceFire: placed.spec.view === "side",
        });
        const seatFacing = placed.seat.x < layout.cx ? 1 : -1;
        const turn = needsTurn(placed.spec.view, plan.endHeading, seatFacing);
        entrance = { kind: "walk", timeline: arrivalTimeline(rand, { log, turn }), plan };
      } else if (mode === "fade") {
        entrance = { kind: "fade" };
      }
      const member = createMember(context, placed, spec.id, species, fire, layers, entrance, () =>
        onSeated(spec.id),
      );
      members.set(spec.id, { member, seat: spec.seat });
      return true;
    },
    removeMember(id, mode, rand, onGone) {
      const entry = members.get(id);
      const placed = entry && places[entry.seat];
      if (!entry || !placed) return false;
      const finish = () => {
        members.delete(id);
        entry.member.destroy();
        onGone();
      };
      if (mode === "instant") {
        finish();
        return true;
      }
      let exit: Exit = { kind: "fade" };
      if (mode === "walk") {
        const log = placed.spec.log === true;
        const plan = planDeparture(layout, placed.seat, {
          log,
          rand,
          faceFire: placed.spec.view === "side",
        });
        const seatFacing = placed.seat.x < layout.cx ? 1 : -1;
        const turn = needsTurn(placed.spec.view, plan.startHeading, seatFacing);
        exit = { kind: "walk", timeline: leaveTimeline(rand, { log, turn }), plan };
      }
      return entry.member.leave(exit, finish);
    },
    toss: (id) => members.get(id)?.member.toss(),
    anchor: (id) => members.get(id)?.member.anchor(),
    hand: (id) => members.get(id)?.member.hand(),
    errand(id, hooks) {
      const entry = members.get(id);
      const placed = entry && places[entry.seat];
      if (!entry || !placed) return false;
      const log = placed.spec.log === true;
      const plan = planErrand(layout, placed.seat, { log });
      const seatFacing = placed.seat.x < layout.cx ? 1 : -1;
      const out = errandTimeline({
        log,
        turn: needsTurn(placed.spec.view, plan.out.startHeading, seatFacing),
      });
      const back = returnTimeline({
        log,
        turn: needsTurn(placed.spec.view, plan.back.endHeading, seatFacing),
      });
      return entry.member.errand({ plan, out, back }, hooks);
    },
    update(time, dt, reduced) {
      updateLogs();
      for (const { member } of members.values()) member.update(time, dt, reduced);
    },
    destroy() {
      for (const { member } of members.values()) member.destroy();
      members.clear();
    },
  };
}
