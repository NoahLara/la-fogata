import { Container, Sprite } from "pixi.js";
import { flightProgress, lightAt, planFlight, type FlightPlan } from "./lightFlight";
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

export interface LightEffects {
  /** Over the characters: the golden light as it rises and glides. */
  container: Container;
  /** A light is born in the flames and flies to `to`, a spot in the sky. */
  launch(from: Point, to: Point, hooks: LightHooks): LightHandle;
  /** With reduced motion: nothing flies; the star is born at once and settles. */
  fade(hooks: LightHooks): LightHandle;
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

export function createLightEffects(layout: SceneLayout, textures: TextureBag): LightEffects {
  const container = new Container();
  const lights: Light[] = [];
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
    fade(hooks) {
      const light = make(undefined, hooks);
      arrive(light);
      return { finish: () => finish(light) };
    },
    update(dt) {
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
      for (const light of [...lights]) finish(light);
    },
    destroy() {
      for (const light of [...lights]) remove(light);
    },
  };
}
