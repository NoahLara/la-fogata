import { Container, Text } from "pixi.js";
import { softGlow } from "./glow";
import type { SceneLayout } from "./layout";

/** Marks the visitor's own animal: a small label that fades, and a soft glow when they do something. */
export interface YouMarker {
  /** Over everyone, so the label is never hidden behind a log or a tail. */
  container: Container;
  /** `at` is where their hands are (undefined hides it all); `label` and `glow` are 0..1. */
  update(
    at: { x: number; y: number; scale: number } | undefined,
    label: number,
    glow: number,
  ): void;
  destroy(): void;
}

export function createYouMarker(layout: SceneLayout, text: string, fontFamily: string): YouMarker {
  const container = new Container();
  const glow = softGlow(90, [255, 176, 96], 0.45);
  glow.visible = false;

  const label = new Text({
    text,
    style: {
      fill: 0xffe2b0,
      fontSize: Math.round(Math.max(12, 13 * layout.u)),
      fontFamily,
      letterSpacing: 1,
      dropShadow: { color: 0x000000, alpha: 0.7, blur: 3, distance: 0 },
    },
  });
  label.anchor.set(0.5, 1);
  label.visible = false;
  container.addChild(glow, label);

  return {
    container,
    update(at, labelAlpha, glowStrength) {
      if (!at) {
        glow.visible = false;
        label.visible = false;
        return;
      }
      glow.visible = glowStrength > 0.01;
      glow.position.set(at.x, at.y - 15 * at.scale);
      glow.scale.set(at.scale * (0.9 + 0.2 * glowStrength));
      glow.alpha = glowStrength;
      label.visible = labelAlpha > 0.01;
      label.position.set(at.x, at.y - 62 * at.scale);
      label.alpha = labelAlpha;
    },
    destroy() {
      container.destroy({ children: true });
    },
  };
}
