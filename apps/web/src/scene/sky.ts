import { Container, Graphics, Particle, ParticleContainer, Sprite, Texture } from "pixi.js";
import { verticalGradient } from "./gradient";
import type { Point, SceneLayout } from "./layout";
import { between, easeToward, smoothstep, TAU } from "./math";
import { placeOtherStar, type OtherStar } from "./otherStars";
import {
  PANORAMA_VIEWPORTS,
  screenX,
  sectionLeft,
  sectionOf,
  visibleSections,
  wrap,
} from "./panorama";
import { createRandom, pick, type Random } from "./random";
import {
  drawShootingStar,
  nextShootingStarDelay,
  planShootingStar,
  planShootingStarFrom,
  type Keepout,
  type ShootingStarPlan,
} from "./shootingStar";
import {
  CONSTELLATION_ALPHA,
  clearanceAbovePines,
  clusterArea,
  clusterExclusion,
  constellationCenter,
  constellationLines,
  placeClusterStar,
  type ConstellationStar,
} from "./constellation";
import {
  ANSWER_TURN_SECONDS,
  backgroundScale,
  hashId,
  pulseLevel,
  MY_AURA,
  STAR_STYLE,
  starSizes,
  starArea,
  starLook,
  type Tree,
} from "./petitionStars";
import { skyGeometry } from "./skyGeometry";
import type { TextureBag } from "./textures";

export interface Sky {
  /** Gradient, Milky Way, stars, moon and the shooting star. Sits behind everything. */
  container: Container;
  update(time: number, reduced: boolean): void;
  /** Turns the panorama so `offset` pixels of it have gone off the left edge. Only the sections in view are drawn. */
  setOffset(offset: number): void;
  /** Where the star of this petition is on screen now, or will be, given the petition stars already in the sky. */
  petitionSpot(id: string): Point;
  /** Where that star is in the panorama, which doesn't change as the sky turns. */
  petitionAnchor(id: string): Point;
  /** Where each star is in the panorama, by petition id. */
  petitionAnchors(): ReadonlyMap<string, Point>;
  /**
   * The x, in the panorama, of the middle of the visitor's constellation, Venus included: where the sky is turned so it
   * sits in the middle of the screen. `withId` counts a star that isn't in the sky yet (one about to be born).
   */
  constellationCenter(withId?: string): number;
  /**
   * Puts a petition's star in the sky at its spot. `bloom` is a star born as a light arrives; `fade` a star that
   * fades in (reduced motion); `instant` one that was there all along.
   */
  addPetitionStar(id: string, mode: "bloom" | "fade" | "instant"): void;
  /** Makes a star answered, so it twinkles. `turn` does it in front of the viewer; `instant` is for one that was answered before. */
  answerPetitionStar(id: string, mode: "turn" | "instant"): void;
  /** Takes a star out of the sky: it dims away (`dim`) or goes at once. Its place stays taken so no other star moves. */
  removePetitionStar(id: string, mode: "dim" | "instant"): void;
  /** Where each star is on screen now, by petition id: off screen for one in a part of the panorama that is turned away. */
  petitionSpots(): ReadonlyMap<string, Point>;
  /** Dims every petition star a little (a word is over them) or brings them back. */
  dimPetitionStars(dimmed: boolean): void;
  /**
   * The stars of other people's petitions: these and no others are in the sky across the whole panorama. Each keeps
   * its spot (set from its id) while it is listed; one no longer listed goes at once, and one that has become
   * answered starts to twinkle. A petition with no room for a star is left out.
   */
  setOtherStars(stars: readonly { id: string; answered: boolean }[]): void;
  /** One soft pulse of light in this star, yours or another's (its size never changes). */
  pulseStar(id: string): void;
  /**
   * A shooting star crosses the sky now: from the middle of a light that has just arrived (`from`), or anywhere.
   * Nothing with reduced motion. `onDone` is called when it has crossed and gone (at once if there is none to see).
   */
  shootingStar(from?: Point, onDone?: () => void): void;
}

export interface SkyOptions {
  /** How far the panorama is turned, in pixels. */
  offset: number;
  /** The stars of other people's petitions, to start with. */
  others: readonly { id: string; answered: boolean }[];
}

/** The petition stars a sky starts with, in the order they became stars. */
export interface SkyPetitions {
  ids: readonly string[];
  /** Answered from the start, so they twinkle. */
  answered: ReadonlySet<string>;
  /** Returned to the fire: they only keep their place so the other stars stay where they were. */
  retired: ReadonlySet<string>;
}

/** Star colors: mostly blue-white and white, a few warm. */
const BLUE_WHITE = [0xbcd0ff, 0xcfdcff, 0xdce6ff] as const;
const WHITE = [0xffffff, 0xf4f4ff] as const;
const WARM = [0xffe0b0, 0xffd2a0, 0xffeccc] as const;

function starColor(rand: Random): number {
  const roll = rand();
  if (roll < 0.42) return pick(rand, BLUE_WHITE);
  if (roll < 0.86) return pick(rand, WHITE);
  return pick(rand, WARM);
}

/** Something that twinkles: it holds a base alpha and dims from it slowly. */
interface Twinkler {
  alpha: number;
  /** How far it dims, as a share of `alpha`. */
  amplitude: number;
  /** Radians per second. */
  speed: number;
  phase: number;
  apply(alpha: number): void;
}

interface Stars {
  layers: Container[];
  twinklers: Twinkler[];
}

/** The background stars of one section of the panorama, `sectionWidth` wide: plain small dots, scattered evenly. */
function buildSectionStars(
  layout: SceneLayout,
  textures: TextureBag,
  rand: Random,
  sectionWidth: number,
  skyHeight: number,
): Stars {
  const { u } = layout;
  const twinklers: Twinkler[] = [];

  /** A spot in the section, in its own coordinates. */
  const place = (from = 0, to = 1): Point => ({
    x: between(rand, from, to) * sectionWidth,
    y: rand() * skyHeight,
  });

  // Layers 1 and 2: small dots in particle containers. The tiny ones are bare pixels, the medium ones round.
  const dot = textures.radial([
    [0, 1],
    [0.45, 0.7],
    [1, 0],
  ]);
  const dotLayer = (
    texture: Texture,
    count: number,
    sizes: readonly [number, number],
    brightness: readonly [number, number],
    amplitude: number,
    speeds: readonly [number, number],
  ): ParticleContainer => {
    const container = new ParticleContainer({
      texture,
      dynamicProperties: { color: true },
    });
    for (let i = 0; i < count; i++) {
      const at = place();
      // Never more than 1.5 px across: the stars that matter must stand out.
      const size = between(rand, sizes[0], sizes[1]) * backgroundScale(u);
      const span = size;
      const particle = new Particle({
        texture,
        x: at.x - span / 2,
        y: at.y - span / 2,
        scaleX: span / texture.width,
        scaleY: span / texture.height,
        tint: starColor(rand),
      });
      container.addParticle(particle);
      twinklers.push({
        alpha: between(rand, brightness[0], brightness[1]),
        amplitude,
        speed: between(rand, speeds[0], speeds[1]),
        phase: rand() * TAU,
        apply: (alpha) => {
          particle.alpha = alpha;
        },
      });
    }
    return container;
  };

  const area = sectionWidth * skyHeight;
  const tiny = dotLayer(
    Texture.WHITE,
    Math.round(area / 900),
    [0.7, 1.1],
    [0.3, 0.7],
    0.4,
    [0.25, 1.1],
  );
  const medium = dotLayer(dot, Math.round(area / 7000), [1, 1.5], [0.55, 0.9], 0.32, [0.3, 1]);

  // Layer 3: a handful of brighter dots.
  const bright = new Container();
  const placed: Point[] = [];
  const brightCount = Math.max(5, Math.min(9, Math.round(area / 55000)));
  const spacing = sectionWidth * 0.09;
  for (let i = 0; i < brightCount; i++) {
    let at: Point | undefined;
    for (let attempt = 0; attempt < 40 && !at; attempt++) {
      // Away from the section's ends, so two neighbours' bright stars never crowd each other.
      const candidate = place(0.15, 0.85);
      if (
        candidate.y < skyHeight * 0.75 &&
        placed.every((p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) > spacing)
      )
        at = candidate;
    }
    if (!at) continue;
    placed.push(at);
    // A plain round dot: nothing in the background gets a flare, so the stars that matter stand out.
    const core = new Sprite(dot);
    core.anchor.set(0.5);
    core.position.set(at.x, at.y);
    core.width = core.height = between(rand, 1.2, 1.5) * backgroundScale(u);
    core.tint = starColor(rand);
    bright.addChild(core);
    twinklers.push({
      alpha: between(rand, 0.75, 1),
      amplitude: 0.22,
      speed: between(rand, 0.25, 0.7),
      phase: rand() * TAU,
      apply: (alpha) => {
        core.alpha = Math.min(1, alpha + 0.1);
      },
    });
  }
  return { layers: [tiny, medium, bright], twinklers };
}

function twinkle(star: Twinkler, time: number): number {
  const wave =
    0.7 * Math.sin(time * star.speed + star.phase) +
    0.3 * Math.sin(time * star.speed * 0.43 + star.phase * 1.7);
  return star.alpha * (1 - star.amplitude * (0.5 - 0.5 * wave));
}

/** How bright the petition stars stay while a word is over them. */
const DIMMED_STARS = 0.35;

/** How long a petition star takes to fade in, and how long its bloom lasts. */
const STAR_FADE_SECONDS = 1.5;
const STAR_BLOOM_SECONDS = 1.5;

interface PetitionStar {
  /** Where it is in the panorama. */
  spot: Point;
  /** The soft glow that says it is the visitor's. */
  aura: Sprite;
  glow: Sprite;
  core: Sprite;
  mode: "bloom" | "fade" | "instant";
  /** When it was born, in scene time; set on the first frame. */
  born: number | undefined;
  phase: number;
  answered: boolean;
  /** When it became answered in front of the viewer, in scene time; set on the first frame. `undefined` once it has. */
  turning: "pending" | number | undefined;
  /** Dimming away: when that began (`"pending"` until the first frame). */
  leaving: "pending" | number | undefined;
  /** When its soft pulse began (`"pending"` until the first frame). */
  pulse: "pending" | number | undefined;
}

/** How long a star takes to dim away when it goes back to the fire. */
const STAR_DIM_SECONDS = 0.7;

/** A star of someone else's petition: the same as yours in every state, without the aura. */
interface OtherStarSprites {
  star: OtherStar;
  section: Section;
  glow: Sprite;
  core: Sprite;
  /** When its soft pulse began (`"pending"` until the first frame). */
  pulse: "pending" | number | undefined;
  /** When it became answered in front of the viewer, in scene time. */
  turning: "pending" | number | undefined;
}

/** One viewport-wide slice of the panorama, drawn only while it is on screen. */
interface Section {
  index: number;
  /** Where it starts in the panorama. */
  left: number;
  container: Container;
  twinklers: Twinkler[];
  others: OtherStarSprites[];
  visible: boolean;
}

/** Sections within this many pixels of the screen are still drawn, so a glow at an edge isn't cut off. */
const SECTION_PAD = 48;

export function createSky(
  layout: SceneLayout,
  textures: TextureBag,
  rand: Random,
  petitions: SkyPetitions = { ids: [], answered: new Set(), retired: new Set() },
  trees: readonly Tree[] = [],
  options: SkyOptions = { offset: 0, others: [] },
): Sky {
  const { width, horizon, u } = layout;
  /** The sky is a panorama this wide, drawn in sections as wide as the screen. */
  const panorama = width * PANORAMA_VIEWPORTS;
  const container = new Container();
  container.addChild(
    new Graphics().rect(0, 0, width, horizon + 4).fill(
      verticalGradient([
        [0, "#05060f"],
        [0.6, "#0d1027"],
        [1, "#1b1d3a"],
      ]),
    ),
  );

  // The moon and Venus hang in the panorama and turn with it. Venus is where the visitor's constellation begins.
  const { moon: moonZone, skyHeight } = skyGeometry(layout);
  const { x: mx, y: my, radius: mr } = moonZone;
  const cluster = clusterArea(layout, trees);
  const { x: vx, y: vy } = cluster.venus;
  /** What hangs in the panorama over the stars: where it is, how far its glow reaches, and what draws it. */
  const bodies: { x: number; reach: number; body: Container }[] = [];

  // The panorama: its stars and the petition stars, in sections that move together.
  const sections: Section[] = [];
  for (let index = 0; index < PANORAMA_VIEWPORTS; index++) {
    const left = index * width;
    const section: Section = {
      index,
      left,
      container: new Container(),
      twinklers: [],
      others: [],
      visible: true,
    };
    const stars = buildSectionStars(layout, textures, rand, width, skyHeight);
    section.container.addChild(...stars.layers);
    section.twinklers = stars.twinklers;
    sections.push(section);
  }
  container.addChild(...sections.map((section) => section.container));

  let offset = wrap(options.offset, panorama);
  const setOffset = (value: number) => {
    offset = wrap(value, panorama);
    const shown = new Set(visibleSections(offset, panorama, width, SECTION_PAD));
    for (const section of sections) {
      section.container.x = sectionLeft(section.index, offset, panorama, width);
      section.visible = shown.has(section.index);
      section.container.visible = section.visible;
    }
    for (const { x, reach, body } of bodies) {
      body.x = screenX(x, offset, panorama, width);
      body.visible = body.x > -reach && body.x < width + reach;
    }
  };
  const toScreen = (spot: Point): Point => ({
    x: screenX(spot.x, offset, panorama, width),
    y: spot.y,
  });
  const sectionAt = (x: number): Section => sections[sectionOf(x, panorama)] as Section;

  // The moon hangs over the stars. Each body is drawn around its own origin and moved with the sky.
  const moonBody = new Container();
  moonBody.y = my;
  const halo = new Sprite(
    textures.radial([
      [0, 1],
      [1, 0],
    ]),
  );
  halo.anchor.set(0.5);
  halo.width = halo.height = mr * 14;
  halo.tint = 0xdcd7f0;
  halo.alpha = 0.16;
  moonBody.addChild(halo);
  const moon = new Graphics().circle(0, 0, mr).fill(0xebe5d4);
  for (const [a, b, r] of [
    [-0.3, -0.2, 0.22],
    [0.25, 0.15, 0.16],
    [-0.05, 0.4, 0.12],
  ] as const) {
    moon.circle(a * mr, b * mr, r * mr).fill({ color: 0xaaa096, alpha: 0.32 });
  }
  moonBody.addChild(moon);
  bodies.push({ x: mx, reach: mr * 7, body: moonBody });

  // Venus: a steady, slightly warm point with a round glow. A planet doesn't twinkle, so nothing here moves.
  const venusBody = new Container();
  venusBody.y = vy;
  const soft = textures.radial([
    [0, 1],
    [0.35, 0.45],
    [1, 0],
  ]);
  for (const [size, alpha] of [
    [mr * 7, 0.1],
    [mr * 2.6, 0.38],
  ] as const) {
    const glow = new Sprite(soft);
    glow.anchor.set(0.5);
    glow.width = glow.height = size;
    glow.tint = 0xfff0d8;
    glow.alpha = alpha;
    glow.blendMode = "add";
    venusBody.addChild(glow);
  }
  venusBody.addChild(new Graphics().circle(0, 0, Math.max(2.4, mr * 0.13)).fill(0xfff8ea));
  bodies.push({ x: vx, reach: mr * 3.5, body: venusBody });
  container.addChild(moonBody, venusBody);

  // Shooting star: one about every 50 s, never near the moon or Venus, and none with reduced motion.
  const meteor = new Graphics();
  container.addChild(meteor);
  const bounds = { width, top: 10 * u, bottom: skyHeight * 0.62 };
  /** Where the moon and Venus are on screen now: the shooting star keeps clear of them. */
  const keepoutsNow = (): Keepout[] => [
    { x: screenX(mx, offset, panorama, width), y: my, radius: mr * 3 },
    { x: screenX(vx, offset, panorama, width), y: vy, radius: mr * 1.7 },
  ];
  let nextAt = -1;
  let active: { plan: ShootingStarPlan; start: number; onDone?: () => void } | undefined;
  /** Asked for from outside (a petition was answered, a burden has burned): it starts on the next frame. */
  let requested: { from?: Point; onDone?: () => void } | undefined;

  // Petition stars: small and white, a core with a tight soft halo, steady; an answered one is the same star, twinkling.
  const area = starArea(layout, trees);
  const petitionStars = new Map<string, PetitionStar>();
  // Where the visitor's stars go: a compact cluster, each new star near an earlier one, in the order they were made.
  // A star that went back to the fire keeps its place in the list, so the others never move.
  const placements: (ConstellationStar & { index: number })[] = [];
  const placementOf = (id: string) => placements.find((entry) => entry.id === id);
  /** The spot of this petition's star, which is only settled once it has been added (a star that isn't there yet is previewed). */
  const spotFor = (id: string): Point =>
    placementOf(id)?.spot ?? placeClusterStar(id, placements.length, cluster, placements).spot;
  const commitPlacement = (id: string) => {
    if (placementOf(id)) return;
    const placed = placeClusterStar(id, placements.length, cluster, placements);
    placements.push({ id, index: placements.length, ...placed });
  };
  // The halo is tight and soft; the core is a small, crisp round dot.
  const glowTexture = textures.radial([
    [0, 1],
    [0.3, 0.4],
    [1, 0],
  ]);
  const coreTexture = textures.radial([
    [0, 1],
    [0.6, 1],
    [1, 0],
  ]);

  // Stars of other people's petitions: the same look as yours (a waiting one is white and steady, an answered one twinkles)
  // but with no aura, and each one a real petition that can be tapped. They are across the whole panorama and never within
  // a margin of your cluster or Venus, so a star with no line is never one of yours.
  const otherSprites = new Map<string, OtherStarSprites>();
  const otherSpec = {
    width: panorama,
    top: area.top,
    bottom: area.bottom,
    spacing: area.minDistance * 0.5,
    exclude: clusterExclusion(cluster),
    keepouts: cluster.keepouts,
    // Above the real pine silhouette with a margin, like yours: none among the trees. The pines are laid out for one
    // screen, so a star is checked against them at its place on the screen of its own section.
    isClear: (spot: Point) =>
      clearanceAbovePines(cluster, { x: wrap(spot.x, width), y: spot.y }) >= cluster.treeMargin,
  };
  const dropOther = (id: string) => {
    const other = otherSprites.get(id);
    if (!other) return;
    other.glow.destroy();
    other.core.destroy();
    other.section.others.splice(other.section.others.indexOf(other), 1);
    otherSprites.delete(id);
  };
  const setOtherStars = (list: readonly { id: string; answered: boolean }[]) => {
    const wanted = new Map(list.map((entry) => [entry.id, entry.answered]));
    for (const id of [...otherSprites.keys()]) if (!wanted.has(id)) dropOther(id);
    // In a fixed order, so the same petitions get the same spots after the scene is laid out again.
    const fresh = list
      .filter((entry) => !otherSprites.has(entry.id))
      .sort((a, b) => hashId(a.id) - hashId(b.id) || (a.id < b.id ? -1 : 1));
    for (const [id, answered] of wanted) {
      const other = otherSprites.get(id);
      if (other && answered && !other.star.answered) {
        other.star.answered = true;
        other.turning = "pending";
      }
    }
    for (const entry of fresh) {
      const taken = [...otherSprites.values()].map(({ star }) => star);
      const spot = placeOtherStar(otherSpec, taken, createRandom(hashId(entry.id)));
      if (!spot) continue;
      const star: OtherStar = { id: entry.id, ...spot, answered: entry.answered };
      const section = sectionAt(star.x);
      const at = { x: star.x - section.left, y: star.y };
      const glow = new Sprite(glowTexture);
      glow.anchor.set(0.5);
      glow.position.set(at.x, at.y);
      glow.width = glow.height = starSizes("waiting", false, u).halo;
      glow.blendMode = "add";
      const core = new Sprite(coreTexture);
      core.anchor.set(0.5);
      core.position.set(at.x, at.y);
      core.width = core.height = starSizes("waiting", false, u).core;
      section.container.addChild(glow, core);
      const sprites: OtherStarSprites = {
        star,
        section,
        glow,
        core,
        pulse: undefined,
        turning: undefined,
      };
      section.others.push(sprites);
      otherSprites.set(star.id, sprites);
    }
  };

  // Your constellation: thin gold lines join each star to the nearest one before it. They live in the first section,
  // where your stars are placed. Faint always: they are what tells your stars from other people's.
  let linesChanged = true;
  const constellation = new Graphics();
  sections[0]?.container.addChild(constellation);
  const drawConstellation = () => {
    linesChanged = false;
    constellation.clear();
    const left = sections[0]?.left ?? 0;
    const lines = constellationLines(placements, new Set(petitionStars.keys()));
    for (const [from, to] of lines) {
      constellation.moveTo(from.x - left, from.y).lineTo(to.x - left, to.y);
    }
    constellation.stroke({ width: 1, color: 0xf2c45a, alpha: 1 });
  };

  const addPetitionStar = (id: string, mode: PetitionStar["mode"]) => {
    if (petitionStars.has(id)) return;
    commitPlacement(id);
    const spot = spotFor(id);
    const at = { x: spot.x - sectionAt(spot.x).left, y: spot.y };
    // The soft aura that says this star is yours.
    const aura = new Sprite(glowTexture);
    aura.anchor.set(0.5);
    aura.position.set(at.x, at.y);
    aura.width = aura.height = starSizes("waiting", true, u).aura;
    aura.blendMode = "add";
    const glow = new Sprite(glowTexture);
    glow.anchor.set(0.5);
    glow.position.set(at.x, at.y);
    glow.width = glow.height = starSizes("waiting", true, u).halo;
    glow.tint = STAR_STYLE.waiting.glow;
    glow.blendMode = "add";
    const core = new Sprite(coreTexture);
    core.anchor.set(0.5);
    core.position.set(at.x, at.y);
    core.width = core.height = starSizes("waiting", true, u).core;
    core.tint = STAR_STYLE.waiting.core;
    sectionAt(spot.x).container.addChild(aura, glow, core);
    linesChanged = true;
    petitionStars.set(id, {
      spot,
      aura,
      glow,
      core,
      mode,
      born: undefined,
      phase: (spot.x * 0.013 + spot.y * 0.007) % TAU,
      answered: false,
      turning: undefined,
      leaving: undefined,
      pulse: undefined,
    });
  };
  const dropStar = (id: string) => {
    const star = petitionStars.get(id);
    if (!star) return;
    star.aura.destroy();
    star.glow.destroy();
    star.core.destroy();
    petitionStars.delete(id);
    linesChanged = true;
  };
  const removePetitionStar = (id: string, mode: "dim" | "instant") => {
    const star = petitionStars.get(id);
    if (!star) return;
    if (mode === "instant") dropStar(id);
    else star.leaving ??= "pending";
  };
  for (const id of petitions.ids) {
    if (petitions.retired.has(id)) {
      commitPlacement(id);
      continue;
    }
    addPetitionStar(id, "instant");
    if (petitions.answered.has(id)) {
      const star = petitionStars.get(id);
      if (star) star.answered = true;
    }
  }
  setOtherStars(options.others);
  setOffset(offset);

  let dimTarget = 1;
  let dimNow = 1;
  let dimTime = 0;
  const updatePetitionStars = (time: number, reduced: boolean) => {
    dimNow = reduced ? dimTarget : easeToward(dimNow, dimTarget, Math.max(0, time - dimTime), 0.35);
    dimTime = time;
    if (linesChanged) drawConstellation();
    constellation.alpha = CONSTELLATION_ALPHA * dimNow;
    for (const [id, star] of [...petitionStars]) {
      star.born ??= time;
      const age = time - star.born;
      if (star.turning === "pending") star.turning = time;
      if (star.leaving === "pending") star.leaving = time;
      if (star.pulse === "pending") star.pulse = time;
      const pulse = typeof star.pulse === "number" ? pulseLevel(time - star.pulse, reduced) : 0;
      if (typeof star.pulse === "number" && time - star.pulse > 2) star.pulse = undefined;
      const turned =
        typeof star.turning === "number" ? (time - star.turning) / ANSWER_TURN_SECONDS : 1;
      if (turned >= 1) star.turning = undefined;
      const look = starLook(
        star.answered ? "answered" : "waiting",
        time,
        star.phase,
        reduced,
        turned,
        true,
      );
      const farewell =
        typeof star.leaving === "number"
          ? 1 - smoothstep(0, STAR_DIM_SECONDS, time - star.leaving)
          : 1;
      if (farewell <= 0) {
        dropStar(id);
        continue;
      }
      star.core.tint = look.core;
      star.glow.tint = look.glow;
      const arriving = star.mode === "instant" ? 1 : smoothstep(0, STAR_FADE_SECONDS, age);
      // A soft bloom as the light settles into it, then the glow returns to its size.
      const bloom =
        star.mode === "bloom" && !reduced && age < STAR_BLOOM_SECONDS
          ? Math.sin((Math.PI * age) / STAR_BLOOM_SECONDS)
          : 0;
      const alpha =
        (star.mode === "bloom" && !reduced ? Math.min(1, 0.35 + age * 2) : arriving) *
        farewell *
        dimNow;
      star.core.alpha = Math.min(1, alpha * (look.level + 0.1 + pulse * 0.25));
      star.aura.alpha = alpha * look.aura * MY_AURA.alpha;
      // The halo of an answered star is brighter as it swells, so its breathing reads.
      star.glow.alpha = Math.min(
        1,
        alpha * (0.4 * look.level * look.scale + bloom * 0.45 + pulse * 0.5),
      );
      star.glow.scale.set(
        (starSizes("waiting", true, u).halo / glowTexture.width) * (1 + bloom * 1.6) * look.scale,
      );
    }
  };

  const update = (time: number, reduced: boolean) => {
    // Only what is on screen changes: the sections turned away are left as they are.
    for (const section of sections) {
      if (!section.visible) continue;
      for (const star of section.twinklers) star.apply(reduced ? star.alpha : twinkle(star, time));
      for (const other of section.others) {
        if (other.pulse === "pending") other.pulse = time;
        const pulse = typeof other.pulse === "number" ? pulseLevel(time - other.pulse, reduced) : 0;
        if (typeof other.pulse === "number" && time - other.pulse > 2) other.pulse = undefined;
        if (other.turning === "pending") other.turning = time;
        const turned =
          typeof other.turning === "number" ? (time - other.turning) / ANSWER_TURN_SECONDS : 1;
        if (turned >= 1) other.turning = undefined;
        // The same look as one of yours in the same state.
        const look = starLook(
          other.star.answered ? "answered" : "waiting",
          time,
          other.star.phase,
          reduced,
          Math.min(1, turned),
        );
        other.core.tint = look.core;
        other.glow.tint = look.glow;
        other.core.alpha = Math.min(1, (look.level + 0.1 + pulse * 0.25) * dimNow);
        other.glow.alpha = Math.min(1, (0.4 * look.level * look.scale + pulse * 0.5) * dimNow);
        other.glow.scale.set(
          (starSizes("waiting", false, u).halo / glowTexture.width) * look.scale,
        );
      }
    }
    updatePetitionStars(time, reduced);

    if (reduced) {
      if (active) meteor.clear();
      // Nothing is shown, so whoever was waiting for it to end doesn't wait.
      const waiting = [active?.onDone, requested?.onDone];
      active = undefined;
      requested = undefined;
      nextAt = -1;
      for (const done of waiting) done?.();
      return;
    }
    if (requested) {
      const { from, onDone } = requested;
      requested = undefined;
      const plan =
        (from && planShootingStarFrom(rand, from, bounds, keepoutsNow())) ||
        planShootingStar(rand, bounds, keepoutsNow());
      if (plan) {
        active = { plan, start: time, onDone };
        // The next ambient one comes after this has had its moment.
        nextAt = Math.max(nextAt, time + 20);
      } else {
        onDone?.();
      }
    }
    // The first one comes a little early so nobody waits a full minute to see it.
    if (nextAt < 0) nextAt = time + between(rand, 10, 25);
    if (!active && time >= nextAt) {
      const plan = planShootingStar(rand, bounds, keepoutsNow());
      if (plan) active = { plan, start: time };
      nextAt = time + (plan ? nextShootingStarDelay(rand) : 5);
    }
    if (active) {
      const t = (time - active.start) / active.plan.duration;
      if (t >= 1) {
        meteor.clear();
        const done = active.onDone;
        active = undefined;
        done?.();
      } else {
        drawShootingStar(meteor, active.plan, t, Math.max(1, u));
      }
    }
  };
  update(0, true);

  return {
    container,
    update,
    setOffset,
    petitionSpot: (id) => toScreen(spotFor(id)),
    petitionAnchor: spotFor,
    constellationCenter: (withId) => {
      const spots = [...petitionStars.values()].map((star) => star.spot);
      if (withId && !petitionStars.has(withId)) spots.push(spotFor(withId));
      return constellationCenter(cluster, spots);
    },
    petitionAnchors: () =>
      new Map<string, Point>([
        ...[...petitionStars].map(([id, star]): [string, Point] => [id, star.spot]),
        ...[...otherSprites].map(([id, other]): [string, Point] => [id, other.star]),
      ]),
    addPetitionStar,
    answerPetitionStar(id, mode) {
      const star = petitionStars.get(id);
      if (!star || star.answered) return;
      star.answered = true;
      star.turning = mode === "turn" ? "pending" : undefined;
    },
    removePetitionStar,
    petitionSpots: () =>
      new Map<string, Point>([
        ...[...petitionStars].map(([id, star]): [string, Point] => [id, toScreen(star.spot)]),
        ...[...otherSprites].map(([id, other]): [string, Point] => [id, toScreen(other.star)]),
      ]),
    setOtherStars,
    pulseStar(id) {
      const own = petitionStars.get(id);
      if (own) own.pulse = "pending";
      const other = otherSprites.get(id);
      if (other) other.pulse = "pending";
    },
    dimPetitionStars(dimmed) {
      dimTarget = dimmed ? DIMMED_STARS : 1;
    },
    shootingStar(from, onDone) {
      requested = { from, onDone };
    },
  };
}
