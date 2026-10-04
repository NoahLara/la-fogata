"use client";

import { useEffect, useId, useRef, useState } from "react";
import { burdenLength } from "@/burden/burden";
import { PETITION_ANSWER_MAX_LENGTH } from "@/data/limits";
import type { Petition } from "@/data/types";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/I18nProvider";
import { limitAnswer } from "@/petition/petition";
import { cardState, countLabel } from "./cardState";
import { Ichthys } from "./glyphs";
import { PaperCard } from "./PaperCard";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const PRIMARY = `min-h-11 rounded-full bg-ember px-5 text-base font-medium text-ink shadow-ember hover:bg-ember-soft disabled:opacity-45 disabled:shadow-none disabled:hover:bg-ember ${FOCUS_RING}`;
const SECONDARY = `min-h-11 rounded-paper px-3 text-base text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-45 ${FOCUS_RING}`;

type View = "details" | "answering" | "returning";

/**
 * The visitor's own star's card, on the shared paper (see `PaperCard`). `onAnswer` and `onReturn` resolve to a gentle word when it could not be
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
  const { t, locale } = useI18n();
  const [view, setView] = useState<View>("details");
  const [line, setLine] = useState("");
  const [notice, setNotice] = useState<string>();
  const [working, setWorking] = useState(false);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();
  const answered = petition.answered;
  const state = cardState(petition);
  const accompany = countLabel(locale, t.sky, state);

  // Focus goes to the question when the star is about to go back to the fire.
  useEffect(() => {
    if (view === "returning") questionRef.current?.focus();
  }, [view]);

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
    <PaperCard
      petitionId={petition.id}
      star={star}
      scene={scene}
      labelledBy={textId}
      onClose={onClose}
    >
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

      {state.showCount && (
        <p className="flex items-center gap-2 text-ink-soft">
          <Ichthys pressed={false} />
          <span aria-hidden="true" className="text-base tabular-nums">
            {state.count}
          </span>
          <span className="sr-only">{accompany}</span>
        </p>
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
    </PaperCard>
  );
}
