import { Graphics, Rectangle, type Renderer, type Texture } from "pixi.js";
import { between } from "./math";
import { createRandom } from "./random";

const LENGTH = 84;
const THICKNESS = 22;

/** A log lying left to right, in local units with the origin at the middle of its underside on the ground. */
export const LOG = {
  length: LENGTH,
  thickness: THICKNESS,
  /**
   * How high a character's seat point sits above the ground when on the log. Well under the thickness,
   * so the character sinks into the log and its legs hang down over the front of it.
   */
  seatHeight: THICKNESS - 8,
} as const;

export interface LogArt {
  texture: Texture;
  width: number;
  height: number;
  /** Position of the ground origin inside the texture frame. */
  originX: number;
  originY: number;
}

const FRAME = {
  width: LENGTH + 20,
  height: THICKNESS + 8,
  originX: (LENGTH + 20) / 2,
  originY: THICKNESS + 4,
} as const;

/** Draws the log once into a texture. Dark bark, a lighter top, a darker underside and a cut end. */
export function bakeLogArt(renderer: Renderer, pixelsPerUnit: number): LogArt {
  const rand = createRandom(4242);
  const g = new Graphics();
  const left = -LENGTH / 2;

  g.roundRect(left, -THICKNESS, LENGTH, THICKNESS, 9).fill(0x3b2819);
  g.roundRect(left + 3, -THICKNESS + 1.5, LENGTH - 6, 6, 3).fill({ color: 0x5e412b, alpha: 0.85 });
  g.roundRect(left + 3, -7.5, LENGTH - 6, 6, 3).fill({ color: 0x22150e, alpha: 0.75 });

  for (let i = 0; i < 16; i++) {
    const x = between(rand, left + 6, LENGTH / 2 - 14);
    const y = between(rand, -THICKNESS + 5, -5);
    const length = between(rand, 6, 16);
    g.moveTo(x, y).lineTo(x + length, y + between(rand, -0.8, 0.8));
  }
  g.stroke({ width: 0.9, color: 0x1c1009, alpha: 0.55, cap: "round" });

  g.ellipse(-8, -11.5, 3.4, 2.4).fill({ color: 0x24160e, alpha: 0.8 });
  g.ellipse(-8, -11.5, 1.6, 1.1).fill({ color: 0x4a3120, alpha: 0.8 });

  // Ends: the right one is cut and lighter, with growth rings; the left one is in shade.
  g.ellipse(left + 2, -THICKNESS / 2, 3, THICKNESS / 2 - 2).fill({ color: 0x2a1b12, alpha: 0.8 });
  const endX = LENGTH / 2 - 2;
  g.ellipse(endX, -THICKNESS / 2, 4.5, THICKNESS / 2 - 1.2).fill(0x8d6442);
  g.ellipse(endX, -THICKNESS / 2, 2.9, THICKNESS / 2 - 4.5).fill(0x6d4a31);
  g.ellipse(endX, -THICKNESS / 2, 1.3, THICKNESS / 2 - 8).fill(0x8d6442);

  const texture = renderer.generateTexture({
    target: g,
    frame: new Rectangle(-FRAME.originX, -FRAME.originY, FRAME.width, FRAME.height),
    resolution: pixelsPerUnit,
    antialias: true,
  });
  g.destroy();
  return { texture, ...FRAME };
}
