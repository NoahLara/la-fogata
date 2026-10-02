"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flyTransform, FOLD, PAPER_TILT } from "@/design/fold";
import type { PaperMeasure } from "./measure";

/** Where the folded note ends up, in window coordinates: the animal's paws. */
export interface NoteTarget {
  x: number;
  y: number;
  height: number;
}

const EASE = "cubic-bezier(0.45, 0.05, 0.3, 1)";
const ms = (seconds: number) => seconds * 1000;

/** What a face of the paper shows: the cream, and (on the written side) the ruled lines with the writing on them. */
function Written({ measure, text }: { measure: PaperMeasure; text: string }) {
  const area = measure.text;
  return (
    <div
      className="ruled"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: area.left,
        top: area.top,
        width: area.width,
        height: area.height,
        overflow: "hidden",
        backgroundPosition: `0 ${-area.scrollTop}px`,
      }}
    >
      <div
        data-fold-text=""
        className="font-hand whitespace-pre-wrap text-ink"
        style={{
          fontSize: area.fontPx,
          lineHeight: `${area.lineHeightPx}px`,
          overflowWrap: "break-word",
          transform: `translateY(${-area.scrollTop}px)`,
        }}
      >
        {text}
      </div>
    </div>
  );
}

const WRITTEN_FACE: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to bottom, var(--color-paper) 55%, var(--color-paper-glow))",
};
const BLANK_FACE: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "var(--color-paper-shade)",
};
const SHADE: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgb(60 35 10)",
  opacity: 0,
};
const FLAT: CSSProperties = {
  position: "absolute",
  backfaceVisibility: "hidden",
  overflow: "hidden",
};

/**
 * The sheet folds in half twice like a letter (CSS 3D), shrinks and flies down to the animal's paws. The writing
 * fades as the first fold begins and is hidden under the first flap, so it is gone from the page before the note
 * leaves. `onFlyStart` is called as the note starts to fly and `onLanded` when it is at the paws, with false if
 * it could not be flown anywhere. It renders over the sheet, which is hidden meanwhile.
 */
export function FoldingNote({
  measure,
  text,
  getTarget,
  onFlyStart,
  onLanded,
}: {
  measure: PaperMeasure;
  text: string;
  getTarget: () => NoteTarget | undefined;
  onFlyStart: () => void;
  onLanded: (landed: boolean) => void;
}) {
  const { width: w, height: h } = measure;
  const [second, setSecond] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onFlyStart, onLanded, getTarget });
  useEffect(() => {
    callbacks.current = { onFlyStart, onLanded, getTarget };
  });
  // Resolves once React has drawn the second stage, so the swap never shows a frame in between.
  const swapped = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (second) {
      swapped.current?.();
      swapped.current = undefined;
    }
  }, [second]);

  useEffect(() => {
    const root = rootRef.current;
    const note = noteRef.current;
    if (!root || !note) return;
    let cancelled = false;
    const animations: Animation[] = [];
    const play = (element: Element, keyframes: Keyframe[], seconds: number, easing = EASE) => {
      const animation = element.animate(keyframes, {
        duration: ms(seconds),
        easing,
        fill: "forwards",
      });
      animations.push(animation);
      return animation.finished;
    };
    const part = (name: string) => [...root.querySelectorAll<HTMLElement>(`[data-fold="${name}"]`)];

    const run = async () => {
      // First fold: the bottom half comes up over the top, and the writing fades at once.
      part("text").forEach((element) =>
        play(element, [{ opacity: 1 }, { opacity: 0 }], FOLD.textFade, "ease-out"),
      );
      part("shade-front-1").forEach((element) =>
        play(element, [{ opacity: 0 }, { opacity: 0.4 }], FOLD.first / 2, "ease-in"),
      );
      part("shade-back-1").forEach((element) =>
        play(element, [{ opacity: 0.4 }, { opacity: 0 }], FOLD.first / 2, "ease-out"),
      );
      const [flap1] = part("flap-1");
      if (!flap1) return;
      await play(
        flap1,
        [
          { transform: "translateZ(1px) rotateX(0deg)" },
          { transform: "translateZ(1px) rotateX(180deg)" },
        ],
        FOLD.first,
      );
      if (cancelled) return;

      // Swap to the folded half (looks exactly the same, a plain blank half) so the second fold can begin.
      await new Promise<void>((resolve) => {
        swapped.current = resolve;
        setSecond(true);
      });
      if (cancelled) return;
      const [flap2] = part("flap-2");
      if (!flap2) return;
      part("shade-front-2").forEach((element) =>
        play(element, [{ opacity: 0 }, { opacity: 0.4 }], FOLD.second / 2, "ease-in"),
      );
      part("shade-back-2").forEach((element) =>
        play(element, [{ opacity: 0.4 }, { opacity: 0 }], FOLD.second / 2, "ease-out"),
      );
      await play(
        flap2,
        [
          { transform: "translateZ(1px) rotateY(0deg)" },
          { transform: "translateZ(1px) rotateY(-180deg)" },
        ],
        FOLD.second,
      );
      if (cancelled) return;

      // Fly: shrink and travel from where the folded note is to the animal's paws.
      const target = callbacks.current.getTarget();
      const marker = markerRef.current;
      if (!target || !marker) {
        callbacks.current.onLanded(false);
        return;
      }
      callbacks.current.onFlyStart();
      const at = marker.getBoundingClientRect();
      const fly = flyTransform({ x: at.left, y: at.top, height: h / 2 }, target, PAPER_TILT);
      await play(
        note,
        [
          { transform: "translate(0px, 0px) rotate(0rad) scale(1)" },
          {
            transform: `translate(${fly.x}px, ${fly.y}px) rotate(${fly.rotate}rad) scale(${fly.scale})`,
          },
        ],
        FOLD.fly,
        "cubic-bezier(0.5, 0, 0.25, 1)",
      );
      if (!cancelled) callbacks.current.onLanded(true);
    };
    run().catch(() => {
      // An animation cancelled by unmounting rejects its promise: nothing to do.
    });
    return () => {
      cancelled = true;
      for (const animation of animations) animation.cancel();
    };
    // The sequence runs once, for the sheet it was given.
  }, [h]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, perspective: `${Math.max(w, h) * 2.4}px` }}
    >
      <div
        ref={noteRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: h,
          transformOrigin: `${w / 4}px ${h / 4}px`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Where the middle of the folded note is, to measure from. */}
        <div
          ref={markerRef}
          style={{ position: "absolute", left: w / 4, top: h / 4, width: 0, height: 0 }}
        />
        {!second ? (
          <>
            <div style={{ position: "absolute", inset: 0, clipPath: "inset(0 0 50% 0)" }}>
              <div style={WRITTEN_FACE} />
              <Written measure={measure} text={text} />
            </div>
            <div
              data-fold="flap-1"
              style={{
                position: "absolute",
                left: 0,
                top: h / 2,
                width: w,
                height: h / 2,
                transformOrigin: "50% 0",
                transformStyle: "preserve-3d",
                transform: "translateZ(1px) rotateX(0deg)",
              }}
            >
              <div style={{ ...FLAT, inset: 0 }}>
                <div style={{ position: "absolute", left: 0, top: -h / 2, width: w, height: h }}>
                  <div style={WRITTEN_FACE} />
                  <Written measure={measure} text={text} />
                </div>
                <div data-fold="shade-front-1" style={SHADE} />
              </div>
              <div style={{ ...FLAT, inset: 0, transform: "rotateX(180deg)" }}>
                <div style={BLANK_FACE} />
                <div data-fold="shade-back-1" style={{ ...SHADE, opacity: 0.4 }} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: w / 2,
                height: h / 2,
                overflow: "hidden",
              }}
            >
              <div style={BLANK_FACE} />
            </div>
            <div
              data-fold="flap-2"
              style={{
                position: "absolute",
                left: w / 2,
                top: 0,
                width: w / 2,
                height: h / 2,
                transformOrigin: "0 50%",
                transformStyle: "preserve-3d",
                transform: "translateZ(1px) rotateY(0deg)",
              }}
            >
              <div style={{ ...FLAT, inset: 0 }}>
                <div style={BLANK_FACE} />
                <div data-fold="shade-front-2" style={SHADE} />
              </div>
              <div style={{ ...FLAT, inset: 0, transform: "rotateY(180deg)" }}>
                <div style={BLANK_FACE} />
                <div data-fold="shade-back-2" style={{ ...SHADE, opacity: 0.4 }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
