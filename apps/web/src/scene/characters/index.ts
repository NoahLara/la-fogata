import { Assets, type Texture } from "pixi.js";

/** The 7 animals, one per seat. */
export const SPECIES = ["panda", "cat", "owl", "fox", "capybara", "rabbit", "bear"] as const;

export type Species = (typeof SPECIES)[number];

/**
 * How big each animal is, relative to a nominal 1 (the bear is the biggest at 1.15, the panda 90% of that). This is the species' only say in how it sits: the seat decides
 * the view, the lighting, the log and the lean, so any animal works in any seat.
 */
export const SPECIES_SCALE: Record<Species, number> = {
  panda: 1.035,
  cat: 0.92,
  owl: 0.88,
  fox: 1,
  capybara: 1,
  rabbit: 0.8,
  bear: 1.15,
};

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
  for (const extension of IMAGE_EXTENSIONS) {
    const url = `/characters/${species}/${view}.${extension}`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return url;
    } catch {
      // Network trouble: treat as missing.
    }
  }
  return undefined;
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
          // Probe the front alone: a species without art then costs 3 requests instead of 6.
          const frontUrl = await findImage(name, "front");
          const backUrl = frontUrl ? await findImage(name, "back") : undefined;
          if (!frontUrl || !backUrl) return;
          const [front, back] = await Promise.all([loadTexture(frontUrl), loadTexture(backUrl)]);
          textures.set(`${name}|front`, front);
          textures.set(`${name}|back`, back);
          const sideUrl = await findImage(name, "side");
          if (sideUrl) textures.set(`${name}|side`, await loadTexture(sideUrl));
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
