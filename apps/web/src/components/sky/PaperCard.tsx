"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { paperOutline, PAPER_SEED } from "@/design/paperEdge";
import { useVisualViewport } from "@/design/useVisualViewport";

const OUTLINE = paperOutline(PAPER_SEED)
  .map(({ x, y }) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
  .join(" ");

/** Room between the star and its card, and the card's width, in pixels. */
const GAP = 28;
export const CARD_WIDTH = 320;
const MARGIN = 8;

/** Where the card's top left goes on wide screens: beside the star, on whichever side has room. */
export function cardPosition(
  star: { x: number; y: number },
  scene: { width: number; height: number },
): { left: number; top: number } {
  const right = star.x + GAP;
  const left = right + CARD_WIDTH + MARGIN <= scene.width ? right : star.x - GAP - CARD_WIDTH;
  return {
    left: Math.max(MARGIN, left),
    top: Math.max(MARGIN, Math.min(star.y - 24, scene.height - 280)),
  };
}

/**
 * The paper with a gold edge every star's card is written on, beside its star (a bottom sheet on phones). It is not
 * modal: Escape, a tap outside or tabbing out closes it, and focus goes into it when it opens.
 */
export function PaperCard({
  petitionId,
  star,
  scene,
  label,
  labelledBy,
  onClose,
  children,
}: {
  petitionId: string;
  star: { x: number; y: number };
  scene: { width: number; height: number };
  /** The dialog's name, when no text on it is its name. */
  label?: string;
  labelledBy?: string;
  /** `refocus` is false when focus is already going somewhere else (tabbing out, a tap elsewhere). */
  onClose: (refocus: boolean) => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { inset } = useVisualViewport();
  const position = cardPosition(star, scene);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  // Escape or a tap outside closes it, and focus returns to the star.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close.current(true);
    };
    const pointerdown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (rootRef.current?.contains(target)) return;
      // The star's own button toggles the card, so it decides.
      if (target.closest(`[data-star-id="${CSS.escape(petitionId)}"]`)) return;
      close.current(false);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, [petitionId]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onBlur={(event) => {
        // Focus went to something outside the card: tabbing out closes it. (No next target means the element
        // that had focus went away, such as a button that was replaced.)
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) onClose(false);
      }}
      style={
        {
          "--card-left": `${position.left}px`,
          "--card-top": `${position.top}px`,
          "--keyboard": `${inset}px`,
        } as React.CSSProperties
      }
      className="pointer-events-auto absolute z-20 outline-none sm:top-(--card-top) sm:left-(--card-left) sm:w-80 max-sm:fixed max-sm:inset-x-0 max-sm:top-0 max-sm:bottom-(--keyboard) max-sm:m-auto max-sm:h-fit max-sm:w-[min(92vw,30rem)]"
    >
      <div data-edge="gold" className="paper-sheet relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="paper-shape absolute inset-0 h-full w-full"
        >
          <polygon points={OUTLINE} style={{ fill: "var(--color-paper)" }} />
        </svg>
        <div className="relative flex flex-col gap-3 px-8 pt-7 pb-6">{children}</div>
      </div>
    </div>
  );
}
