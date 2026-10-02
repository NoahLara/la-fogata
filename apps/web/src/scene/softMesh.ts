import { Mesh, MeshGeometry, type Texture } from "pixi.js";
import { applyChains, compileChains } from "./deform";
import type { PartSpec } from "./parts";

/** How finely the picture is cut up. An ear is a dozen units across, so a cell is a few. */
const GRID = 48;

interface Frame {
  width: number;
  height: number;
  /** Where the feet are inside the frame. */
  originX: number;
  originY: number;
}

/**
 * One mesh shape shared by every layer of a character (body, light, shade, rim), so a moving ear or tail
 * carries its lighting with it. Each layer is a Mesh over the same positions; moving them is a write into
 * one array and an upload, never a rebuilt texture.
 */
export interface SoftMesh {
  /** A mesh for a layer, showing `texture`. Textures cover the whole frame, so the picture lines up. */
  layer(texture: Texture): Mesh;
  /** Moves the parts: one angle in radians per part, in the order they were given. Cheap when nothing moves. */
  pose(angles: readonly number[]): void;
  destroy(): void;
}

export function createSoftMesh(frame: Frame, parts: readonly PartSpec[]): SoftMesh {
  const count = (GRID + 1) * (GRID + 1);
  const rest = new Float32Array(count * 2);
  const uvs = new Float32Array(count * 2);
  for (let row = 0; row <= GRID; row++) {
    for (let column = 0; column <= GRID; column++) {
      const i = row * (GRID + 1) + column;
      uvs[2 * i] = column / GRID;
      uvs[2 * i + 1] = row / GRID;
      rest[2 * i] = (column / GRID) * frame.width - frame.originX;
      rest[2 * i + 1] = (row / GRID) * frame.height - frame.originY;
    }
  }
  const indices = new Uint32Array(GRID * GRID * 6);
  let k = 0;
  for (let row = 0; row < GRID; row++) {
    for (let column = 0; column < GRID; column++) {
      const a = row * (GRID + 1) + column;
      const b = a + 1;
      const c = a + GRID + 1;
      indices.set([a, b, c, b, c + 1, c], k);
      k += 6;
    }
  }

  const geometry = new MeshGeometry({ positions: rest.slice(), uvs, indices });
  const compiled = compileChains(rest, parts);
  let moved = false;

  return {
    layer: (texture) => new Mesh({ geometry, texture }),
    pose(angles) {
      const still = parts.every((_, i) => (angles[i] ?? 0) === 0);
      // At rest the positions are already the rest ones; nothing to do until something moves.
      if (still && !moved) return;
      applyChains(rest, geometry.positions, compiled, angles);
      geometry.getBuffer("aPosition").update();
      moved = !still;
    },
    destroy() {
      geometry.destroy();
    },
  };
}
