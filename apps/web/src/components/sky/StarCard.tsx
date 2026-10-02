"use client";

import { useEffect, useId, useRef, useState } from "react";
import { burdenLength } from "@/burden/burden";
import { PETITION_ANSWER_MAX_LENGTH } from "@/data/limits";
import type { Petition } from "@/data/types";
import { paperOutline, PAPER_SEED } from "@/design/paperEdge";
import { useVisualViewport } from "@/design/useVisualViewport";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/I18nProvider";
import { limitAnswer } from "@/petition/petition";

const OUTLINE = paperOutline(PAPER_SEED)
  .map(({ x, y }) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
  .join(" ");

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const PRIMARY = `min-h-11 rounded-full bg-ember px-5 text-base font-medium text-ink shadow-ember hover:bg-ember-soft disabled:opacity-45 disabled:shadow-none disabled:hover:bg-ember ${FOCUS_RING}`;
const SECONDARY = `min-h-11 rounded-paper px-3 text-base text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-45 ${FOCUS_RING}`;

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

type View = "details" | "answering" | "returning";

/**
 * A petition's card: paper with a gold edge, beside its star (a bottom sheet on phones). It is not modal: Escape,
 * a tap outside or tabbing out closes it. `onAnswer` and `onReturn` resolve to a gentle word when it could not be
 * done (the card stays open and says it), or to nothing when it is done (the page closes the card).
 */
export function StarCard({
  petition,
  star,
  scene,
  busy,
  onClose,
  onAnswer,
  onReturn,
}: {
  petition: Petition;
  star: { x: number; y: number };
  scene: { width: number; height: number };
  busy: boolean;
  /** `refocus` is false when focus is already going somewhere else (tabbing out, a tap elsewhere). */
  onClose: (refocus: boolean) => void;
  onAnswer: (line: string) => Promise<string | undefined>;
  onReturn: () => Promise<string | undefined>;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("details");
  const [line, setLine] = useState("");
  const [notice, setNotice] = useState<string>();
  const [working, setWorking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();
  const { inset } = useVisualViewport();
  const answered = petition.answered;
  const position = cardPosition(star, scene);

  // Focus goes into the card when it opens, and to the question when the star is about to go back to the fire.
  useEffect(() => {
    rootRef.current?.focus();
  }, []);
  useEffect(() => {
    if (view === "returning") questionRef.current?.focus();
  }, [view]);

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
      if (target.closest(`[data-star-id="${CSS.escape(petition.id)}"]`)) return;
      close.current(false);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, [petition.id]);

  const run = async (action: () => Promise<string | undefined>) => {
    if (working || busy) return;
    setWorking(true);
    try {
      const word = await action();
      if (word) {
        setNotice(word);
        setView("details");
      }
    } catch (error) {
      console.error("Could not change the petition", error);
      setNotice(t.sky.failed);
      setView("details");
    } finally {
      setWorking(false);
    }
  };

  const count = burdenLength(line);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={textId}
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
      className="pointer-events-auto absolute z-20 outline-none sm:top-(--card-top) sm:left-(--card-left) sm:w-80 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-(--keyboard)"
    >
      <div data-edge="gold" className="paper-sheet relative max-sm:-mx-2 max-sm:-mb-3">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="paper-shape absolute inset-0 h-full w-full"
        >
          <polygon points={OUTLINE} style={{ fill: "var(--color-paper)" }} />
        </svg>
        <div className="relative flex flex-col gap-3 px-8 pt-7 pb-6 max-sm:px-9 max-sm:pb-8">
          <p id={textId} className="font-hand text-[1.65rem] leading-8 break-words text-ink">
            {petition.text}
          </p>
          {answered && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-ink-soft">{t.sky.answered}</p>
              {answered.note && (
                <>
                  <p className="text-sm text-ink-soft">{t.sky.answerFieldLabel}</p>
                  <p className="font-hand text-[1.5rem] leading-8 break-words text-ink">
                    {answered.note}
                  </p>
                </>
              )}
            </div>
          )}

          {view === "answering" && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => onAnswer(line.trim()));
              }}
            >
              <label htmlFor={`${textId}-line`} className="text-sm text-ink-soft">
                {t.sky.answerFieldLabel}
              </label>
              <textarea
                id={`${textId}-line`}
                autoFocus
                value={line}
                onChange={(event) => setLine(limitAnswer(event.target.value))}
                placeholder={t.sky.answerPlaceholder}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby={`${textId}-count`}
                className="ruled font-hand m-0 block h-24 w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[1.5rem] text-ink caret-ink outline-none placeholder:text-ink-faint"
              />
              <p
                id={`${textId}-count`}
                aria-hidden="true"
                className="h-5 self-end text-sm text-ink-soft tabular-nums"
              >
                {format(t.sky.counter, { count, max: PETITION_ANSWER_MAX_LENGTH })}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className={SECONDARY}
                  onClick={() => {
                    setLine("");
                    setView("details");
                  }}
                >
                  {t.sky.cancel}
                </button>
                <button
                  type="submit"
                  disabled={working || busy || line.trim() === ""}
                  className={PRIMARY}
                >
                  {t.sky.confirm}
                </button>
              </div>
            </form>
          )}

          {view === "returning" && (
            <div className="flex flex-col gap-3">
              <p ref={questionRef} tabIndex={-1} className="text-base text-ink outline-none">
                {t.sky.returnQuestion}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button type="button" className={SECONDARY} onClick={() => setView("details")}>
                  {t.sky.cancel}
                </button>
                <button
                  type="button"
                  disabled={working || busy}
                  className={PRIMARY}
                  onClick={() => void run(onReturn)}
                >
                  {t.sky.returnConfirm}
                </button>
              </div>
            </div>
          )}

          {view === "details" && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                className={SECONDARY}
                onClick={() => {
                  setNotice(undefined);
                  setView("returning");
                }}
              >
                {t.sky.returnToFire}
              </button>
              {!answered && (
                <button
                  type="button"
                  disabled={busy}
                  className={PRIMARY}
                  onClick={() => {
                    setNotice(undefined);
                    setView("answering");
                  }}
                >
                  {t.sky.markAnswered}
                </button>
              )}
            </div>
          )}
          <p role="status" className="text-center text-sm text-ink">
            {notice}
          </p>
        </div>
      </div>
    </div>
  );
}
