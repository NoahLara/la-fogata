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

const IMAGE_EXTENSIONS = ["webp", "png", "svg"] as const;

/** First existing `/characters/<species>/<view>.<ext>`, in webp, png, svg order. */
async function findImage(species: Species, view: View): Promise<string | undefined> {
  // All the formats are asked at once (the answer is still the first in order that exists), not one after another.
  const found = await Promise.all(
    IMAGE_EXTENSIONS.map(async (extension) => {
      const url = `/characters/${species}/${view}.${extension}`;
      try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok ? url : undefined;
      } catch {
        // Network trouble: treat as missing.
        return undefined;
      }
    }),
  );
  return found.find((url) => url !== undefined);
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
 * The illustrations found in /public/characters/<species>/ as `front`, `back` and optionally `side` (each webp,
 * png or svg). A species only counts if front and back both load. Textures live in the PixiJS Assets cache,
 * which is shared, so they are never destroyed here.
 */
export class SpriteArt {
  private constructor(private readonly textures: ReadonlyMap<string, Texture>) {}

  static async load(species: readonly Species[]): Promise<SpriteArt> {
    const textures = new Map<string, Texture>();
    await Promise.all(
      species.map(async (name) => {
        try {
          // The three views are looked for, and loaded, side by side.
          const [frontUrl, backUrl, sideUrl] = await Promise.all([
            findImage(name, "front"),
            findImage(name, "back"),
            findImage(name, "side"),
          ]);
          if (!frontUrl || !backUrl) return;
          const [front, back, side] = await Promise.all([
            loadTexture(frontUrl),
            loadTexture(backUrl),
            sideUrl ? loadTexture(sideUrl) : undefined,
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
