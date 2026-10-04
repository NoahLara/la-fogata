import { Container, Graphics, Sprite } from "pixi.js";
import { bodyHalf, type DistantSlot, type PlacedFire } from "./distantFires";
import type { TextureBag } from "./textures";

const SOFT = [
  [0, 1],
  [0.5, 0.5],
  [1, 0],
] as const;

/** Seconds a fire takes to fade in or out. */
const FADE_SECONDS = 3;
/** Seconds a puff of smoke takes to rise and fade. */
const PUFF_SECONDS = 6;
const PUFFS = 3;
/** The colour of a far trunk, so the part drawn over a fire matches the pines under it. */
const TRUNK = 0x0c0f21;

interface Shown {
  /** Spill, smoke and flame: behind the trunks. */
  back: Container;
  flame: Graphics;
  spill: Sprite;
  puffs: Sprite[];
  rimSprites: { sprite: Sprite; strength: number }[];
  fire: PlacedFire;
  /** 0 to 1: how much of the fire is visible, easing toward `wanted`. */
  visible: number;
  wanted: number;
  phase: number;
}

export interface DistantFireLayer {
  container: Container;
  /** The fires burning now: new ones fade in, ones no longer here fade out, the others stay put. `instant` skips the fades. */
  set(fires: readonly PlacedFire[], instant: boolean): void;
  update(time: number, dt: number, reduced: boolean): void;
}

/** A tiny flame, taller than wide: a teardrop with a paler heart. */
function drawFlame(width: number, height: number): Graphics {
  const g = new Graphics();
  g.moveTo(-width / 2, 0)
    .quadraticCurveTo(-width * 0.7, -height * 0.4, 0, -height)
    .quadraticCurveTo(width * 0.7, -height * 0.4, width / 2, 0)
    .closePath()
    .fill({ color: 0xff8a2e });
  g.moveTo(-width * 0.22, 0)
    .quadraticCurveTo(-width * 0.3, -height * 0.25, 0, -height * 0.6)
    .quadraticCurveTo(width * 0.3, -height * 0.25, width * 0.22, 0)
    .closePath()
    .fill({ color: 0xffd98a });
  return g;
}

/**
 * Tiny far-away campfires deep in the forest: a small tall flame, a flat warm light on the ground beneath it, a
 * faint plume of smoke, and a warm edge on the trunks beside it. Some stand behind a trunk, which is drawn again
 * over them. The layer sits in the land, so nothing turns it with the sky.
 */
export function createDistantFireLayer(
  textures: TextureBag,
  slots: readonly DistantSlot[],
): DistantFireLayer {
  const container = new Container();
  const back = new Container();
  const occluders = new Graphics();
  const rims = new Container();
  container.addChild(back, occluders, rims);
  const shown = new Map<string, Shown>();
  const soft = textures.radial(SOFT, 64);

  // The pines that stand in front of a fire's spot, drawn over it: from the top of the flame down to the ground.
  for (const slot of slots) {
    for (const { tree } of slot.trunks) {
      const base = tree.top + tree.height;
      const top = Math.max(base - tree.height * 0.1, slot.y - slot.flameHeight - 1);
      const [topHalf, baseHalf] = [bodyHalf(tree, top), bodyHalf(tree, base)];
      occluders.poly([
        tree.x - topHalf,
        top,
        tree.x + topHalf,
        top,
        tree.x + baseHalf,
        base,
        tree.x - baseHalf,
        base,
      ]);
    }
  }
  occluders.fill(TRUNK);

  const add = (fire: PlacedFire, instant: boolean): Shown => {
    const part = new Container();
    part.position.set(fire.x, fire.y);
    const spill = new Sprite(soft);
    spill.anchor.set(0.5);
    spill.width = fire.spillWidth * 2;
    spill.height = fire.spillHeight * 2;
    spill.position.set(0, fire.spillHeight * 0.2);
    spill.tint = 0xff8a3c;
    spill.blendMode = "add";
    const puffs = Array.from({ length: PUFFS }, () => {
      const puff = new Sprite(soft);
      puff.anchor.set(0.5);
      puff.tint = 0x9a9fb5;
      return puff;
    });
    const flame = drawFlame(fire.flameWidth, fire.flameHeight);
    part.addChild(spill, ...puffs, flame);
    back.addChild(part);

    // Up to one trunk on each side catches the light on the edge that faces the fire.
    const lit = new Map<number, (typeof fire.trunks)[number]>();
    for (const near of fire.trunks) if (!lit.has(near.side)) lit.set(near.side, near);
    const rimSprites = [...lit.values()].map(({ tree, side }) => {
      const sprite = new Sprite(soft);
      sprite.anchor.set(0.5);
      sprite.width = Math.max(3, fire.flameWidth * 1.6);
      sprite.height = Math.max(8, fire.flameHeight * 3);
      sprite.position.set(tree.x + side * bodyHalf(tree, fire.y), fire.y - fire.flameHeight * 0.4);
      sprite.tint = 0xff8a3c;
      sprite.blendMode = "add";
      rims.addChild(sprite);
      const strength = Math.max(0.2, 1 - Math.abs(fire.x - tree.x) / (fire.spillWidth * 0.9));
      return { sprite, strength };
    });
    return {
      back: part,
      flame,
      spill,
      puffs,
      rimSprites,
      fire,
      visible: instant ? 1 : 0,
      wanted: 1,
      phase: (fire.x * 0.37 + fire.y) % (Math.PI * 2),
    };
  };

  const paint = (item: Shown, time: number, reduced: boolean) => {
    const { fire, phase } = item;
    const shine = item.visible * fire.brightness;
    // A flicker is a few slow, uneven waves; with reduced motion the fire just stays as it is.
    const flicker = reduced
      ? 1
      : 0.85 + 0.09 * Math.sin(time * 5.1 + phase) + 0.06 * Math.sin(time * 11.3 + phase * 2.1);
    item.back.alpha = item.visible;
    item.flame.alpha = shine;
    item.flame.scale.set(reduced ? 1 : 0.92 + 0.1 * flicker, reduced ? 1 : 0.88 + 0.2 * flicker);
    item.flame.skew.x = reduced ? 0 : 0.12 * Math.sin(time * 3.3 + phase);
    item.spill.alpha = 0.6 * shine * flicker;
    for (const rim of item.rimSprites) rim.sprite.alpha = 0.55 * rim.strength * shine * flicker;

    const radius = Math.max(2, fire.flameWidth * 1.1);
    item.puffs.forEach((puff, k) => {
      // Reduced motion: the plume stands still, very faint, at the stage each puff would be at its fullest.
      const age = reduced
        ? 0.25 + (k / PUFFS) * 0.6
        : (time / PUFF_SECONDS + k / PUFFS + phase) % 1;
      const grow = 1 + 2.4 * age;
      const drift = reduced ? 0 : Math.sin(age * 2.2 + phase + k) * 0.25 + age * 0.6;
      puff.position.set(drift * fire.plumeWidth, -fire.flameHeight * 0.8 - age * fire.plumeHeight);
      puff.width = puff.height = radius * 2 * grow * (fire.plumeWidth / 8 + 0.5);
      const fade = Math.sin(Math.PI * age) ** 1.3;
      puff.alpha = (reduced ? 0.05 : 0.12) * fade * shine;
    });
  };

  return {
    container,
    set(fires, instant) {
      const ids = new Set(fires.map((fire) => fire.id));
      for (const fire of fires) {
        const existing = shown.get(fire.id);
        if (!existing) {
          shown.set(fire.id, add(fire, instant));
        } else {
          existing.wanted = 1;
          existing.fire = fire;
        }
      }
      for (const [id, item] of shown) {
        if (ids.has(id)) continue;
        item.wanted = 0;
        if (instant) item.visible = 0;
      }
    },
    update(time, dt, reduced) {
      for (const [id, item] of shown) {
        const step = reduced ? 1 : dt / FADE_SECONDS;
        if (item.visible < item.wanted) item.visible = Math.min(item.wanted, item.visible + step);
        else if (item.visible > item.wanted)
          item.visible = Math.max(item.wanted, item.visible - step);
        if (item.wanted === 0 && item.visible === 0) {
          item.back.destroy({ children: true });
          for (const rim of item.rimSprites) rim.sprite.destroy();
          shown.delete(id);
          continue;
        }
        paint(item, time, reduced);
      }
    },
  };
}
