import { Application, Container } from "pixi.js";
import { createBackground, type Background } from "./background";
import type { SkyPetitions } from "./sky";
import { debounce } from "./debounce";
import { SPECIES, SpriteArt, type Species } from "./characters";
import { createFire, type Fire } from "./fire";
import { createLightEffects, type LightEffects } from "./lightEffect";
import { addLog, burn, FIRE, fireIntensityFor, WoodCooldowns } from "./fuel";
import { easeToward } from "./math";
import { computeLayout, type Insets, type SceneLayout } from "./layout";
import { prefersReducedMotion, watchReducedMotion } from "./motion";
import { Roster, type MemberInfo, type MemberSpec } from "./roster";
import { createSeats, DEFAULT_ASSIGNMENT, SEATS, type Seats } from "./seats";
import { shuffled } from "./random";
import { TextureBag } from "./textures";
import {
  createNoteEffects,
  NOTE_HEIGHT_UNITS,
  type NoteEffects,
  type NoteHandle,
  type NoteHooks,
} from "./noteEffects";
import { createWoodEffects, type WoodEffects } from "./woodEffects";
import { createYouMarker, type YouMarker } from "./you";
import { gestureGlowAt, youLabelAlpha } from "./youMarker";

export interface FogataScene {
  /** How many seats there are around the fire. */
  readonly seatCount: number;
  /**
   * Seats someone. With `animate` they walk in from outside the scene; without it they are just there.
   * Does nothing (and warns) if the id is already around the fire or the seat is not free.
   */
  addMember(member: MemberSpec, options: { animate: boolean }): void;
  /**
   * Sends someone away. With `animate` they stand up and walk off into the dark, the arrival run backwards;
   * without it they are just gone. Does nothing (and warns) if they are not around or still arriving.
   */
  removeMember(id: string, options: { animate: boolean }): void;
  /**
   * Has someone throw a log into the fire, which makes it stronger for a while. Everyone can throw one a
   * minute; the fire can only get so big.
   */
  throwWood(id: string, options?: { ignoreCooldown?: boolean }): ThrowResult;
  /**
   * Has someone hand over a burden. A small folded note, with nothing written on it, is in their hands: they stand
   * up, walk to the stones, lean over them to put it on the ember bed, and walk back to sit down while it burns
   * like paper and its ash rises. Works for anyone around the fire, so everyone in the room can watch anyone's
   * burden burn; nothing about what was written ever reaches the scene. `onDone` is called when they are sitting
   * again and the note has burned. With reduced motion nobody walks: the note is on the fire and fades into it.
   */
  handOverBurden(id: string, request: BurdenRequest): BurdenResult;
  /**
   * Has someone leave a petition: the same errand and the same note as a burden, and the note burns the same way.
   * Then a small golden light is born in the flames, rises with the smoke, glides to its spot in the sky and
   * settles there as the petition's star. Nothing written is ever here: only the petition's id. `onDone` is
   * called when they are sitting again and the star has settled. With reduced motion nobody walks and nothing
   * flies: the note fades into the fire, then the star fades in.
   */
  offerPetition(id: string, request: PetitionRequest): BurdenResult;
  /** Puts these petitions' stars in the sky, all at once: the visitor's own, when the page loads. Ones already there stay. */
  setPetitionStars(stars: readonly { id: string; answered: boolean }[]): void;
  /** A petition was marked answered: its star turns golden and a shooting star crosses the sky (none with reduced motion). */
  answerPetition(id: string): void;
  /**
   * A petition goes back to the fire: its star dims into a small golden light, which glides in an arc down to the
   * flames and sinks into them with a small flare and a few sparks. With reduced motion the star just fades out.
   * Nobody walks. `onDone` is called when nothing of it is left.
   */
  returnPetition(id: string, onDone: () => void): void;
  /** Where each petition star is, in pixels from the top left of the scene. */
  petitionSpots(): ReadonlyMap<string, { x: number; y: number }>;
  /** Called whenever the stars may have moved (the scene was laid out again, one was added or went). Returns a way to stop. */
  onLayout(listener: () => void): () => void;
  /**
   * Where the note is in someone's hands, in window coordinates, and how tall it is there: for the page to fly
   * a note to before the scene takes over. Nothing if they are not sitting down.
   */
  notePlacement(id: string): { x: number; y: number; height: number } | undefined;
  /** Changes the words drawn in or named on the scene (the language changed). */
  setLabels(labels: { label: string; you: string }): void;
  /** Marks this person as the visitor: their animal gets a label when they arrive and a glow when they do something. */
  setSelf(id: string | undefined): void;
  /** Seconds before they can throw wood again; 0 when they can throw now. */
  woodCooldown(id: string): number;
  members(): MemberInfo[];
  destroy(): void;
}

export interface BurdenRequest {
  onDone: () => void;
}

export interface PetitionRequest extends BurdenRequest {
  /** Which petition becomes a star. */
  petitionId: string;
}

export type BurdenResult = { status: "burning" } | { status: "not-seated" };

export type ThrowResult =
  { status: "thrown" } | { status: "cooling"; secondsLeft: number } | { status: "not-seated" };

export interface SceneFonts {
  /** The interface font, for labels. */
  ui: string;
}

interface SceneOptions {
  /** Accessible name for the canvas. */
  label: string;
  /** What the visitor's own animal is labelled with. */
  youLabel: string;
  /** CSS font families for text drawn in the scene. They must already be loaded: drawn text is not redrawn when a font arrives. */
  fonts: SceneFonts;
  /** Space reserved for UI at the top and bottom of the host. */
  insets?: Insets;
  /** Randomizes who sits where, once per scene, and seats everyone at the start. For checking every animal in every seat. */
  shuffle?: boolean;
  /** Seats this species in every seat at the start, to see it from every angle. Takes precedence over `shuffle`. Ignored if it isn't a species. */
  animal?: string;
}

const NIGHT = "#0b0d1a";

/** How long the size of the host must stay put before the scene is rebuilt for it. */
const RESIZE_SETTLE_MS = 150;

interface Built {
  root: Container;
  background: Background;
  fire: Fire;
  seats: Seats;
  effects: WoodEffects;
  notes: NoteEffects;
  lights: LightEffects;
  layout: SceneLayout;
  you: YouMarker;
  textures: TextureBag;
}

function build(
  app: Application,
  width: number,
  height: number,
  insets: Insets,
  intensity: number,
  sprites: SpriteArt,
  onSeated: (id: string) => void,
  youLabel: string,
  fonts: SceneFonts,
  petitions: SkyPetitions,
): Built {
  const layout = computeLayout(width, height, insets);
  const textures = new TextureBag();
  const background = createBackground(layout, textures, petitions);
  const fire = createFire(layout, textures, intensity);
  const seats = createSeats(app.renderer, layout, textures, fire.state, sprites, onSeated);
  const effects = createWoodEffects(layout);
  const notes = createNoteEffects(layout, fire.noteLayer);
  const lights = createLightEffects(layout, textures);
  const you = createYouMarker(layout, youLabel, fonts.ui);

  // Same draw order as the prototype: far people behind the fire, near people in front of it.
  const root = new Container();
  root.addChild(
    background.back,
    fire.groundLight,
    seats.shadows,
    seats.far,
    fire.body,
    fire.glow,
    seats.near,
    effects.container,
    notes.air,
    lights.container,
    you.container,
    background.front,
  );
  return { root, layout, background, fire, seats, effects, notes, lights, you, textures };
}

export async function createScene(host: HTMLElement, options: SceneOptions): Promise<FogataScene> {
  const insets = options.insets ?? { top: 0, bottom: 0 };
  const app = new Application();
  await app.init({
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
    background: NIGHT,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });

  const sprites = await SpriteArt.load(SPECIES);

  // Fixed for the life of the scene, so a resize doesn't reshuffle everyone.
  const only = SPECIES.find((species) => species === options.animal);
  if (options.animal && !only) {
    console.warn(`Unknown animal "${options.animal}"; expected one of ${SPECIES.join(", ")}`);
  }
  // Nobody is around the fire unless asked for, for looking at the art: then every seat is taken from the start.
  const assignment: readonly Species[] | undefined = only
    ? SEATS.map(() => only)
    : options.shuffle
      ? shuffled(DEFAULT_ASSIGNMENT, Math.random)
      : undefined;

  const canvas = app.canvas;
  canvas.style.display = "block";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", options.label);
  host.appendChild(canvas);

  const roster = new Roster(SEATS.length);
  assignment?.forEach((species, seat) => {
    roster.add({ id: `seat-${seat}`, species, seat }, "seated");
  });
  // The fire eases toward the strength the people and the wood give it, and starts at it.
  let fuel = 0;
  /** The brief surge as a log lands, on top of the strength the fire settles at. */
  let flare = 0;
  const cooldowns = new WoodCooldowns();
  /** The petitions that are stars in the sky, in the order they became stars: each keeps its spot across rebuilds. */
  const petitionIds: string[] = [];
  /** Of those, the ones answered, and the ones that went back to the fire (which only keep their place). */
  const answeredIds = new Set<string>();
  const retiredIds = new Set<string>();
  const layoutListeners = new Set<() => void>();
  const notifyLayout = () => {
    for (const listener of [...layoutListeners]) listener();
  };
  /** Rituals in progress, each with what ends it at once. */
  const rituals = new Set<() => void>();
  // The visitor's own animal: when they sat down and when they last did something, in scene time.
  let selfId: string | undefined;
  // What the visitor's label says now; a rebuild (on resize) must not bring back the first language.
  let youLabel = options.youLabel;
  let selfSeatedAt: number | undefined;
  let glowSince: number | undefined;
  let intensity = fireIntensityFor(roster.seatedCount, fuel);
  let reduced = prefersReducedMotion();
  let time = 0;
  let current: Built | undefined;
  let builtWidth = 0;
  let builtHeight = 0;

  const rebuild = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    app.renderer.resize(width, height);
    builtWidth = width;
    builtHeight = height;
    if (current) {
      // Logs still in the air land now, so none are lost.
      current.effects.landAll();
      // A ritual cut off by the rebuild ends where it stands: everyone sits and the note is gone.
      for (const finish of [...rituals]) finish();
      current.notes.finishAll();
      current.lights.finishAll();
      app.stage.removeChild(current.root);
      current.root.destroy({ children: true });
      current.seats.destroy();
      current.textures.destroy();
    }
    // Anyone still walking in sits down where they were headed.
    roster.removeLeaving();
    roster.markAllSeated();
    current = build(
      app,
      width,
      height,
      insets,
      intensity,
      sprites,
      (id) => roster.markSeated(id),
      youLabel,
      options.fonts,
      { ids: petitionIds, answered: answeredIds, retired: retiredIds },
    );
    for (const member of roster.members()) current.seats.addMember(member, "instant", Math.random);
    // Let the fire burn for a few seconds before the first frame, so it is already going on load and
    // after a resize (which rebuilds it) instead of starting from nothing and growing back.
    const warmUp = 150;
    for (let i = 0; i < warmUp; i++) current.fire.update(1 / 30, time + i / 30, reduced);
    app.stage.addChild(current.root);
    notifyLayout();
  };
  rebuild();

  /** Shows the label and glow on the visitor's animal, if they are sitting by the fire. */
  const updateYou = () => {
    if (!current) return;
    const me = selfId ? roster.members().find((member) => member.id === selfId) : undefined;
    if (me?.status !== "seated") selfSeatedAt = undefined;
    else selfSeatedAt ??= time;
    const at = selfId && selfSeatedAt !== undefined ? current.seats.anchor(selfId) : undefined;
    const label = selfSeatedAt === undefined ? 0 : youLabelAlpha(time - selfSeatedAt);
    const glow = glowSince === undefined ? 0 : gestureGlowAt(time - glowSince);
    current.you.update(at, label, glow);
  };

  app.ticker.add((ticker) => {
    if (!current) return;
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    time += dt;
    fuel = burn(fuel, dt);
    flare = easeToward(flare, 0, dt, 0.9);
    intensity = easeToward(intensity, fireIntensityFor(roster.seatedCount, fuel), dt, 0.8);
    current.fire.state.intensity = intensity + flare;
    current.effects.update(dt);
    current.notes.update(dt);
    current.lights.update(dt);
    updateYou();
    current.fire.update(dt, time, reduced);
    current.background.update(time, reduced, current.fire.state.light);
    current.seats.update(time, dt, reduced);
  });

  // Building the scene bakes every texture, so while the host is being resized only the canvas follows it
  // and the scene is laid out again once the size has settled.
  const rebuildWhenSettled = debounce(rebuild, RESIZE_SETTLE_MS);
  const observer = new ResizeObserver(() => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    // The observer also reports the size the scene was just built for.
    if (width === builtWidth && height === builtHeight) return;
    app.renderer.resize(width, height);
    rebuildWhenSettled();
  });
  observer.observe(host);

  const stopWatchingMotion = watchReducedMotion((value) => {
    reduced = value;
    rebuild();
  });

  /** What follows a note's burning, once it has burned: it starts and returns a way to end it at once. */
  type AfterBurn = (done: () => void) => () => void;

  /** A petition's light is born in the flames and becomes its star; with reduced motion the star just fades in. */
  const becomeStar: (petitionId: string, done: () => void) => () => void = (petitionId, done) => {
    const built = current;
    if (!built) {
      done();
      return () => {};
    }
    const show = (mode: "bloom" | "fade") => {
      if (!petitionIds.includes(petitionId)) petitionIds.push(petitionId);
      built.background.addPetitionStar(petitionId, mode);
      notifyLayout();
    };
    const hooks = { onArrive: () => show(reduced ? "fade" : "bloom"), onDone: done };
    if (reduced) return built.lights.fade(hooks).finish;
    const { cx, cy, u } = built.layout;
    const flames = { x: cx, y: cy - 30 * u };
    return built.lights.launch(flames, built.background.petitionSpot(petitionId), hooks).finish;
  };

  /**
   * The ritual shared by a burden and a petition: they stand up, run the errand, put the note on the ember bed
   * and walk back while it burns. A petition then has `after` carry on from the ashes.
   */
  const errand = (id: string, onDone: () => void, after?: AfterBurn): BurdenResult => {
    const member = roster.members().find((entry) => entry.id === id);
    if (!member || member.status !== "seated" || !current) return { status: "not-seated" };
    const hand = current.seats.hand(id);
    if (!hand) return { status: "not-seated" };

    // The ritual is over when they are sitting again and everything after the note has finished, whichever comes last.
    let seated = false;
    let burned = false;
    let follow = after;
    let endAfter: (() => void) | undefined;
    let ended = false;
    const end = () => {
      if (ended || !seated || !burned) return;
      ended = true;
      rituals.delete(abort);
      onDone();
    };
    const hooks: NoteHooks = {
      onLand: () => {
        flare = Math.min(flare + FIRE.flarePerBurden, 0.6);
        current?.fire.burst(reduced ? 0 : 6);
      },
      onEmbers: (count) => current?.fire.burst(reduced ? 0 : count),
      onDone: () => {
        if (!follow) {
          burned = true;
          end();
          return;
        }
        // The note is ash: what comes after is born from the flames.
        endAfter = follow(() => {
          burned = true;
          end();
        });
      },
    };
    let note: NoteHandle | undefined;
    const abort = () => {
      seated = true;
      note?.finish();
      endAfter?.();
      end();
    };

    if (reduced) {
      // Nobody walks: the note is on the fire and fades into it.
      seated = true;
      note = current.notes.fadeIn(hand.x < current.layout.cx ? -1 : 1, hooks);
      rituals.add(abort);
      if (id === selfId) glowSince = time;
      return { status: "burning" };
    }
    note = current.notes.carry(() => current?.seats.hand(id), hooks, Math.floor(time * 1000) >>> 0);
    const started = current.seats.errand(id, {
      // They stand on the opposite side of the fire from the way they face; the note goes to their side.
      onRelease: (heading) => note?.release(heading === 1 ? -1 : 1),
      onReturned: () => {
        seated = true;
        end();
      },
      onCancel: () => abort(),
    });
    if (!started) {
      // The ritual never began, so nothing may follow it.
      follow = undefined;
      note.finish();
      return { status: "not-seated" };
    }
    rituals.add(abort);
    if (id === selfId) glowSince = time;
    return { status: "burning" };
  };

  return {
    seatCount: SEATS.length,
    addMember(member, { animate }) {
      // Without motion they fade in where they sit instead of walking in.
      const mode = animate ? (reduced ? "fade" : "walk") : "instant";
      const result = roster.add(member, mode === "instant" ? "seated" : "arriving");
      if (result !== "added") {
        console.warn(`Could not seat ${member.id}: ${result}`);
        return;
      }
      // Without a seat's worth of art to draw, nobody sits there.
      const drawn = current?.seats.addMember(member, mode, Math.random) ?? false;
      if (!drawn) roster.remove(member.id);
    },
    removeMember(id, { animate }) {
      const member = roster.members().find((entry) => entry.id === id);
      if (!member || member.status !== "seated") {
        console.warn(`Could not send ${id} away: not sitting by the fire`);
        return;
      }
      // Leaving people stop feeding the fire at once, and their seat stays taken until they are gone.
      roster.markLeaving(id);
      const mode = animate ? (reduced ? "fade" : "walk") : "instant";
      const started = current?.seats.removeMember(id, mode, Math.random, () => {
        roster.remove(id);
        cooldowns.forget(id);
      });
      if (!started) {
        roster.remove(id);
        cooldowns.forget(id);
      }
    },
    setSelf(id) {
      selfId = id;
      selfSeatedAt = undefined;
      glowSince = undefined;
    },
    throwWood(id, { ignoreCooldown = false } = {}) {
      const member = roster.members().find((entry) => entry.id === id);
      if (!member || member.status !== "seated") return { status: "not-seated" };
      const secondsLeft = ignoreCooldown ? 0 : cooldowns.remaining(id, time);
      if (secondsLeft > 0) return { status: "cooling", secondsLeft };
      // The log is added to the fire once it lands, whatever happens to the scene before that.
      const land = () => {
        fuel = addLog(fuel);
        flare = Math.min(flare + FIRE.flarePerLog, 0.6);
        current?.fire.burst(reduced ? 0 : 14);
      };
      if (reduced) {
        // Without motion nobody swings an arm: the log simply goes into the fire.
        land();
      } else {
        const hand = current?.seats.toss(id);
        if (!current || !hand) return { status: "not-seated" };
        current.effects.launch({ x: hand.x, y: hand.y }, hand.scale, land);
      }
      cooldowns.record(id, time);
      return { status: "thrown" };
    },
    notePlacement(id) {
      const hand = current?.seats.hand(id);
      const member = roster.members().find((entry) => entry.id === id);
      if (!hand || member?.status !== "seated") return undefined;
      const page = host.getBoundingClientRect();
      return {
        x: hand.x + page.left,
        y: hand.y + page.top,
        height: NOTE_HEIGHT_UNITS * hand.scale,
      };
    },
    handOverBurden: (id, { onDone }) => errand(id, onDone),
    offerPetition(id, { petitionId, onDone }) {
      return errand(id, onDone, (done) => becomeStar(petitionId, done));
    },
    setPetitionStars(stars) {
      for (const { id, answered } of stars) {
        if (petitionIds.includes(id)) continue;
        petitionIds.push(id);
        current?.background.addPetitionStar(id, "instant");
        if (answered) {
          answeredIds.add(id);
          current?.background.answerPetitionStar(id, "instant");
        }
      }
      notifyLayout();
    },
    answerPetition(id) {
      if (!petitionIds.includes(id) || retiredIds.has(id) || answeredIds.has(id)) return;
      answeredIds.add(id);
      current?.background.answerPetitionStar(id, reduced ? "instant" : "turn");
      current?.background.shootingStar();
    },
    returnPetition(id, onDone) {
      const built = current;
      const spot = built?.background.petitionSpots().get(id);
      if (!built || !spot || retiredIds.has(id)) {
        onDone();
        return;
      }
      // From now on the star is gone: a rebuild in the middle of the flight shows the sky without it.
      retiredIds.add(id);
      const { cx, cy, u } = built.layout;
      built.lights.descend(
        spot,
        { x: cx, y: cy - 30 * u },
        {
          onDim: () => built.background.removePetitionStar(id, "dim"),
          onArrive: () => {
            flare = Math.min(flare + FIRE.flarePerBurden, 0.6);
            current?.fire.burst(5);
          },
          onDone,
        },
        reduced,
      );
      notifyLayout();
    },
    petitionSpots() {
      const spots = new Map<string, { x: number; y: number }>();
      for (const [id, spot] of current?.background.petitionSpots() ?? []) {
        if (!retiredIds.has(id)) spots.set(id, { x: spot.x, y: spot.y });
      }
      return spots;
    },
    onLayout(listener) {
      layoutListeners.add(listener);
      return () => layoutListeners.delete(listener);
    },
    woodCooldown: (id) => cooldowns.remaining(id, time),
    members: () => roster.members(),
    setLabels(labels) {
      canvas.setAttribute("aria-label", labels.label);
      youLabel = labels.you;
      current?.you.setText(labels.you);
    },
    destroy() {
      rebuildWhenSettled.cancel();
      observer.disconnect();
      stopWatchingMotion();
      app.destroy({ removeView: true }, { children: true });
      if (current) {
        current.seats.destroy();
        current.textures.destroy();
      }
    },
  };
}
