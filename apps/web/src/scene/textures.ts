import { ImageSource, Texture, type Renderer } from "pixi.js";

export type GradientStop = readonly [offset: number, alpha: number];

function canvasTexture(
  width: number,
  height: number,
  resolution: number,
  draw: (g: CanvasRenderingContext2D) => void,
): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * resolution));
  canvas.height = Math.max(1, Math.round(height * resolution));
  const g = canvas.getContext("2d");
  if (!g) throw new Error("2D canvas is not available");
  g.scale(resolution, resolution);
  draw(g);
  return new Texture({ source: new ImageSource({ resource: canvas, resolution }) });
}

function radialTexture(stops: readonly GradientStop[], size: number): Texture {
  return canvasTexture(size, size, 1, (g) => {
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [offset, alpha] of stops)
      gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`);
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
  });
}

/**
 * One flame tongue, white so it can be tinted: a teardrop with a pointed tip, brightest in the body and
 * fading to nothing at the tip, with feathered sides. 64x128 px; the bottom centre is where it grows from.
 */
function flameTongueTexture(): Texture {
  const w = 64;
  const h = 128;
  return canvasTexture(w, h, 1, (g) => {
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.bezierCurveTo(w * 0.92, h * 0.34, w * 0.98, h * 0.72, w / 2, h * 0.98);
    g.bezierCurveTo(w * 0.02, h * 0.72, w * 0.08, h * 0.34, w / 2, 0);
    g.closePath();
    const body = g.createLinearGradient(0, 0, 0, h);
    body.addColorStop(0, "rgba(255,255,255,0)");
    body.addColorStop(0.25, "rgba(255,255,255,.55)");
    body.addColorStop(0.7, "rgba(255,255,255,1)");
    body.addColorStop(1, "rgba(255,255,255,.35)");
    g.fillStyle = body;
    g.fill();
    // Feather the sides with an elliptical falloff.
    g.globalCompositeOperation = "destination-in";
    g.save();
    g.translate(w / 2, h * 0.58);
    g.scale(1, (h * 0.62) / (w * 0.55));
    const feather = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.55);
    feather.addColorStop(0, "rgba(0,0,0,1)");
    feather.addColorStop(0.65, "rgba(0,0,0,.9)");
    feather.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = feather;
    g.fillRect(-w, -w * 3, w * 2, w * 6);
    g.restore();
  });
}

/** Darkening toward the edges, centered on (cx, cy). Not cached: depends on layout. */
function vignetteTexture(
  width: number,
  height: number,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
): Texture {
  return canvasTexture(width, height, 0.5, (g) => {
    const gradient = g.createRadialGradient(cx, cy, inner, cx, cy, outer);
    gradient.addColorStop(0, "rgba(3,3,8,0)");
    gradient.addColorStop(1, "rgba(3,3,8,.7)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, width, height);
  });
}

/**
 * Warm light falling on a character from the fire, as an orange gradient.
 * Starts at (x0, y0) fully opaque and fades to (x1, y1). Size and coordinates are in the sprite's local units.
 */
function rimLightTexture(
  width: number,
  height: number,
  resolution: number,
  line: { x0: number; y0: number; x1: number; y1: number },
): Texture {
  return canvasTexture(width, height, resolution, (g) => {
    const gradient = g.createLinearGradient(line.x0, line.y0, line.x1, line.y1);
    gradient.addColorStop(0, "rgba(255,165,70,1)");
    gradient.addColorStop(1, "rgba(255,150,70,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, width, height);
  });
}

/**
 * Darkening for the side of a turned character that faces away from the fire.
 * Opaque night color at (x0, y0), fading to nothing at (x1, y1). Size and coordinates are in local units.
 */
function sideShadeTexture(
  width: number,
  height: number,
  resolution: number,
  line: { x0: number; y0: number; x1: number; y1: number },
): Texture {
  return canvasTexture(width, height, resolution, (g) => {
    const gradient = g.createLinearGradient(line.x0, line.y0, line.x1, line.y1);
    gradient.addColorStop(0, "rgba(6,7,18,.85)");
    gradient.addColorStop(1, "rgba(6,7,18,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, width, height);
  });
}

/** How far the backlight reaches in from the edge, and how far its falloff leans toward the fire, in local units. */
/** Defaults for `edgeRim`: how far the light reaches in from the edge, and how far its falloff leans toward the fire. */
const RIM_FADE = 3.4;
const RIM_LEAN = 1.6;

/**
 * Backlight: the edges of a character's silhouette that face the fire, fading inward.
 *
 * The light is an inner glow. Its mask is the silhouette itself, so it hugs the edge exactly.
 * Its strength is one minus a blurred copy of the silhouette sampled slightly toward the fire:
 * near an edge that faces the fire the blurred copy is thin, so the light is strong, and it fades
 * to nothing a few units inside. Edges facing away see the shape's body there and stay dark.
 * `width` is the character's frame width in local units; `fade` and `lean` are in local units too.
 */
function edgeRimTexture(
  renderer: Renderer,
  source: Texture,
  width: number,
  towardFire: { x: number; y: number },
  fade: number,
  lean: number,
): Texture {
  const art = renderer.extract.canvas(source) as HTMLCanvasElement;
  const pixelsPerUnit = art.width / width;
  const layer = () => {
    const canvas = document.createElement("canvas");
    canvas.width = art.width;
    canvas.height = art.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas is not available");
    return { canvas, context };
  };

  // Box-style blur without ctx.filter (unsupported in some browsers): average the silhouette over a disc of offsets.
  const offsets: [number, number][] = [[0, 0]];
  for (const [ring, count] of [
    [0.5, 8],
    [1, 12],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      offsets.push([Math.cos(angle) * ring * fade, Math.sin(angle) * ring * fade]);
    }
  }
  const coverage = layer();
  coverage.context.globalCompositeOperation = "lighter";
  coverage.context.globalAlpha = 1 / offsets.length;
  for (const [dx, dy] of offsets) {
    coverage.context.drawImage(
      art,
      (dx - towardFire.x * lean) * pixelsPerUnit,
      (dy - towardFire.y * lean) * pixelsPerUnit,
    );
  }

  // silhouette * (1 - blurred silhouette), then colour it, hottest on the side nearest the fire.
  const out = layer();
  const g = out.context;
  g.drawImage(art, 0, 0);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(coverage.canvas, 0, 0);
  g.globalCompositeOperation = "source-in";
  const cx = out.canvas.width / 2;
  const cy = out.canvas.height / 2;
  const reach = Math.max(out.canvas.width, out.canvas.height) * 0.45;
  const gradient = g.createLinearGradient(
    cx + towardFire.x * reach,
    cy + towardFire.y * reach,
    cx - towardFire.x * reach,
    cy - towardFire.y * reach,
  );
  gradient.addColorStop(0, "rgba(255,178,92,1)");
  gradient.addColorStop(1, "rgba(255,140,60,.55)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, out.canvas.width, out.canvas.height);
  return new Texture({
    source: new ImageSource({ resource: out.canvas, resolution: pixelsPerUnit }),
  });
}

/**
 * Owns every texture one scene build creates, so they are all released together.
 * Deliberately not global: two scenes can exist at once (React Strict Mode mounts twice),
 * and one must never destroy the other's textures.
 */
export class TextureBag {
  private readonly owned: Texture[] = [];
  private readonly radials = new Map<string, Texture>();

  /** White radial falloff, `size` px square. Tint it and scale it to taste. Cached per stop list. */
  radial(stops: readonly GradientStop[], size = 128): Texture {
    const key = `${size}|${stops.map(([o, a]) => `${o}:${a}`).join(",")}`;
    const hit = this.radials.get(key);
    if (hit) return hit;
    return this.adopt(radialTexture(stops, size), key);
  }

  /** A flame tongue (see `flameTongueTexture`). Cached. */
  flameTongue(): Texture {
    const hit = this.radials.get("flame-tongue");
    if (hit) return hit;
    return this.adopt(flameTongueTexture(), "flame-tongue");
  }

  vignette(
    width: number,
    height: number,
    cx: number,
    cy: number,
    inner: number,
    outer: number,
  ): Texture {
    return this.adopt(vignetteTexture(width, height, cx, cy, inner, outer));
  }

  rimLight(
    width: number,
    height: number,
    resolution: number,
    line: { x0: number; y0: number; x1: number; y1: number },
  ): Texture {
    return this.adopt(rimLightTexture(width, height, resolution, line));
  }

  sideShade(
    width: number,
    height: number,
    resolution: number,
    line: { x0: number; y0: number; x1: number; y1: number },
  ): Texture {
    return this.adopt(sideShadeTexture(width, height, resolution, line));
  }

  edgeRim(
    renderer: Renderer,
    source: Texture,
    width: number,
    towardFire: { x: number; y: number },
    fade = RIM_FADE,
    lean = RIM_LEAN,
  ): Texture {
    return this.adopt(edgeRimTexture(renderer, source, width, towardFire, fade, lean));
  }

  /** Takes ownership of a texture made elsewhere. */
  private adopt(texture: Texture, radialKey?: string): Texture {
    this.owned.push(texture);
    if (radialKey) this.radials.set(radialKey, texture);
    return texture;
  }

  destroy(): void {
    for (const texture of this.owned) texture.destroy(true);
    this.owned.length = 0;
    this.radials.clear();
  }
}
