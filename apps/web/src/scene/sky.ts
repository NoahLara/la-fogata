import { Container, Graphics, Particle, ParticleContainer, Sprite, Texture } from "pixi.js";
import { verticalGradient } from "./gradient";
import type { Point, SceneLayout } from "./layout";
import { between, easeToward, smoothstep, TAU } from "./math";
import { pick, type Random } from "./random";
import {
  drawShootingStar,
  nextShootingStarDelay,
  planShootingStar,
  type Keepout,
  type ShootingStarPlan,
} from "./shootingStar";
import { ANSWER_TURN_SECONDS, placeStar, starArea, starLook, type Tree } from "./petitionStars";
import { skyGeometry } from "./skyGeometry";
import { createCanvas, type TextureBag } from "./textures";

export interface Sky {
  /** Gradient, Milky Way, stars, moon, Venus and the shooting star. Sits behind everything. */
  container: Container;
  update(time: number, reduced: boolean): void;
  /** Where the star of this petition is, or will be, given the petition stars already in the sky. */
  petitionSpot(id: string): Point;
  /**
   * Puts a petition's star in the sky at its spot. `bloom` is a star born as a light arrives; `fade` a star that
   * fades in (reduced motion); `instant` one that was there all along.
   */
  addPetitionStar(id: string, mode: "bloom" | "fade" | "instant"): void;
  /** Turns a star golden. `turn` does it in front of the viewer; `instant` is for one that was answered before. */
  answerPetitionStar(id: string, mode: "turn" | "instant"): void;
  /** Takes a star out of the sky: it dims away (`dim`) or goes at once. Its place stays reserved so no other star moves. */
  removePetitionStar(id: string, mode: "dim" | "instant"): void;
  /** Where each star is now, by petition id. */
  petitionSpots(): ReadonlyMap<string, Point>;
  /** Dims every petition star a little (a word is over them) or brings them back. */
  dimPetitionStars(dimmed: boolean): void;
  /** A shooting star crosses the sky now. Nothing with reduced motion. */
  shootingStar(): void;
}

/** The petition stars a sky starts with, in the order they became stars. */
export interface SkyPetitions {
  ids: readonly string[];
  /** Golden from the start. */
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

/** The diagonal strip of sky the Milky Way follows. */
interface Band {
  cx: number;
  cy: number;
  /** Unit vector along the band. */
  dx: number;
  dy: number;
  length: number;
  halfWidth: number;
}

function milkyWayBand(width: number, skyHeight: number): Band {
  const from = { x: width * 0.1, y: -skyHeight * 0.05 };
  const to = { x: width * 0.72, y: skyHeight * 1.0 };
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return {
    cx: (from.x + to.x) / 2,
    cy: (from.y + to.y) / 2,
    dx: (to.x - from.x) / length,
    dy: (to.y - from.y) / length,
    length,
    halfWidth: skyHeight * 0.2,
  };
}

/**
 * The Milky Way, baked once: soft haze along the band, with darker dust lanes cut out of it, fading out
 * toward the horizon. Painted in the band's own frame (x along it, y across) and kept faint.
 */
function bakeMilkyWay(
  textures: TextureBag,
  band: Band,
  width: number,
  skyHeight: number,
  rand: Random,
): Texture {
  const resolution = 0.5;
  const { canvas, g } = createCanvas(width, skyHeight, resolution);
  g.translate(band.cx, band.cy);
  g.rotate(Math.atan2(band.dy, band.dx));

  const blob = (x: number, y: number, radius: number, color: string, alpha: number) => {
    const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color},${alpha})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gradient;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };

  // Haze: many faint blobs, thickest along the middle line, with a bright bulge or two along its length.
  g.globalCompositeOperation = "lighter";
  const bulges = [between(rand, -0.3, 0), between(rand, 0.05, 0.3)];
  for (let i = 0; i < 380; i++) {
    const along = between(rand, -0.5, 0.5);
    const across = (rand() + rand() + rand() - 1.5) * band.halfWidth * 1.2;
    const bulge = bulges.reduce((sum, b) => sum + Math.exp(-(((along - b) / 0.14) ** 2)), 0);
    const color = pick(rand, ["150,165,235", "190,200,240", "170,150,220", "225,205,210"]);
    blob(
      along * band.length,
      across,
      between(rand, 0.3, 0.9) * band.halfWidth,
      color,
      between(rand, 0.05, 0.12) * (0.7 + bulge),
    );
  }

  // Dust lanes: long thin dark streaks that wander, taken out of the haze.
  g.globalCompositeOperation = "destination-out";
  for (let lane = 0; lane < 5; lane++) {
    const offset = between(rand, -0.45, 0.45) * band.halfWidth;
    const start = between(rand, -0.45, 0.1) * band.length;
    const reach = between(rand, 0.2, 0.45) * band.length;
    const wobble = between(rand, 0.1, 0.3) * band.halfWidth;
    const phase = rand() * TAU;
    for (let step = 0; step <= 28; step++) {
      const f = step / 28;
      blob(
        start + reach * f,
        offset + Math.sin(f * 5 + phase) * wobble * 0.5,
        between(rand, 0.1, 0.2) * band.halfWidth,
        "0,0,0",
        0.35 * Math.sin(f * Math.PI) + 0.06,
      );
    }
  }

  // Fade out toward the horizon, where the sky is already pale.
  g.setTransform(resolution, 0, 0, resolution, 0, 0);
  g.globalCompositeOperation = "destination-in";
  const fade = g.createLinearGradient(0, 0, 0, skyHeight);
  fade.addColorStop(0, "rgba(0,0,0,.8)");
  fade.addColorStop(0.55, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade;
  g.fillRect(0, 0, width, skyHeight);
  return textures.fromCanvas(canvas, resolution);
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

function buildStars(
  layout: SceneLayout,
  textures: TextureBag,
  rand: Random,
  band: Band,
  skyHeight: number,
  moon: Keepout,
  venus: Keepout,
): Stars {
  const { width, u } = layout;
  const twinklers: Twinkler[] = [];

  const place = (clear: readonly Keepout[], bandShare: number): Point | undefined => {
    for (let attempt = 0; attempt < 24; attempt++) {
      let x = rand() * width;
      let y = rand() * skyHeight;
      if (rand() < bandShare) {
        const along = between(rand, -0.5, 0.5) * band.length;
        const across = (rand() + rand() + rand() - 1.5) * band.halfWidth * 1.1;
        x = band.cx + band.dx * along - band.dy * across;
        y = band.cy + band.dy * along + band.dx * across;
      }
      if (x < 0 || x > width || y < 0 || y > skyHeight) continue;
      if (clear.some((k) => Math.hypot(x - k.x, y - k.y) < k.radius)) continue;
      return { x, y };
    }
    return undefined;
  };

  // Layers 1 and 2: dots in particle containers. The tiny ones are bare pixels, the medium ones soft and round.
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
    bandShare: number,
    clear: readonly Keepout[],
    soft: boolean,
  ): ParticleContainer => {
    const container = new ParticleContainer({
      texture,
      dynamicProperties: { color: true },
    });
    for (let i = 0; i < count; i++) {
      const at = place(clear, bandShare);
      if (!at) continue;
      const size = between(rand, sizes[0], sizes[1]) * Math.max(1, u * 0.8);
      const span = soft ? size * 2.4 : size;
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

  const area = width * skyHeight;
  const nearMoon: Keepout[] = [{ ...moon, radius: moon.radius * 2.6 }, venus];
  const tiny = dotLayer(
    Texture.WHITE,
    Math.round(area / 900),
    [0.7, 1.1],
    [0.3, 0.7],
    0.4,
    [0.25, 1.1],
    0.45,
    nearMoon,
    false,
  );
  const medium = dotLayer(
    dot,
    Math.round(area / 7000),
    [1, 1.5],
    [0.55, 0.9],
    0.32,
    [0.3, 1],
    0.2,
    nearMoon,
    true,
  );

  // Layer 3: a handful of bright stars, each with a tiny four-point glint.
  const bright = new Container();
  const placed: Point[] = [];
  const brightCount = Math.max(5, Math.min(9, Math.round(area / 55000)));
  const spacing = width * 0.09;
  for (let i = 0; i < brightCount; i++) {
    let at: Point | undefined;
    for (let attempt = 0; attempt < 40 && !at; attempt++) {
      const candidate = place(
        [
          { ...moon, radius: moon.radius * 5 },
          { ...venus, radius: venus.radius * 3 },
        ],
        0,
      );
      if (
        candidate &&
        candidate.x > width * 0.2 &&
        candidate.x < width * 0.8 &&
        candidate.y < skyHeight * 0.75 &&
        placed.every((p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) > spacing)
      )
        at = candidate;
    }
    if (!at) continue;
    placed.push(at);
    const tint = starColor(rand);
    const glint = new Sprite(textures.glint());
    glint.anchor.set(0.5);
    glint.position.set(at.x, at.y);
    glint.width = glint.height = between(rand, 13, 21) * Math.max(0.85, u);
    glint.tint = tint;
    glint.blendMode = "add";
    const core = new Sprite(dot);
    core.anchor.set(0.5);
    core.position.set(at.x, at.y);
    core.width = core.height = 6.5 * Math.max(0.85, u);
    core.tint = tint;
    bright.addChild(glint, core);
    twinklers.push({
      alpha: between(rand, 0.75, 1),
      amplitude: 0.22,
      speed: between(rand, 0.25, 0.7),
      phase: rand() * TAU,
      apply: (alpha) => {
        glint.alpha = alpha;
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
const PETITION_WARM = 0xfff1dc;
const PETITION_GLOW = 0xffd9a0;

interface PetitionStar {
  spot: Point;
  glow: Sprite;
  glint: Sprite;
  core: Sprite;
  mode: "bloom" | "fade" | "instant";
  /** When it was born, in scene time; set on the first frame. */
  born: number | undefined;
  phase: number;
  answered: boolean;
  /** When it turned golden in front of the viewer, in scene time; set on the first frame. `undefined` once it has. */
  turning: "pending" | number | undefined;
  /** Dimming away: when that began (`"pending"` until the first frame). */
  leaving: "pending" | number | undefined;
}

/** How long a star takes to dim away when it goes back to the fire. */
const STAR_DIM_SECONDS = 0.7;

export function createSky(
  layout: SceneLayout,
  textures: TextureBag,
  rand: Random,
  petitions: SkyPetitions = { ids: [], answered: new Set(), retired: new Set() },
  trees: readonly Tree[] = [],
): Sky {
  const { width, horizon, u } = layout;
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

  // Moon, and Venus a little below and to its left.
  const { moon: moonZone, venus: venusZone, skyHeight } = skyGeometry(layout);
  const { x: mx, y: my, radius: mr } = moonZone;
  const { x: vx, y: vy } = venusZone;

  const band = milkyWayBand(width, skyHeight);
  const haze = new Sprite(bakeMilkyWay(textures, band, width, skyHeight, rand));
  haze.width = width;
  haze.height = skyHeight;
  haze.alpha = 0.3;
  container.addChild(haze);

  const stars = buildStars(layout, textures, rand, band, skyHeight, moonZone, venusZone);
  container.addChild(...stars.layers);

  const halo = new Sprite(
    textures.radial([
      [0, 1],
      [1, 0],
    ]),
  );
  halo.anchor.set(0.5);
  halo.position.set(mx, my);
  halo.width = halo.height = mr * 14;
  halo.tint = 0xdcd7f0;
  halo.alpha = 0.16;
  container.addChild(halo);

  const moon = new Graphics().circle(mx, my, mr).fill(0xebe5d4);
  for (const [a, b, r] of [
    [-0.3, -0.2, 0.22],
    [0.25, 0.15, 0.16],
    [-0.05, 0.4, 0.12],
  ] as const) {
    moon.circle(mx + a * mr, my + b * mr, r * mr).fill({ color: 0xaaa096, alpha: 0.32 });
  }
  container.addChild(moon);

  // Venus: a steady, slightly warm point with a round glow. A planet doesn't twinkle, so nothing here moves.
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
    glow.position.set(vx, vy);
    glow.width = glow.height = size;
    glow.tint = 0xfff0d8;
    glow.alpha = alpha;
    glow.blendMode = "add";
    container.addChild(glow);
  }
  container.addChild(new Graphics().circle(vx, vy, Math.max(2.4, mr * 0.13)).fill(0xfff8ea));

  // Shooting star: one about every 50 s, never near the moon or Venus, and none with reduced motion.
  const meteor = new Graphics();
  container.addChild(meteor);
  const bounds = { width, top: 10 * u, bottom: skyHeight * 0.62 };
  const keepouts: Keepout[] = [
    { x: mx, y: my, radius: mr * 3 },
    { x: vx, y: vy, radius: mr * 1.7 },
  ];
  let nextAt = -1;
  let active: { plan: ShootingStarPlan; start: number } | undefined;
  /** Asked for from outside (a petition was answered): it starts on the next frame. */
  let requested = false;

  // Petition stars: a bit bigger than the bright stars, warm white, with a soft glow and a gentle pulse.
  const petitionLayer = new Container();
  // Under the shooting star, over the other stars.
  container.addChildAt(petitionLayer, container.getChildIndex(meteor));
  const area = starArea(layout, trees);
  const petitionStars = new Map<string, PetitionStar>();
  /** Where stars that went back to the fire were: nothing is placed on them, so the others keep their spots. */
  const reserved = new Map<string, Point>();
  const glowTexture = textures.radial([
    [0, 1],
    [0.3, 0.4],
    [1, 0],
  ]);
  const spotFor = (id: string): Point =>
    petitionStars.get(id)?.spot ??
    reserved.get(id) ??
    placeStar(id, area, [
      ...[...petitionStars.values()].map((star) => star.spot),
      ...reserved.values(),
    ]);
  const addPetitionStar = (id: string, mode: PetitionStar["mode"]) => {
    if (petitionStars.has(id)) return;
    const spot = spotFor(id);
    const scale = Math.max(0.85, u);
    const glow = new Sprite(glowTexture);
    glow.anchor.set(0.5);
    glow.position.set(spot.x, spot.y);
    glow.width = glow.height = 38 * scale;
    glow.tint = PETITION_GLOW;
    glow.blendMode = "add";
    const glint = new Sprite(textures.glint());
    glint.anchor.set(0.5);
    glint.position.set(spot.x, spot.y);
    glint.width = glint.height = 27 * scale;
    glint.tint = PETITION_WARM;
    glint.blendMode = "add";
    const core = new Sprite(glowTexture);
    core.anchor.set(0.5);
    core.position.set(spot.x, spot.y);
    core.width = core.height = 9 * scale;
    core.tint = PETITION_WARM;
    petitionLayer.addChild(glow, glint, core);
    petitionStars.set(id, {
      spot,
      glow,
      glint,
      core,
      mode,
      born: undefined,
      phase: (spot.x * 0.013 + spot.y * 0.007) % TAU,
      answered: false,
      turning: undefined,
      leaving: undefined,
    });
  };
  const dropStar = (id: string) => {
    const star = petitionStars.get(id);
    if (!star) return;
    star.glow.destroy();
    star.glint.destroy();
    star.core.destroy();
    petitionStars.delete(id);
  };
  const removePetitionStar = (id: string, mode: "dim" | "instant") => {
    const star = petitionStars.get(id);
    if (!star) return;
    reserved.set(id, star.spot);
    if (mode === "instant") dropStar(id);
    else star.leaving ??= "pending";
  };
  for (const id of petitions.ids) {
    if (petitions.retired.has(id)) {
      reserved.set(id, spotFor(id));
      continue;
    }
    addPetitionStar(id, "instant");
    if (petitions.answered.has(id)) {
      const star = petitionStars.get(id);
      if (star) star.answered = true;
    }
  }

  let dimTarget = 1;
  let dimNow = 1;
  let dimTime = 0;
  const updatePetitionStars = (time: number, reduced: boolean) => {
    dimNow = reduced ? dimTarget : easeToward(dimNow, dimTarget, Math.max(0, time - dimTime), 0.35);
    dimTime = time;
    petitionLayer.alpha = dimNow;
    const scale = Math.max(0.85, u);
    for (const [id, star] of [...petitionStars]) {
      star.born ??= time;
      const age = time - star.born;
      if (star.turning === "pending") star.turning = time;
      if (star.leaving === "pending") star.leaving = time;
      const turned =
        typeof star.turning === "number" ? (time - star.turning) / ANSWER_TURN_SECONDS : 1;
      if (turned >= 1) star.turning = undefined;
      const look = starLook(star.answered, time, star.phase, reduced, turned);
      const farewell =
        typeof star.leaving === "number"
          ? 1 - smoothstep(0, STAR_DIM_SECONDS, time - star.leaving)
          : 1;
      if (farewell <= 0) {
        dropStar(id);
        continue;
      }
      star.core.tint = star.glint.tint = look.core;
      star.glow.tint = look.glow;
      const arriving = star.mode === "instant" ? 1 : smoothstep(0, STAR_FADE_SECONDS, age);
      // A soft bloom as the light settles into it, then the glow returns to its size.
      const bloom =
        star.mode === "bloom" && !reduced && age < STAR_BLOOM_SECONDS
          ? Math.sin((Math.PI * age) / STAR_BLOOM_SECONDS)
          : 0;
      const alpha =
        (star.mode === "bloom" && !reduced ? Math.min(1, 0.35 + age * 2) : arriving) * farewell;
      star.core.alpha = Math.min(1, alpha * (look.level + 0.1));
      star.glint.alpha = alpha * look.level;
      star.glow.alpha = alpha * (0.6 * look.level + bloom * 0.45);
      star.glow.scale.set(((38 * scale) / glowTexture.width) * (1 + bloom * 1.6));
    }
  };

  const update = (time: number, reduced: boolean) => {
    for (const star of stars.twinklers) star.apply(reduced ? star.alpha : twinkle(star, time));
    updatePetitionStars(time, reduced);

    if (reduced) {
      if (active) meteor.clear();
      active = undefined;
      requested = false;
      nextAt = -1;
      return;
    }
    if (requested) {
      requested = false;
      const plan = planShootingStar(rand, bounds, keepouts);
      if (plan) {
        active = { plan, start: time };
        // The next ambient one comes after this has had its moment.
        nextAt = Math.max(nextAt, time + 20);
      }
    }
    // The first one comes a little early so nobody waits a full minute to see it.
    if (nextAt < 0) nextAt = time + between(rand, 10, 25);
    if (!active && time >= nextAt) {
      const plan = planShootingStar(rand, bounds, keepouts);
      if (plan) active = { plan, start: time };
      nextAt = time + (plan ? nextShootingStarDelay(rand) : 5);
    }
    if (active) {
      const t = (time - active.start) / active.plan.duration;
      if (t >= 1) {
        meteor.clear();
        active = undefined;
      } else {
        drawShootingStar(meteor, active.plan, t, Math.max(1, u));
      }
    }
  };
  update(0, true);

  return {
    container,
    update,
    petitionSpot: spotFor,
    addPetitionStar,
    answerPetitionStar(id, mode) {
      const star = petitionStars.get(id);
      if (!star || star.answered) return;
      star.answered = true;
      star.turning = mode === "turn" ? "pending" : undefined;
    },
    removePetitionStar,
    petitionSpots: () => new Map([...petitionStars].map(([id, star]) => [id, star.spot])),
    dimPetitionStars(dimmed) {
      dimTarget = dimmed ? DIMMED_STARS : 1;
    },
    shootingStar() {
      requested = true;
    },
  };
}
