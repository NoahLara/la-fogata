import { FillGradient } from "pixi.js";

/** A top-to-bottom gradient over the shape it fills. Offsets run 0 to 1. */
export function verticalGradient(stops: readonly (readonly [number, string])[]): FillGradient {
  return new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: stops.map(([offset, color]) => ({ offset, color })),
    textureSpace: "local",
  });
}
