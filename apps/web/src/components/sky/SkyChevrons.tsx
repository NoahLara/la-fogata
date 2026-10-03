"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene } from "@/scene/createScene";

const BUTTON =
  "pointer-events-auto absolute flex size-11 items-center justify-center rounded-full bg-bark/60 text-white transition-opacity hover:bg-bark/80 focus-visible:opacity-100 focus-visible:shadow-focus focus-visible:outline-none";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M12.5 4 6.5 10l6 6" : "M7.5 4l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Two white arrows at the edges of the sky that turn it, for anyone who can't or won't drag (WCAG 2.5.7). They show
 * only while the mouse is near the edges (`near`) or one has keyboard focus, and stay in the tab order the whole time.
 * Pressing one sets the sky turning like a carousel that doesn't stop, the stars moving the way the arrow points;
 * the other arrow turns it the other way.
 */
export function SkyChevrons({
  scene,
  bottom,
  near,
}: {
  scene: FogataScene;
  bottom: number;
  /** The mouse is near an edge of the sky. */
  near: boolean;
}) {
  const { t } = useI18n();
  const top = Math.max(8, bottom / 2 - 22);
  const turn = (direction: -1 | 1) => scene.sky.carousel(direction);
  return (
    <div role="group" aria-label={t.sky.turnControls}>
      <button
        type="button"
        aria-label={t.sky.turnLeft}
        onClick={() => turn(1)}
        style={{ top }}
        className={`${BUTTON} left-2 ${near ? "opacity-90" : "opacity-0"}`}
      >
        <Chevron direction="left" />
      </button>
      <button
        type="button"
        aria-label={t.sky.turnRight}
        onClick={() => turn(-1)}
        style={{ top }}
        className={`${BUTTON} right-2 ${near ? "opacity-90" : "opacity-0"}`}
      >
        <Chevron direction="right" />
      </button>
    </div>
  );
}
