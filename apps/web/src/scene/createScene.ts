import { Application, Container } from "pixi.js";
import { createBackground, type Background } from "./background";
import type { SkyOptions, SkyPetitions } from "./sky";
import { debounce } from "./debounce";
import { SPECIES, SpriteArt, type Species } from "./characters";
import { createFire, type Fire } from "./fire";
import { createLightEffects, type LightEffects, type LightHandle } from "./lightEffect";
import { addLog, burn, FIRE, fireIntensityFor, WoodCooldowns } from "./fuel";
import type { DistantFire } from "@/data/types";
import { DistantFireBoard } from "./distantFires";
import { easeToward } from "./math";
import {
  computeLayout,
  skyDragBottom,
  wordBandBottom,
  type Insets,
  type SceneLayout,
} from "./layout";
import {
  comfortMargin,
  panoramaWidth,
  turnToBring,
  screenX,
  turnToCenter,
  turnToCenterShowing,
  type BringView,
} from "./panorama";
import { GLIDE_SECONDS, RISE_SECONDS } from "./lightFlight";
import { skyGeometry } from "./skyGeometry";
import { SkyView } from "./skyView";
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
import type { SoundEvent } from "@/sound/soundEvents";
import { createQualityGovernor } from "./quality";
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
   * Swaps who sits in a seat, keeping the person: the old character leaves as in `removeMember` and, once gone,
   * the new one (same id and seat, another species) arrives as in `addMember`. Does nothing (and warns) if the
   * id is not sitting by the fire.
   */
  replaceMember(member: MemberSpec, options: { animate: boolean }): void;
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
   * again and the note has burned; `onSettled` when the shooting star it became has gone too. With reduced motion
   * nobody walks: the note is on the fire and fades into it.
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
  /** A petition was marked answered: its star turns blue and a shooting star crosses the sky (none with reduced motion). */
  answerPetition(id: string): void;
  /**
   * A petition goes back to the fire: its star dims into a small golden light, which glides in an arc down to the
   * flames and sinks into them with a small flare and a few sparks. With reduced motion the star just fades out.
   * Nobody walks. `onDone` is called when nothing of it is left.
   */
  returnPetition(id: string, onDone: () => void): void;
  /**
   * Sets the stars of other people's petitions: these are the only stars of theirs in the sky, spread across the whole
   * panorama. Stars already there stay where they are; one no longer listed goes at once. Never any text.
   */
  setOtherStars(stars: readonly { id: string; answered: boolean }[]): void;
  /**
   * The visitor sends a tiny warm light to a star that is someone else's: it rises from their animal to the star,
   * which then gives one soft pulse (its size never changes). With reduced motion nothing flies and the star just
   * pulses as a brief fade. `onArrive` is called when the light reaches the star.
   */
  sendLight(fromId: string, petitionId: string, onArrive?: () => void): void;
  /** One soft pulse of light in a star, yours or another's: someone is with it. */
  pulseStar(id: string): void;
  /**
   * Where each petition star is on screen now, in pixels from the top left of the scene. A star in a part of the
   * panorama that is turned away is off screen: its x is below 0 or past the width.
   */
  petitionSpots(): ReadonlyMap<string, { x: number; y: number }>;
  /** The sky is a panorama about four screens wide that turns: how to see it and turn it. */
  readonly sky: SkyControls;
  /**
   * Called at the moment something in the scene should be heard: a log landing, a note catching, a star settling.
   * Only the kind of event, never anything a person wrote. Returns a way to stop.
   */
  onSound(listener: (event: SoundEvent) => void): () => void;
  /** Called whenever the stars may have moved (the scene was laid out again, one was added or went). Returns a way to stop. */
  onLayout(listener: () => void): () => void;
  /**
   * Where the note is in someone's hands, in window coordinates, and how tall it is there: for the page to fly
   * a note to before the scene takes over. Nothing if they are not sitting down.
   */
  notePlacement(id: string): { x: number; y: number; height: number } | undefined;
  /** Where the flames are, in pixels from the top left of the scene: the target for touching the fire. */
  fireBounds(): { x: number; y: number; width: number; height: number };
  /** Where the word from the fire sits: its bottom edge in pixels from the top of the scene, in the sky above the trees. */
  wordBottom(): number;
  /** Dims the petition stars a little while a word is over them, or brings them back. */
  dimPetitionStars(dimmed: boolean): void;
  /** The fire flares softly and throws a few sparks. Nothing with reduced motion. */
  touchFire(): void;
  /** Changes the words drawn in or named on the scene (the language changed). */
  setLabels(labels: { label: string; you: string }): void;
  /** Names the element that describes the scene to a screen reader (how many other fires burn), or none. */
  describeBy(id: string | undefined): void;
  /** The other campfires burning now. Up to eight are drawn far off at the tree line; they fade in and out. */
  setDistantFires(fires: readonly DistantFire[]): void;
  /** Marks this person as the visitor: their animal gets a label when they arrive and a glow when they do something. */
  setSelf(id: string | undefined): void;
  /** Seconds before they can throw wood again; 0 when they can throw now. */
  woodCooldown(id: string): number;
  members(): MemberInfo[];
  destroy(): void;
}

/** What the page sees of the sky's view, whenever it changes. */
export interface SkyViewState {
  /** How far the panorama is turned, in pixels. */
  offset: number;
  /** The panorama's width and the screen's. */
  panorama: number;
  viewport: number;
}

export interface SkyControls {
  state(): SkyViewState;
  /** Called whenever the sky turns (every frame while it does). Returns a way to stop. */
  onView(listener: (state: SkyViewState) => void): () => void;
  /** A finger went down on the sky: it follows the finger until it lifts, and then goes on turning. */
  beginDrag(time: number): void;
  /** The finger moved `dx` pixels to the right: the sky follows. */
  drag(dx: number, time: number): void;
  /** The finger lifted: the sky coasts on (unless motion is reduced). */
  endDrag(time: number): void;
  /**
   * Sets the sky turning like a carousel, and it keeps turning: with `1` the stars move to the left (the sky
   * reveals what is to the right), with `-1` to the right. With reduced motion nothing keeps turning: the sky
   * turns half a screen at a time.
   */
  carousel(direction: 1 | -1): void;
  /** Turns the sky smoothly by `delta` pixels (positive moves the stars to the left). */
  turnBy(delta: number): void;
  /**
   * Turns the sky, if needed, so this star is comfortably in view, then calls `then` (at once if it already is). Does nothing, and never calls `then`, if there is no such star.
   */
  bringIntoView(id: string, then?: () => void): void;
  /** Stops the sky turning by itself while a star's card is open, until the returned function is called. */
  pauseAutoTurn(): () => void;
  /** Where each petition star is in the panorama, which doesn't change as the sky turns. */
  anchors(): ReadonlyMap<string, { x: number; y: number }>;
  /** Where the sky ends for turning it by hand: the bottom edge of the strip a drag may start in. */
  dragBottom(): number;
}

export interface BurdenRequest {
  onDone: () => void;
  /**
   * Called once everything that can be seen of a burden is over: after `onDone` (when the gestures are free
   * again), when its light has risen and the shooting star it became has crossed and gone. At once with reduced
   * motion, and never later than a few seconds after the light sets off, whatever happens to the scene.
   */
  onSettled?: () => void;
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

/** The most a burden's shooting star is waited for after its light sets off: its flight and its crossing, with room to spare. */
const SETTLE_FALLBACK_MS = 20_000;

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
  sky: SkyOptions,
  distant: { fires: readonly DistantFire[]; slots: ReadonlyMap<string, number> },
): Built {
  const layout = computeLayout(width, height, insets);
  const textures = new TextureBag();
  const background = createBackground(layout, textures, petitions, sky, distant);
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
  const density = Math.min(window.devicePixelRatio || 1, 2);
  // The renderer starts up while the illustrations load: they don't depend on each other.
  const [, sprites] = await Promise.all([
    app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      background: NIGHT,
      // Smoothing the edges of shapes is invisible on a dense screen, where it costs the most.
      antialias: density < 2,
      autoDensity: true,
      resolution: density,
    }),
    SpriteArt.load(SPECIES),
  ]);
  // The sharpness the scene is drawn at. It only ever goes down, and only on a device too slow for it.
  let resolution = density;
  const governor = createQualityGovernor();

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
  /** The stars of other people's petitions, as the page last listed them: they keep their spots across rebuilds. */
  let otherStars: readonly { id: string; answered: boolean }[] = [];
  let starsDimmed = false;
  /** The other campfires, each in the spot it keeps for as long as it burns, across rebuilds. */
  const distantBoard = new DistantFireBoard();
  let distantFires: readonly DistantFire[] = [];
  let distantSlots: ReadonlyMap<string, number> = new Map();
  // The panorama's turn is kept as a share of it, so it survives a resize or a rotated phone.
  const view = new SkyView(0);
  const viewListeners = new Set<(state: SkyViewState) => void>();
  const viewState = (): SkyViewState => {
    const viewport = current?.layout.width ?? Math.max(1, host.clientWidth);
    return { offset: view.offset, panorama: view.width, viewport };
  };
  const notifyView = () => {
    if (viewListeners.size === 0) return;
    const state = viewState();
    // Listeners only come and go on a React effect, never while this loop runs a listener's own work.
    for (const listener of viewListeners) listener(state);
  };
  const soundListeners = new Set<(event: SoundEvent) => void>();
  const emitSound = (event: SoundEvent) => {
    for (const listener of [...soundListeners]) listener(event);
  };
  const layoutListeners = new Set<() => void>();
  const notifyLayout = () => {
    for (const listener of [...layoutListeners]) listener();
  };
  /** Rituals in progress, each with what ends it at once. */
  const rituals = new Set<() => void>();
  /** People walking off: what finishes their leaving, so a rebuild that cuts the walk short can still run it. */
  const leaving = new Map<string, () => void>();
  /** Timers that must not outlive the scene. */
  const timers = new Set<number>();
  const later = (callback: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, ms);
    timers.add(timer);
  };
  let destroyed = false;
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
    if (destroyed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    app.renderer.resize(width, height, resolution);
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
    // Anyone still walking in sits down where they were headed. Anyone walking off is gone now, and what was to
    // happen once they were (such as a new character arriving in their seat) happens after the rebuild.
    const interrupted = [...leaving.values()];
    leaving.clear();
    roster.removeLeaving();
    roster.markAllSeated();
    view.setWidth(panoramaWidth(width));
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
      { offset: view.offset, others: otherStars },
      { fires: distantFires, slots: distantSlots },
    );
    current.background.dimPetitionStars(starsDimmed);
    for (const member of roster.members()) current.seats.addMember(member, "instant", Math.random);
    // Let the fire burn for a few seconds before the first frame, so it is already going on load and
    // after a resize (which rebuilds it) instead of starting from nothing and growing back.
    const warmUp = 150;
    for (let i = 0; i < warmUp; i++) current.fire.update(1 / 30, time + i / 30, reduced);
    app.stage.addChild(current.root);
    for (const finishLeaving of interrupted) finishLeaving();
    notifyLayout();
    notifyView();
  };
  rebuild();

  /** Shows the label and glow on the visitor's animal, if they are sitting by the fire. */
  const updateYou = () => {
    if (!current) return;
    const me = selfId ? roster.get(selfId) : undefined;
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
    if (view.step(dt, reduced)) {
      current.background.setOffset(view.offset);
      notifyView();
    }
    current.background.update(time, reduced, current.fire.state.light);
    current.seats.update(time, dt, reduced);
  });

  // On a device that can't keep the scene moving, it is drawn a step less sharp (the art is baked again for it).
  app.ticker.add((ticker) => {
    const lower = governor.frame(ticker.elapsedMS, resolution);
    if (lower === undefined || !current) return;
    resolution = lower;
    later(rebuild, 0);
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

  // Nothing runs while the tab is hidden: the ticker stops, and starts again (without a jump) when it is back.
  const onVisibility = () => {
    if (document.hidden) app.ticker.stop();
    else app.ticker.start();
  };
  document.addEventListener("visibilitychange", onVisibility);
  if (document.hidden) app.ticker.stop();

  const stopWatchingMotion = watchReducedMotion((value) => {
    reduced = value;
    rebuild();
  });

  /** What follows a note's burning, once it has burned: it starts and returns a way to end it at once. */
  type AfterBurn = (done: () => void) => () => void;

  /** How the sky is turned now, for working out how to bring a star into view. */
  const bringView = (built: Built): BringView => ({
    offset: view.offset,
    viewport: built.layout.width,
    width: view.width,
    margin: comfortMargin(built.layout.width),
  });

  /**
   * Turns the sky at once so the middle of the visitor's constellation is in the middle of the screen. Only when the
   * page loads: after that nothing moves the sky but the visitor, and it never stops turning by itself.
   */
  const centerNow = () => {
    const built = current;
    if (!built) return;
    const center = built.background.constellationCenter();
    const delta = turnToCenter(center, view.offset, view.width, built.layout.width);
    if (Math.abs(delta) < 1) return;
    view.setOffset(view.offset + delta);
    built.background.setOffset(view.offset);
    notifyView();
  };

  /**
   * Turns the sky, smoothly, until the middle of the visitor's constellation (with this star in it, even one that isn't
   * born yet) is in the middle of the screen, and the star in view; then calls `then`. The sky goes on turning by
   * itself while the star's light flies (`lead` seconds), so it is turned that much short of centre: the
   * constellation is in the middle when the light arrives. Returns a way to cancel (`then` is then not called).
   */
  const turnToStar = (id: string, built: Built, lead: number, then: () => void): (() => void) => {
    const shift = view.autoSpeed(reduced) * lead;
    const anchor = built.background.petitionAnchor(id);
    const delta = turnToCenterShowing(
      built.background.constellationCenter(id) - shift,
      { x: anchor.x - shift, y: anchor.y },
      bringView(built),
    );
    return view.glideBy(delta, { reduced, viewport: built.layout.width, done: then });
  };

  /**
   * Where a star's light should aim: the star's place on the screen when the light gets there. The sky never stops, so
   * the star will have moved on by then; the spot is worked out for that moment, and kept on the screen so the
   * light is always seen (a star born off to the side is then reached by a light that heads that way).
   */
  const arrivalSpot = (built: Built, id: string, seconds: number): { x: number; y: number } => {
    const anchor = built.background.petitionAnchor(id);
    const offset = view.offset + view.autoSpeed(reduced) * seconds;
    const x = screenX(anchor.x, offset, view.width, built.layout.width);
    const edge = 14 * built.layout.u;
    return { x: Math.min(Math.max(x, edge), built.layout.width - edge), y: anchor.y };
  };

  /**
   * A petition's light is born in the flames and becomes its star; with reduced motion the star just fades in.
   * First the sky turns to the visitor's constellation (to "Mi cielo"), where the star is born; it never stops, so the
   * light aims at where the star will be when it arrives.
   */
  const becomeStar: (petitionId: string, done: () => void) => () => void = (petitionId, done) => {
    const built = current;
    if (!built) {
      done();
      return () => {};
    }
    let ended = false;
    let shown = false;
    let flight: LightHandle | undefined;
    const end = () => {
      if (ended) return;
      ended = true;
      done();
    };
    const show = (mode: "bloom" | "fade") => {
      if (shown) return;
      shown = true;
      if (!petitionIds.includes(petitionId)) petitionIds.push(petitionId);
      built.background.addPetitionStar(petitionId, mode);
      emitSound("starSettle");
      notifyLayout();
    };
    const start = () => {
      emitSound("petitionRise");
      const hooks = { onArrive: () => show(reduced ? "fade" : "bloom"), onDone: end };
      if (reduced) {
        flight = built.lights.fade(hooks);
        return;
      }
      const { cx, cy, u } = built.layout;
      const flames = { x: cx, y: cy - 30 * u };
      const to = arrivalSpot(built, petitionId, RISE_SECONDS + GLIDE_SECONDS);
      flight = built.lights.launch(flames, to, hooks);
    };
    const cancelTurn = turnToStar(petitionId, built, RISE_SECONDS + GLIDE_SECONDS, start);
    return () => {
      if (ended) return;
      cancelTurn();
      if (flight) flight.finish();
      else show("fade");
      end();
    };
  };

  /**
   * What follows a burden's burning: its light rises from the flames exactly as a petition's does, but goes to the
   * middle of the sky that is passing at that moment, and there it is born as a shooting star that crosses and is
   * gone. The sky doesn't move for it. With reduced motion there is nothing more.
   */
  const becomeShootingStar =
    (onSettled?: () => void): AfterBurn =>
    (done) => {
      // Called once, by whichever comes first: the shooting star having gone, or the fallback if the scene was rebuilt.
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        onSettled?.();
      };
      const built = current;
      if (!built || reduced) {
        done();
        settle();
        return () => {};
      }
      const { cx, cy, u, width } = built.layout;
      const flames = { x: cx, y: cy - 30 * u };
      const { skyHeight } = skyGeometry(built.layout);
      const middle = { x: width * (0.5 + (Math.random() - 0.5) * 0.3), y: skyHeight * 0.3 };
      const flight = built.lights.launch(flames, middle, {
        onArrive: () => {
          built.background.shootingStar(middle, settle);
          emitSound("shootingStar");
        },
        onDone: () => {},
      });
      // The ritual itself is over now (the gestures are free again); the light goes on its way by itself.
      done();
      // Should a rebuild (a resize) cut the light's flight short, whoever waits for it is not left waiting.
      later(settle, SETTLE_FALLBACK_MS);
      return flight.finish;
    };

  /**
   * The ritual shared by a burden and a petition: they stand up, run the errand, put the note on the ember bed
   * and walk back while it burns. A petition then has `after` carry on from the ashes.
   */
  const errand = (id: string, onDone: () => void, after?: AfterBurn): BurdenResult => {
    const member = roster.get(id);
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
        emitSound("burden");
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

  const addMemberTo = (member: MemberSpec, { animate }: { animate: boolean }) => {
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
    // Steps for other people's arrivals only: not before the visitor sits down, and never for themselves.
    else if (animate && selfId !== undefined && member.id !== selfId) emitSound("arrive");
  };

  const removeMemberFrom = (
    id: string,
    animate: boolean,
    { forgetCooldown, onGone }: { forgetCooldown: boolean; onGone?: () => void },
  ) => {
    const member = roster.get(id);
    if (!member || member.status !== "seated") {
      console.warn(`Could not send ${id} away: not sitting by the fire`);
      return;
    }
    // Leaving people stop feeding the fire at once, and their seat stays taken until they are gone.
    roster.markLeaving(id);
    if (animate && selfId !== undefined && id !== selfId) emitSound("leave");
    const mode = animate ? (reduced ? "fade" : "walk") : "instant";
    const gone = () => {
      // Once only: a rebuild may already have finished this leaving.
      if (!leaving.delete(id)) return;
      roster.remove(id);
      if (forgetCooldown) cooldowns.forget(id);
      onGone?.();
    };
    leaving.set(id, gone);
    const started = current?.seats.removeMember(id, mode, Math.random, gone);
    if (!started) gone();
  };

  return {
    seatCount: SEATS.length,
    addMember: addMemberTo,
    removeMember(id, { animate }) {
      removeMemberFrom(id, animate, { forgetCooldown: true });
    },
    replaceMember(member, { animate }) {
      const existing = roster.get(member.id);
      if (!existing || existing.status !== "seated") {
        console.warn(`Could not change ${member.id}: not sitting by the fire`);
        return;
      }
      // The old one walks off and, once gone, the new one walks in to the same seat. The wood cooldown stays: a
      // new character is the same person.
      removeMemberFrom(member.id, animate, {
        forgetCooldown: false,
        onGone: () => addMemberTo({ ...member, seat: existing.seat }, { animate }),
      });
    },
    setSelf(id) {
      selfId = id;
      selfSeatedAt = undefined;
      glowSince = undefined;
    },
    throwWood(id, { ignoreCooldown = false } = {}) {
      const member = roster.get(id);
      if (!member || member.status !== "seated") return { status: "not-seated" };
      const secondsLeft = ignoreCooldown ? 0 : cooldowns.remaining(id, time);
      if (secondsLeft > 0) return { status: "cooling", secondsLeft };
      // The log is added to the fire once it lands, whatever happens to the scene before that.
      const land = () => {
        emitSound("wood");
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
      const member = roster.get(id);
      if (!hand || member?.status !== "seated") return undefined;
      const page = host.getBoundingClientRect();
      return {
        x: hand.x + page.left,
        y: hand.y + page.top,
        height: NOTE_HEIGHT_UNITS * hand.scale,
      };
    },
    handOverBurden: (id, { onDone, onSettled }) =>
      errand(id, onDone, becomeShootingStar(onSettled)),
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
      // On load the view is centred on the visitor's constellation.
      centerNow();
    },
    setOtherStars(stars) {
      otherStars = stars.map(({ id, answered }) => ({ id, answered }));
      current?.background.setOtherStars(otherStars);
      notifyLayout();
    },
    sendLight(fromId, petitionId, onArrive) {
      const built = current;
      const spot = built?.background.petitionSpots().get(petitionId);
      const hand = built?.seats.hand(fromId);
      const member = roster.get(fromId);
      const arrive = () => {
        built?.background.pulseStar(petitionId);
        onArrive?.();
      };
      if (!built || !spot || !hand || member?.status !== "seated") {
        arrive();
        return;
      }
      const edge = 14 * built.layout.u;
      const to = {
        x: Math.min(Math.max(spot.x, edge), built.layout.width - edge),
        y: spot.y,
      };
      built.lights.gift({ x: hand.x, y: hand.y }, to, arrive, reduced);
    },
    pulseStar(id) {
      current?.background.pulseStar(id);
    },
    answerPetition(id) {
      if (!petitionIds.includes(id) || retiredIds.has(id) || answeredIds.has(id)) return;
      answeredIds.add(id);
      current?.background.answerPetitionStar(id, reduced ? "instant" : "turn");
      current?.background.shootingStar();
      emitSound("shootingStar");
    },
    returnPetition(id, onDone) {
      const built = current;
      if (!built || !built.background.petitionAnchors().has(id) || retiredIds.has(id)) {
        onDone();
        return;
      }
      // From now on the star is gone: a rebuild in the middle of the flight shows the sky without it.
      retiredIds.add(id);
      // The sky keeps turning; the star dims where it is and its light sinks into the fire from there.
      const spot = built.background.petitionSpots().get(id);
      if (!spot) {
        onDone();
        return;
      }
      const edge = 14 * built.layout.u;
      const from = {
        x: Math.min(Math.max(spot.x, edge), built.layout.width - edge),
        y: spot.y,
      };
      const { cx, cy, u } = built.layout;
      built.lights.descend(
        from,
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
    sky: {
      state: viewState,
      onView(listener) {
        viewListeners.add(listener);
        return () => viewListeners.delete(listener);
      },
      beginDrag: (time) => view.begin(time),
      drag: (dx, time) => view.drag(dx, time),
      endDrag: (time) => view.release(time, reduced),
      carousel(direction) {
        if (!current) return;
        if (reduced) {
          view.glideBy((direction * current.layout.width) / 2, {
            reduced,
            viewport: current.layout.width,
          });
          return;
        }
        view.setCarousel(direction);
      },
      turnBy(delta) {
        if (!current) return;
        view.glideBy(delta, { reduced, viewport: current.layout.width });
      },
      bringIntoView(id, then) {
        const built = current;
        const anchor = built?.background.petitionAnchors().get(id);
        if (!built || !anchor) return;
        const delta = turnToBring(anchor, bringView(built));
        if (delta === 0) then?.();
        else view.glideBy(delta, { reduced, viewport: built.layout.width, done: then });
      },
      pauseAutoTurn: () => view.pauseAuto(),
      anchors() {
        const anchors = new Map<string, { x: number; y: number }>();
        for (const [id, spot] of current?.background.petitionAnchors() ?? []) {
          if (!retiredIds.has(id)) anchors.set(id, { x: spot.x, y: spot.y });
        }
        return anchors;
      },
      dragBottom: () => (current ? skyDragBottom(current.layout) : 0),
    },
    onSound(listener) {
      soundListeners.add(listener);
      return () => soundListeners.delete(listener);
    },
    onLayout(listener) {
      layoutListeners.add(listener);
      return () => layoutListeners.delete(listener);
    },
    fireBounds() {
      if (!current) return { x: 0, y: 0, width: 0, height: 0 };
      const { cx, cy, u } = current.layout;
      return { x: cx - 45 * u, y: cy - 95 * u, width: 90 * u, height: 105 * u };
    },
    wordBottom: () => (current ? wordBandBottom(current.layout) : 0),
    dimPetitionStars(dimmed) {
      starsDimmed = dimmed;
      current?.background.dimPetitionStars(dimmed);
    },
    touchFire() {
      if (reduced || !current) return;
      flare = Math.min(flare + FIRE.flarePerBurden, 0.6);
      current.fire.burst(5);
    },
    woodCooldown: (id) => cooldowns.remaining(id, time),
    members: () => roster.members(),
    setLabels(labels) {
      canvas.setAttribute("aria-label", labels.label);
      youLabel = labels.you;
      current?.you.setText(labels.you);
    },
    describeBy(id) {
      if (id) canvas.setAttribute("aria-describedby", id);
      else canvas.removeAttribute("aria-describedby");
    },
    setDistantFires(fires) {
      distantFires = fires;
      distantSlots = distantBoard.update(fires);
      current?.background.setDistantFires(fires, distantSlots, reduced);
    },
    destroy() {
      destroyed = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      rebuildWhenSettled.cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      stopWatchingMotion();
      app.destroy({ removeView: true }, { children: true });
      if (current) {
        current.seats.destroy();
        current.textures.destroy();
      }
    },
  };
}
