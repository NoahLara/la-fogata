import { Container, Sprite } from "pixi.js";
import {
  DIM_SECONDS,
  flightProgress,
  giftAt,
  lightAt,
  planGift,
  planFlight,
  planReturn,
  returnAt,
  type FlightPlan,
  type ReturnPlan,
} from "./lightFlight";
import type { Point, SceneLayout } from "./layout";
import { smoothstep } from "./math";
import type { TextureBag } from "./textures";

/** What happens as the light reaches its star. */
export interface LightHooks {
  /** The light has arrived: the star is born (at once with reduced motion). */
  onArrive: () => void;
  /** The star has bloomed and settled. */
  onDone: () => void;
}

export interface LightHandle {
  /** Ends it at once: the star is born and settled wherever the light is. */
  finish(): void;
}

/** What happens as a star goes back to the fire. */
export interface DescentHooks {
  /** The star starts to dim: it leaves the sky (it fades out with reduced motion). */
  onDim: () => void;
  /** The light reaches the flames: they flare. Not called with reduced motion. */
  onArrive: () => void;
  /** Nothing of it is left. */
  onDone: () => void;
}

export interface LightEffects {
  /** Over the characters: the golden light as it rises and glides. */
  container: Container;
  /** A light is born in the flames and flies to `to`, a spot in the sky. */
  launch(from: Point, to: Point, hooks: LightHooks): LightHandle;
  /**
   * A star goes back to the fire: it dims into a small golden light at `from`, which glides in an arc down to `to`
   * and sinks into the flames. With `still` nothing flies: the star only fades out.
   */
  descend(from: Point, to: Point, hooks: DescentHooks, still?: boolean): LightHandle;
  /** With reduced motion: nothing flies; the star is born at once and settles. */
  fade(hooks: LightHooks): LightHandle;
  /**
   * A tiny warm light rises from `from` (an animal's paws) to `to` (another person's star) and melts into it, then
   * `onArrive` is called. With `still` nothing flies: `onArrive` is called at once.
   */
  gift(from: Point, to: Point, onArrive: () => void, still?: boolean): LightHandle;
  update(dt: number): void;
  /** Ends every light at once, for when the scene is rebuilt. */
  finishAll(): void;
  destroy(): void;
}

/** How long the bloom lasts after the light arrives, which is also how long the star takes to settle. */
export const BLOOM_SECONDS = 1.5;
/** How long the flying light takes to melt into its star. */
const MELT_SECONDS = 0.5;
/** Copies of the light left behind it, each this many seconds older. */
const TRAIL = [0.06, 0.13, 0.22, 0.34] as const;
/** How long the light takes to sink into the flames, and how long a still star takes to fade out. */
const SINK_SECONDS = 0.45;
const FADE_OUT_SECONDS = 0.7;
const GOLD = 0xffc86a;
const CORE = 0xfff3d0;

interface Light {
  plan: FlightPlan | undefined;
  glow: Sprite;
  core: Sprite;
  trail: Sprite[];
  elapsed: number;
  /** When it arrived, in its own time. */
  arrivedAt: number | undefined;
  hooks: LightHooks;
  done: boolean;
}

interface Descent {
  plan: ReturnPlan | undefined;
  glow: Sprite;
  core: Sprite;
  trail: Sprite[];
  elapsed: number;
  dimmed: boolean;
  arrivedAt: number | undefined;
  hooks: DescentHooks;
}

interface Gift {
  plan: ReturnType<typeof planGift>;
  glow: Sprite;
  core: Sprite;
  elapsed: number;
  onArrive: () => void;
  arrived: boolean;
}

/** How long the tiny light takes to melt into the star it reached. */
const GIFT_MELT_SECONDS = 0.35;

export function createLightEffects(layout: SceneLayout, textures: TextureBag): LightEffects {
  const container = new Container();
  const lights: Light[] = [];
  const gifts: Gift[] = [];
  const descents: Descent[] = [];
  const soft = textures.radial([
    [0, 1],
    [0.35, 0.45],
    [1, 0],
  ]);
  const u = Math.max(0.6, layout.u);

  const sprite = (tint: number, size: number, alpha = 0): Sprite => {
    const s = new Sprite(soft);
    s.anchor.set(0.5);
    s.width = s.height = size;
    s.tint = tint;
    s.blendMode = "add";
    s.alpha = alpha;
    container.addChild(s);
    return s;
  };

  const make = (plan: FlightPlan | undefined, hooks: LightHooks): Light => {
    const light: Light = {
      plan,
      glow: sprite(GOLD, 34 * u),
      core: sprite(CORE, 11 * u),
      trail: TRAIL.map(() => sprite(GOLD, 14 * u)),
      elapsed: 0,
      arrivedAt: plan ? undefined : 0,
      hooks,
      done: false,
    };
    lights.push(light);
    return light;
  };

  const remove = (light: Light) => {
    const at = lights.indexOf(light);
    if (at >= 0) lights.splice(at, 1);
    light.glow.destroy();
    light.core.destroy();
    for (const t of light.trail) t.destroy();
  };

  const arrive = (light: Light) => {
    if (light.arrivedAt !== undefined) return;
    light.arrivedAt = light.elapsed;
    light.hooks.onArrive();
  };

  const finish = (light: Light) => {
    if (light.done) return;
    arrive(light);
    light.done = true;
    remove(light);
    light.hooks.onDone();
  };

  const settle = (descent: Descent) => {
    if (!descent.dimmed) {
      descent.dimmed = true;
      descent.hooks.onDim();
    }
    if (descent.arrivedAt === undefined) {
      descent.arrivedAt = descent.elapsed;
      if (descent.plan) descent.hooks.onArrive();
    }
    const at = descents.indexOf(descent);
    if (at < 0) return;
    descents.splice(at, 1);
    descent.glow.destroy();
    descent.core.destroy();
    for (const t of descent.trail) t.destroy();
    descent.hooks.onDone();
  };

  const updateDescent = (descent: Descent, dt: number) => {
    descent.elapsed += dt;
    const { plan } = descent;
    const put = (at: Point, strength: number, growth: number) => {
      descent.glow.position.set(at.x, at.y);
      descent.core.position.set(at.x, at.y);
      descent.glow.alpha = 0.8 * strength;
      descent.core.alpha = Math.min(1, strength);
      descent.glow.scale.set((34 * u * growth) / soft.width);
      descent.core.scale.set((11 * u * growth) / soft.width);
    };
    if (!descent.dimmed) {
      descent.dimmed = true;
      descent.hooks.onDim();
    }
    if (!plan) {
      if (descent.elapsed >= FADE_OUT_SECONDS) settle(descent);
      return;
    }
    const glide = descent.elapsed - DIM_SECONDS;
    if (glide < 0) {
      // The star gives its light: it gathers where the star was while the star dims.
      const gather = smoothstep(0, DIM_SECONDS, descent.elapsed);
      put(plan.from, gather * 0.9, 1.25 - 0.35 * gather);
      return;
    }
    if (glide < plan.duration) {
      const breath = 0.9 + 0.1 * Math.sin(descent.elapsed * 4);
      put(returnAt(plan, glide), 0.9 * breath, 0.9);
      descent.trail.forEach((copy, i) => {
        const behind = returnAt(plan, Math.max(0, glide - (TRAIL[i] as number)));
        copy.position.set(behind.x, behind.y);
        copy.alpha = 0.45 * (1 - i / TRAIL.length);
        copy.scale.set((14 * u * (1 - i * 0.18)) / soft.width);
      });
      return;
    }
    if (descent.arrivedAt === undefined) {
      descent.arrivedAt = descent.elapsed;
      descent.hooks.onArrive();
      for (const copy of descent.trail) copy.alpha = 0;
    }
    // It sinks into the flames: smaller and fainter until it is gone.
    const sunk = smoothstep(0, SINK_SECONDS, descent.elapsed - descent.arrivedAt);
    put(plan.to, 0.9 * (1 - sunk), 0.9 * (1 - 0.6 * sunk));
    if (sunk >= 1) settle(descent);
  };

  const endGift = (gift: Gift) => {
    const at = gifts.indexOf(gift);
    if (at < 0) return;
    gifts.splice(at, 1);
    gift.glow.destroy();
    gift.core.destroy();
    if (!gift.arrived) {
      gift.arrived = true;
      gift.onArrive();
    }
  };

  const updateGift = (gift: Gift, dt: number) => {
    gift.elapsed += dt;
    const { plan } = gift;
    if (gift.elapsed >= plan.duration) {
      if (!gift.arrived) {
        gift.arrived = true;
        gift.onArrive();
      }
      // It melts into the star.
      const melt = smoothstep(0, GIFT_MELT_SECONDS, gift.elapsed - plan.duration);
      gift.glow.alpha = 0.7 * (1 - melt);
      gift.core.alpha = 1 - melt;
      if (melt >= 1) endGift(gift);
      return;
    }
    const at = giftAt(plan, gift.elapsed);
    const born = smoothstep(0, 0.4, gift.elapsed);
    const breath = 0.9 + 0.1 * Math.sin(gift.elapsed * 5);
    gift.glow.position.set(at.x, at.y);
    gift.core.position.set(at.x, at.y);
    gift.glow.alpha = 0.7 * born * breath;
    gift.core.alpha = born;
  };

  const place = (light: Light, at: Point, strength: number, growth: number) => {
    light.glow.position.set(at.x, at.y);
    light.core.position.set(at.x, at.y);
    light.glow.alpha = 0.8 * strength;
    light.core.alpha = Math.min(1, strength);
    light.glow.scale.set((34 * u * growth) / soft.width);
    light.core.scale.set((11 * u * growth) / soft.width);
  };

  return {
    container,
    launch(from, to, hooks) {
      const light = make(planFlight(from, to, layout.u), hooks);
      place(light, from, 0, 1);
      return { finish: () => finish(light) };
    },
    descend(from, to, hooks, still = false) {
      const descent: Descent = {
        plan: still ? undefined : planReturn(from, to, layout.u),
        glow: sprite(GOLD, 34 * u),
        core: sprite(CORE, 11 * u),
        trail: TRAIL.map(() => sprite(GOLD, 14 * u)),
        elapsed: 0,
        dimmed: false,
        arrivedAt: undefined,
        hooks,
      };
      descents.push(descent);
      return { finish: () => settle(descent) };
    },
    gift(from, to, onArrive, still = false) {
      if (still) {
        onArrive();
        return { finish: () => {} };
      }
      const gift: Gift = {
        plan: planGift(from, to),
        glow: sprite(GOLD, 16 * u),
        core: sprite(CORE, 5 * u),
        elapsed: 0,
        onArrive,
        arrived: false,
      };
      gifts.push(gift);
      return { finish: () => endGift(gift) };
    },
    fade(hooks) {
      const light = make(undefined, hooks);
      arrive(light);
      return { finish: () => finish(light) };
    },
    update(dt) {
      for (const gift of [...gifts]) updateGift(gift, dt);
      for (const descent of [...descents]) updateDescent(descent, dt);
      for (const light of [...lights]) {
        light.elapsed += dt;
        const { plan } = light;
        if (light.arrivedAt === undefined && plan) {
          if (light.elapsed >= plan.duration) {
            arrive(light);
          } else {
            // Born in the flames: it brightens over the first moments, with a slow breath all the way up.
            const born = smoothstep(0, 0.9, light.elapsed);
            const breath = 0.9 + 0.1 * Math.sin(light.elapsed * 4);
            place(
              light,
              lightAt(plan, light.elapsed),
              born * breath,
              1 + 0.25 * flightProgress(plan, light.elapsed),
            );
            light.trail.forEach((copy, i) => {
              const behind = lightAt(plan, Math.max(0, light.elapsed - (TRAIL[i] as number)));
              copy.position.set(behind.x, behind.y);
              copy.alpha = born * 0.45 * (1 - i / TRAIL.length);
              copy.scale.set((14 * u * (1 - i * 0.18)) / soft.width);
            });
            continue;
          }
        }
        // Arrived: the light melts into the star, and the star's bloom runs its course.
        const since = light.elapsed - (light.arrivedAt ?? light.elapsed);
        if (plan) {
          const melt = 1 - smoothstep(0, MELT_SECONDS, since);
          place(light, plan.to, melt, 1 + (1 - melt) * 1.5);
          for (const copy of light.trail) copy.alpha = 0;
        }
        if (since >= BLOOM_SECONDS) finish(light);
      }
    },
    finishAll() {
      for (const gift of [...gifts]) endGift(gift);
      for (const light of [...lights]) finish(light);
      for (const descent of [...descents]) settle(descent);
    },
    destroy() {
      for (const gift of [...gifts]) endGift(gift);
      for (const light of [...lights]) remove(light);
      descents.length = 0;
    },
  };
}
