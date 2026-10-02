import type { Keepout } from "./shootingStar";
import type { SceneLayout } from "./layout";

/** Where the moon and Venus hang and how tall the sky is: shared by the sky and by whatever must keep clear of them. */
export interface SkyGeometry {
  moon: Keepout;
  /** Venus sits a little below the moon and to its left. */
  venus: Keepout;
  skyHeight: number;
}

export function skyGeometry(layout: SceneLayout): SkyGeometry {
  const { width, horizon, u, sceneTop } = layout;
  const mx = width * 0.84;
  const my = Math.max(sceneTop + 40 * u, 70);
  const mr = Math.max(10, 18 * u);
  return {
    moon: { x: mx, y: my, radius: mr },
    venus: { x: Math.max(14, mx - mr * 4.3), y: my + mr * 2.7, radius: mr * 1.5 },
    skyHeight: Math.max(40, horizon - 12 * u),
  };
}
