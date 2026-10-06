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
import { LetterDate } from "./LetterDate";
import { LetterBody, LetterFoot, LetterHead, PaperCard } from "./PaperCard";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const PRIMARY = `min-h-11 rounded-full btn-ember px-5 text-base font-medium disabled:opacity-60 ${FOCUS_RING}`;
const SECONDARY = `min-h-11 rounded-paper px-3 text-base text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-45 ${FOCUS_RING}`;

type View = "details" | "answering" | "returning";

/**
 * The visitor's own star's card, on the shared paper (see `PaperCard`). `onAnswer` and `onReturn` resolve to a gentle word when it could not be
 * done (the card stays open and says it), or to nothing when it is done (the page closes the card).
 */
export function StarCard({
  petition,
  busy,
  onClose,
  onAnswer,
  onReturn,
}: {
  petition: Petition;
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
  const openerRef = useRef<HTMLButtonElement>(null);
  // Set when a sub-view is left, so focus lands on the button that opened it instead of being lost with it.
  const restoreFocus = useRef(false);
  const textId = useId();
  const answered = petition.answered;
  const state = cardState(petition);
  const accompany = countLabel(locale, t.sky, state);

  // Focus goes to the question when the star is about to go back to the fire.
  useEffect(() => {
    if (view === "returning") questionRef.current?.focus();
    if (view === "details" && restoreFocus.current) {
      restoreFocus.current = false;
      openerRef.current?.focus();
    }
  }, [view]);

  const backToDetails = () => {
    restoreFocus.current = true;
    setView("details");
  };

  const run = async (action: () => Promise<string | undefined>) => {
    if (working || busy) return;
    setWorking(true);
    try {
      const word = await action();
      if (word) {
        setNotice(word);
        backToDetails();
      }
    } catch (error) {
      console.error("Could not change the petition", error);
      setNotice(t.sky.failed);
      backToDetails();
    } finally {
      setWorking(false);
    }
  };

  const count = burdenLength(line);

  return (
    <PaperCard petitionId={petition.id} labelledBy={textId} onClose={onClose}>
      <LetterHead>
        <LetterDate day={petition.createdOn} kind="written" />
      </LetterHead>

      {view === "answering" ? (
        <form
          className="flex min-h-0 flex-1 flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => onAnswer(line.trim()));
          }}
        >
          {/* What was asked stays in view above, with room of its own to scroll when it is long. */}
          <div
            tabIndex={0}
            className="letter-scroll max-h-[34%] shrink-0 overflow-y-auto overscroll-contain pr-2 pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <p
              id={textId}
              className="font-hand text-[1.4rem] leading-8 break-words whitespace-pre-wrap text-ink-soft"
            >
              {petition.text}
            </p>
          </div>
          <label htmlFor={`${textId}-line`} className="shrink-0 text-sm text-ink-soft">
            {t.sky.answerFieldLabel}
          </label>
          <p id={`${textId}-help`} className="shrink-0 text-sm text-ink-soft">
            {t.sky.answerHelper}
          </p>
          <textarea
            id={`${textId}-line`}
            autoFocus
            value={line}
            onChange={(event) => setLine(limitAnswer(event.target.value))}
            placeholder={t.sky.answerPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={`${textId}-help ${textId}-count`}
            className="ruled font-hand m-0 block min-h-0 w-full flex-1 resize-none overflow-y-auto border-0 bg-transparent p-0 text-[1.5rem] text-ink caret-ink outline-none placeholder:text-ink-faint"
          />
          <p
            id={`${textId}-count`}
            aria-hidden="true"
            className="h-5 shrink-0 self-end text-sm text-ink-soft tabular-nums"
          >
            {format(t.sky.counter, { count, max: PETITION_ANSWER_MAX_LENGTH })}
          </p>
          <LetterFoot>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className={SECONDARY}
                onClick={() => {
                  setLine("");
                  backToDetails();
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
          </LetterFoot>
        </form>
      ) : (
        <>
          <LetterBody>
            <p
              id={textId}
              className="font-hand text-[1.65rem] leading-9 break-words whitespace-pre-wrap text-ink"
            >
              {petition.text}
            </p>
            {answered && (
              <div className="mt-6 border-t border-ink/15 pt-4">
                <div className="flex items-center justify-between gap-3 pb-2">
                  <p className="text-sm font-medium text-ink-soft">{t.sky.answered}</p>
                  <LetterDate day={answered.on} kind="answered" />
                </div>
                {answered.note && (
                  <>
                    <p className="text-sm text-ink-soft">{t.sky.answerFieldLabel}</p>
                    <p className="font-hand text-[1.5rem] leading-8 break-words whitespace-pre-wrap text-ink">
                      {answered.note}
                    </p>
                  </>
                )}
              </div>
            )}
            {view === "returning" && (
              <p
                ref={questionRef}
                tabIndex={-1}
                className="mt-6 border-t border-ink/15 pt-4 text-base text-ink outline-none"
              >
                {t.sky.returnQuestion}
              </p>
            )}
          </LetterBody>
          <LetterFoot>
            {view === "returning" ? (
              <div className="flex items-center justify-end gap-3">
                <button type="button" className={SECONDARY} onClick={backToDetails}>
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
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-h-11 items-center gap-2 text-ink-soft">
                  {state.showCount && (
                    <>
                      <Ichthys pressed={false} />
                      <span aria-hidden="true" className="text-base tabular-nums">
                        {state.count}
                      </span>
                      <span className="sr-only">{accompany}</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    ref={openerRef}
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
              </div>
            )}
            <p role="status" className="pt-1 text-center text-sm text-ink">
              {notice}
            </p>
          </LetterFoot>
        </>
      )}
    </PaperCard>
  );
}
