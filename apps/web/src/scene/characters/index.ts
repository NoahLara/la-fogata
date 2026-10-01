import { Assets, Graphics, Rectangle, type Renderer, type Texture } from "pixi.js";
import { drawPanda } from "./panda";

/** The 7 animals, one per seat. */
export type Species = "panda" | "cat" | "owl" | "fox" | "capybara" | "rabbit" | "bear";

export const SPECIES: readonly Species[] = [
  "panda",
  "cat",
  "owl",
  "fox",
  "capybara",
  "rabbit",
  "bear",
];

/**
 * How big each animal is relative to the panda. This is the species' only say in how it sits: the seat decides
 * the view, the lighting, the log and the lean, so any animal works in any seat.
 */
export const SPECIES_SCALE: Record<Species, number> = {
  panda: 1,
  cat: 0.92,
  owl: 0.88,
  fox: 1,
  capybara: 1,
  rabbit: 0.8,
  bear: 1.1,
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

/** Which art to use: illustrations from /public/characters, or the shapes drawn in code. */
export type ArtMode = "sprites" | "drawn";

/**
 * A character image plus where its feet are. Sizes are in the characters' local units
 * (the animals are about 106 units tall, with the origin at the feet).
 */
export interface CharacterArt {
  texture: Texture;
  width: number;
  height: number;
  /** Position of the feet origin inside the frame. */
  originX: number;
  originY: number;
  /** Whether the art faces left and so must be mirrored for seats on the left of the fire. */
  directional: boolean;
}

/** Frame the drawn animals are baked into. */
const DRAWN_FRAME = { width: 170, height: 150, originX: 85, originY: 142 } as const;

/**
 * Frame of the 512x512 illustrations: 4 px per local unit, feet origin at pixel (256, 472).
 * An illustration drawn to the animals' proportions then lands at the same size.
 */
const SPRITE_FRAME = { width: 128, height: 128, originX: 64, originY: 118 } as const;

type DrawAnimal = (g: Graphics, back: boolean) => void;

/** Animals that have been ported to drawn art so far. */
const DRAWN: Partial<Record<Species, DrawAnimal>> = {
  panda: drawPanda,
};

const IMAGE_EXTENSIONS = ["webp", "png", "svg"] as const;

/** First existing `/characters/<species>/<view>.<ext>`, in webp, png, svg order. */
async function findImage(species: Species, view: View): Promise<string | undefined> {
  for (const extension of IMAGE_EXTENSIONS) {
    const url = `/characters/${species}/${view}.${extension}`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return url;
    } catch {
      // Network trouble: treat as missing and fall back to the drawn animal.
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
 * Illustrations found in /public/characters/<species>/ as `front`, `back` and optionally `side`
 * (each webp, png or svg). A species only counts if front and back both load. Textures live in the PixiJS Assets cache,
 * which is shared, so they are never destroyed here.
 */
export class SpriteArt {
  private constructor(private readonly textures: ReadonlyMap<string, Texture>) {}

  static empty(): SpriteArt {
    return new SpriteArt(new Map());
  }

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
          console.warn(`Could not load illustrations for ${name}; using the drawn version`, error);
        }
      }),
    );
    return new SpriteArt(textures);
  }

  has(species: Species): boolean {
    return this.textures.has(`${species}|front`);
  }

  /** Whether the species has art for this view itself, rather than falling back to its front. */
  hasView(species: Species, view: View): boolean {
    return this.textures.has(`${species}|${view}`);
  }

  /** The view's art, or the front when the species has no art for it. */
  get(species: Species, view: View): Texture | undefined {
    return this.textures.get(`${species}|${view}`) ?? this.textures.get(`${species}|front`);
  }
}

/**
 * Hands out each animal's art, preferring illustrations and falling back to the drawn version.
 * Drawn animals are baked once per species and view; call `destroy` to release them.
 */
export class CharacterArtSet {
  private readonly baked = new Map<string, CharacterArt>();

  constructor(
    private readonly renderer: Renderer,
    /** Texture pixels per local unit for the drawn animals; sets how sharp they are. */
    private readonly pixelsPerUnit: number,
    private readonly sprites: SpriteArt,
  ) {}

  /** Whether this species has any art at all. */
  has(species: Species): boolean {
    return this.sprites.has(species) || species in DRAWN;
  }

  get(species: Species, view: View): CharacterArt {
    const sprite = this.sprites.get(species, view);
    // Only a real side view faces left and needs mirroring; everything else is symmetric.
    if (sprite) {
      return {
        texture: sprite,
        ...SPRITE_FRAME,
        directional: view === "side" && this.sprites.hasView(species, "side"),
      };
    }

    // The drawn animals have a front and a back only.
    const key = `${species}|${view === "back" ? "back" : "front"}`;
    const hit = this.baked.get(key);
    if (hit) return hit;
    const draw = DRAWN[species];
    if (!draw) throw new Error(`No art for ${species}`);
    const g = new Graphics();
    draw(g, view === "back");
    const texture = this.renderer.generateTexture({
      target: g,
      frame: new Rectangle(
        -DRAWN_FRAME.originX,
        -DRAWN_FRAME.originY,
        DRAWN_FRAME.width,
        DRAWN_FRAME.height,
      ),
      resolution: this.pixelsPerUnit,
      antialias: true,
    });
    g.destroy();
    const art = { texture, ...DRAWN_FRAME, directional: false };
    this.baked.set(key, art);
    return art;
  }

  destroy(): void {
    for (const { texture } of this.baked.values()) texture.destroy(true);
    this.baked.clear();
  }
}
