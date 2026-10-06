"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PAPER_OUTLINE_POINTS } from "@/design/paperEdge";
import { useVisualViewport } from "@/design/useVisualViewport";

/**
 * The letter panel every star's card is read on: the whole height of the screen on the right, with room around
 * it (a sheet with margins at the sides on a phone), on paper with a gold edge. It is not modal: Escape, a tap
 * outside or tabbing out closes it, and focus goes into it when it opens. Inside, use `LetterHead`, `LetterBody`
 * (which scrolls on its own when the writing is long) and `LetterFoot` (always in view).
 */
export function PaperCard({
  petitionId,
  label,
  labelledBy,
  onClose,
  children,
}: {
  petitionId: string;
  /** The dialog's name, when no text on it is its name. */
  label?: string;
  labelledBy?: string;
  /** `refocus` is false when focus is already going somewhere else (tabbing out, a tap elsewhere). */
  onClose: (refocus: boolean) => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { inset } = useVisualViewport();

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
      style={{ "--keyboard": `${inset}px` } as React.CSSProperties}
      className="letter-panel pointer-events-auto outline-none"
    >
      <div data-edge="gold" className="paper-sheet relative h-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="paper-shape absolute inset-0 h-full w-full"
        >
          <polygon points={PAPER_OUTLINE_POINTS} style={{ fill: "var(--color-paper)" }} />
        </svg>
        <div className="relative flex h-full flex-col px-6 pt-7 pb-5 sm:px-9 sm:pt-9">
          {children}
        </div>
      </div>
    </div>
  );
}

/** What heads the letter: its date, on the right. */
export function LetterHead({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-col items-end gap-1 pb-4">{children}</div>;
}

/** The writing. It takes the height that is left and scrolls inside itself, so the head and the foot stay put. */
export function LetterBody({ children }: { children: ReactNode }) {
  return (
    <div
      // A scrolling region has to be reachable by the keyboard to be read with it.
      tabIndex={0}
      className="letter-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {children}
    </div>
  );
}

/** What is always in view at the bottom of the letter: the fish, the flag, the buttons. */
export function LetterFoot({ children }: { children: ReactNode }) {
  return <div className="shrink-0 border-t border-ink/15 pt-3">{children}</div>;
}
