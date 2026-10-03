import type { SceneLayout } from "./layout";
import { clamp } from "./math";
import type { Keepout } from "./shootingStar";
import { skyGeometry } from "./skyGeometry";

/** A pine as the scene draws it: `top` is the y of its tip and it widens to `width` about nine tenths of the way down. */
export interface Tree {
  x: number;
  top: number;
  height: number;
  width: number;
}

/** Where a petition star may sit, and how it must keep from the moon, the pines and the stars already there. */
export interface StarArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
  keepouts: readonly Keepout[];
  /** The closest two petition stars may be. */
  minDistance: number;
  trees: readonly Tree[];
  /** How far above a pine a star must stay. */
  treeMargin: number;
}

/** The y where the pines begin at `x`: the highest outline of any pine there, or `Infinity` where there is none. */
export function treeLineAt(trees: readonly Tree[], x: number): number {
  let line = Infinity;
  for (const tree of trees) {
    const reach = Math.abs(x - tree.x);
    if (reach > tree.width / 2) continue;
    // A pine is a triangle: its outline falls from the tip to the widest tier.
    line = Math.min(line, tree.top + reach * ((0.9 * tree.height) / (tree.width / 2)));
  }
  return line;
}

/**
 * The upper sky: away from the screen edges, and clear of the moon (with its halo) and the real outline of
 * the pines, which `trees` describes: a spot must be a margin above the pine at its own x, wherever the trees are
 * tall or short.
 */
export function starArea(layout: SceneLayout, trees: readonly Tree[] = []): StarArea {
  const { width, u, sceneTop } = layout;
  const { moon, skyHeight } = skyGeometry(layout);
  const top = Math.max(sceneTop + 14 * u, skyHeight * 0.08);
  return {
    left: width * 0.08,
    right: width * 0.92,
    top,
    bottom: Math.max(top + skyHeight * 0.3, skyHeight * 0.8),
    keepouts: [{ ...moon, radius: moon.radius * 3.2 }],
    minDistance: Math.max(26, 56 * u),
    trees,
    treeMargin: Math.max(12, 22 * u),
  };
}

/** A stable number from text (FNV-1a), so the same petition always seeds the same random stream. */
export function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The three kinds of star in the sky, from the quietest to the loudest. */
export type StarKind = "background" | "waiting" | "answered";

/**
 * What each kind looks like. Every petition star, yours and other people's, waiting or answered, is the same size and
 * white: a core of about 2.8 px with a tight, soft halo (about 8 px in radius, at a low alpha). A waiting star is
 * steady; an answered one is exactly the same star, only it twinkles (and holds still with reduced motion). No
 * crosses, no spikes. A petition star still reads clearly bigger than a background dot (1.5 px or less). Yours also
 * have a soft aura (`MY_AURA`) that the others' don't. Sizes are diameters in px before the screen's scale
 * (`starScale`, `backgroundScale`); 0 means there is none.
 */
export const STAR_STYLE = {
  background: { core: 0xffffff, glow: 0xffffff, coreSize: 1.5, glowSize: 0 },
  waiting: { core: 0xffffff, glow: 0xffffff, coreSize: 2.8, glowSize: 16 },
  answered: { core: 0xffffff, glow: 0xffffff, coreSize: 2.8, glowSize: 16 },
} as const satisfies Record<
  StarKind,
  { core: number; glow: number; coreSize: number; glowSize: number }
>;

/**
 * The soft aura that identifies your own stars: a white glow about 22 px in radius (44 px across), clearly visible
 * but smaller and dimmer than Venus's glow. Other people's stars have none.
 */
export const MY_AURA = { size: 44, alpha: 0.22 } as const;

/** The sizes of a petition star on a screen with layout scale `u`, in px across: the same whoever's it is and waiting or answered. */
export function starSizes(
  kind: "waiting" | "answered",
  mine: boolean,
  u: number,
): { core: number; halo: number; aura: number } {
  const style = STAR_STYLE[kind];
  const scale = starScale(u);
  return {
    core: style.coreSize * scale,
    halo: style.glowSize * scale,
    aura: mine ? MY_AURA.size * scale : 0,
  };
}

/**
 * How much to scale the sizes above on a screen with layout scale `u`, so stars look the same on a phone and on a
 * wide screen: a petition star between 0.85 and 1.25 times its size, a background dot never more than its size.
 */
export const starScale = (u: number): number => clamp(u, 0.85, 1.25);
export const backgroundScale = (u: number): number => clamp(u * 0.8, 0.8, 1);

/** How bright a waiting petition star is, steady; an answered one twinkles around this, between `TWINKLE_LOW` and 1. */
export const WAITING_LEVEL = 0.95;
export const TWINKLE_LOW = 0.35;
/** How much an answered star's halo breathes with its twinkle, as a share of its size either side. */
export const TWINKLE_BREATH = 0.28;

/** How long a star takes to start twinkling when it is answered in front of you. */
export const ANSWER_TURN_SECONDS = 1.2;

export interface StarLook {
  core: number;
  glow: number;
  /** How bright the star is right now, around 1. */
  level: number;
  /** How big its halo is right now, as a share of its size: 1, except that an answered star's breathes with its twinkle. */
  scale: number;
  /** How strong the soft aura of the visitor's own stars is: 0 for anyone else's. */
  aura: number;
}

/**
 * How a star looks at `time` (`phase` keeps stars out of step with each other). A background star twinkles softly. A
 * waiting petition star is steady: the same at any time. An answered one is exactly a waiting one that twinkles; with
 * reduced motion it holds still, like a waiting one. Mine and other people's are alike, but mine (`mine`) also have
 * the soft aura. `turned` (0 to 1) eases the twinkle in for a star that was just answered; one that was already
 * answered is at 1.
 */
export function starLook(
  kind: StarKind,
  time: number,
  phase: number,
  reduced: boolean,
  turned = 1,
  mine = false,
): StarLook {
  const style = STAR_STYLE[kind];
  switch (kind) {
    case "background":
      return {
        core: style.core,
        glow: style.glow,
        level: reduced ? 0.65 : 0.65 + 0.2 * Math.sin(time * 1.1 + phase),
        scale: 1,
        aura: 0,
      };
    case "waiting":
      return {
        core: style.core,
        glow: style.glow,
        level: WAITING_LEVEL,
        scale: 1,
        aura: mine ? 1 : 0,
      };
    case "answered": {
      const t = clamp(turned, 0, 1);
      const wave = 0.7 * Math.sin(time * 2.1 + phase) + 0.3 * Math.sin(time * 7.2 + phase * 1.7);
      // The same star as a waiting one that twinkles: its brightness moves between `TWINKLE_LOW` and 1. With reduced
      // motion it holds still, exactly like a waiting star. `turned` eases the twinkle in when it has just been answered.
      const twinkle = reduced
        ? WAITING_LEVEL
        : TWINKLE_LOW + (1 - TWINKLE_LOW) * (0.5 + 0.5 * wave);
      return {
        core: style.core,
        glow: style.glow,
        level: WAITING_LEVEL + (twinkle - WAITING_LEVEL) * t,
        scale: reduced ? 1 : 1 + TWINKLE_BREATH * wave * t,
        aura: mine ? 1 : 0,
      };
    }
  }
}
