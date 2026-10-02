import { Application, Container } from "pixi.js";
import { createBackground, type Background } from "./background";
import { debounce } from "./debounce";
import { SPECIES, SpriteArt, type Species } from "./characters";
import { createFire, type Fire } from "./fire";
import { easeToward } from "./math";
import { computeLayout, type Insets } from "./layout";
import { prefersReducedMotion, watchReducedMotion } from "./motion";
import { fireIntensityFor, Roster, type MemberSpec } from "./roster";
import { createSeats, DEFAULT_ASSIGNMENT, SEATS, type Seats } from "./seats";
import { shuffled } from "./random";
import { TextureBag } from "./textures";

export interface FogataScene {
  /** How many seats there are around the fire. */
  readonly seatCount: number;
  /**
   * Seats someone. With `animate` they walk in from outside the scene; without it they are just there.
   * Does nothing (and warns) if the id is already around the fire or the seat is not free.
   */
  addMember(member: MemberSpec, options: { animate: boolean }): void;
  members(): MemberSpec[];
  destroy(): void;
}

interface SceneOptions {
  /** Accessible name for the canvas. */
  label: string;
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
): Built {
  const layout = computeLayout(width, height, insets);
  const textures = new TextureBag();
  const background = createBackground(layout, textures);
  const fire = createFire(layout, textures, intensity);
  const seats = createSeats(app.renderer, layout, textures, fire.state, sprites, onSeated);

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
    background.front,
  );
  return { root, background, fire, seats, textures };
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
  // The fire eases toward the strength the seated people give it, and starts at it.
  let intensity = fireIntensityFor(roster.seatedCount);
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
      app.stage.removeChild(current.root);
      current.root.destroy({ children: true });
      current.seats.destroy();
      current.textures.destroy();
    }
    // Anyone still walking in sits down where they were headed.
    roster.markAllSeated();
    current = build(app, width, height, insets, intensity, sprites, (id) => roster.markSeated(id));
    for (const member of roster.members()) current.seats.addMember(member, false, Math.random);
    // Let the fire burn for a few seconds before the first frame, so it is already going on load and
    // after a resize (which rebuilds it) instead of starting from nothing and growing back.
    const warmUp = 150;
    for (let i = 0; i < warmUp; i++) current.fire.update(1 / 30, time + i / 30, reduced);
    app.stage.addChild(current.root);
  };
  rebuild();

  app.ticker.add((ticker) => {
    if (!current) return;
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    time += dt;
    intensity = easeToward(intensity, fireIntensityFor(roster.seatedCount), dt, 0.8);
    current.fire.state.intensity = intensity;
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

  return {
    seatCount: SEATS.length,
    addMember(member, { animate }) {
      const result = roster.add(member, animate && !reduced ? "arriving" : "seated");
      if (result !== "added") {
        console.warn(`Could not seat ${member.id}: ${result}`);
        return;
      }
      // Without a seat's worth of art to draw, nobody sits there.
      const drawn = current?.seats.addMember(member, animate && !reduced, Math.random) ?? false;
      if (!drawn) roster.remove(member.id);
    },
    members: () => roster.members(),
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
