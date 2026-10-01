import { Application, Container } from "pixi.js";
import { createBackground, type Background } from "./background";
import { SPECIES, SpriteArt, type Species } from "./characters";
import { createFire, type Fire } from "./fire";
import { computeLayout, type Insets } from "./layout";
import { prefersReducedMotion, watchReducedMotion } from "./motion";
import { createSeats, DEFAULT_ASSIGNMENT, SEATS, type Seats } from "./seats";
import { shuffled } from "./random";
import { TextureBag } from "./textures";

export interface FogataScene {
  destroy(): void;
}

export interface SceneOptions {
  /** Accessible name for the canvas. */
  label: string;
  /** Space reserved for UI at the top and bottom of the host. */
  insets?: Insets;
  /** Randomizes who sits where, once per scene. For checking every animal in every seat. */
  shuffle?: boolean;
  /** Puts this species in every seat, to see it from every angle. Takes precedence over `shuffle`. Ignored if it isn't a species. */
  animal?: string;
}

const NIGHT = "#0b0d1a";

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
  assignment: readonly Species[],
): Built {
  const layout = computeLayout(width, height, insets);
  const textures = new TextureBag();
  const background = createBackground(layout, textures);
  const fire = createFire(layout, textures, intensity);
  const seats = createSeats(app.renderer, layout, textures, fire.state, sprites, assignment);

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
  const assignment: readonly Species[] = only
    ? SEATS.map(() => only)
    : options.shuffle
      ? shuffled(DEFAULT_ASSIGNMENT, Math.random)
      : DEFAULT_ASSIGNMENT;

  const canvas = app.canvas;
  canvas.style.display = "block";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", options.label);
  host.appendChild(canvas);

  // Phase 1 is static: everyone is already seated, so the fire sits at its seven-person strength.
  const intensity = 0.72 + 0.06 * SEATS.length;
  let reduced = prefersReducedMotion();
  let time = 0;
  let current: Built | undefined;

  const rebuild = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    app.renderer.resize(width, height);
    if (current) {
      app.stage.removeChild(current.root);
      current.root.destroy({ children: true });
      current.seats.destroy();
      current.textures.destroy();
    }
    current = build(app, width, height, insets, intensity, sprites, assignment);
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
    current.fire.update(dt, time, reduced);
    current.background.update(time, reduced, current.fire.state.light);
    current.seats.update(time, reduced);
  });

  let pending = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(rebuild);
  });
  observer.observe(host);

  const stopWatchingMotion = watchReducedMotion((value) => {
    reduced = value;
    rebuild();
  });

  return {
    destroy() {
      cancelAnimationFrame(pending);
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
