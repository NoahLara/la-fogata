import type { Graphics } from "pixi.js";
import { base, blush, circle, circleBand, ellipse, smile } from "./draw";

const BLACK = "#1d1b22";
const WHITE = "#eee8dc";

export function drawPanda(g: Graphics, back: boolean): void {
  circle(g, BLACK, -18, -95, 8.5);
  circle(g, BLACK, 18, -95, 8.5);
  base(g, { body: WHITE, foot: BLACK, back });
  if (back) circleBand(g, BLACK, 0, -31, 31, -62, -46);
  ellipse(g, BLACK, -25, -33, 8, 14, 0.35);
  ellipse(g, BLACK, 25, -33, 8, 14, -0.35);
  circle(g, WHITE, 0, -74, 25);
  if (!back) {
    ellipse(g, BLACK, -10, -74, 6.5, 8.5, 0.55);
    ellipse(g, BLACK, 10, -74, 6.5, 8.5, -0.55);
    circle(g, "#f6f2ea", -9.5, -76.5, 1.7);
    circle(g, "#f6f2ea", 9.5, -76.5, 1.7);
    blush(g, 0.3);
    ellipse(g, BLACK, 0, -67, 3.4, 2.4);
    smile(g, BLACK, -63);
  }
}
