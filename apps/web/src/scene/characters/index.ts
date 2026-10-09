import { Assets, type Texture } from "pixi.js";

import type { Species } from "./species";

export { SPECIES, SPECIES_SCALE, type Species } from "./species";

/**
 * How a character is seen. The seat decides: near seats show their back, the far seats straight across the
 * fire their front, and the far seats to the sides a profile turned toward the fire.
 * - `front` and `back` exist for every animal.
 * - `side` is optional. It is drawn facing left, so seats on the left of the fire use it mirrored.
 *   An animal without a side view shows its front there.
 * How a character seems to be turned otherwise comes from how the fire lights it.
 */
export type View = "front" | "back" | "side";

/**
 * A character image plus where its feet are. Sizes are in the characters' local units
 * (the animals are about 106 units tall, with the origin at the feet).
 */
interface CharacterArt {
  texture: Texture;
  width: number;
  height: number;
  /** Position of the feet origin inside the frame. */
  originX: number;
  originY: number;
  /** Whether the art faces left and so must be mirrored for seats on the left of the fire. */
  directional: boolean;
}

/**
 * Frame of the 512x512 illustrations: 4 px per local unit, feet origin at pixel (256, 472).
 * Every animal is drawn to the same proportions, so they land at consistent sizes.
 */
const FRAME = { width: 128, height: 128, originX: 64, originY: 118 } as const;

/** The art is SVG, and that is the only format asked for: nothing is requested that is not there. */
const ART_EXTENSION = "svg";

/** Where the illustration of a view lives: `/characters/<species>/<view>.svg`. */
export function artUrl(species: Species, view: View): string {
  return `/characters/${species}/${view}.${ART_EXTENSION}`;
}

async function loadTexture(url: string): Promise<Texture> {
  const texture = await Assets.load<Texture>({ src: url, data: { resolution: 1 } });
  // These are shrunk a lot on screen; mipmaps keep them from shimmering.
  texture.source.autoGenerateMipmaps = true;
  texture.source.style.scaleMode = "linear";
  texture.source.style.mipmapFilter = "linear";
  return texture;
}

/**
 * The illustrations in /public/characters/<species>/ as `front`, `back` and optionally `side` (SVG). A species
 * only counts if front and back both load. Textures live in the PixiJS Assets cache, which is shared, so they
 * are never destroyed here.
 */
export class SpriteArt {
  private constructor(private readonly textures: ReadonlyMap<string, Texture>) {}

  static async load(species: readonly Species[]): Promise<SpriteArt> {
    const textures = new Map<string, Texture>();
    await Promise.all(
      species.map(async (name) => {
        try {
          // The three views are loaded side by side. The side view is optional: without it the front stands in.
          const [front, back, side] = await Promise.all([
            loadTexture(artUrl(name, "front")),
            loadTexture(artUrl(name, "back")),
            loadTexture(artUrl(name, "side")).catch(() => undefined),
          ]);
          textures.set(`${name}|front`, front);
          textures.set(`${name}|back`, back);
          if (side) textures.set(`${name}|side`, side);
        } catch (error) {
          console.warn(`Could not load the illustrations for ${name}`, error);
        }
      }),
    );
    return new SpriteArt(textures);
  }

  /** Whether the species has art at all (front and back). */
  has(species: Species): boolean {
    return this.textures.has(`${species}|front`);
  }

  /** The art for a view; the front stands in for a side view the species doesn't have. Call only if `has`. */
  art(species: Species, view: View): CharacterArt {
    const own = this.textures.get(`${species}|${view}`);
    const texture = own ?? this.textures.get(`${species}|front`);
    if (!texture) throw new Error(`No art for ${species}`);
    // Only a real side view faces left and needs mirroring; everything else is symmetric.
    return { texture, ...FRAME, directional: view === "side" && own !== undefined };
  }
}
