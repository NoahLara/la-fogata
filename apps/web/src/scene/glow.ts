import { FillGradient, Graphics } from "pixi.js";

/**
 * A soft round glow of `radius` around (0, 0): brightest in the middle and fading smoothly to nothing at the
 * edge, with no visible rings. It adds to the light under it.
 */
export function softGlow(
  radius: number,
  rgb: readonly [number, number, number],
  peak: number,
): Graphics {
  const [r, g, b] = rgb;
  const stop = (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  const fill = new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: stop(peak) },
      { offset: 0.45, color: stop(peak * 0.4) },
      { offset: 0.75, color: stop(peak * 0.1) },
      { offset: 1, color: stop(0) },
    ],
    textureSpace: "local",
  });
  const glow = new Graphics().circle(0, 0, radius).fill(fill);
  glow.blendMode = "add";
  return glow;
}
