"use client";

import { useEffect, useId, useRef, useState } from "react";
import { burdenLength } from "@/burden/burden";
import { paperOutline, PAPER_SEED } from "@/design/paperEdge";
import { useVisualViewport } from "@/design/useVisualViewport";
import { useI18n } from "@/i18n/I18nProvider";
import { ModalDialog } from "../ModalDialog";
import { FoldingNote, type NoteTarget } from "./FoldingNote";
import { measurePaper, type PaperMeasure } from "./measure";

/** How long the title and buttons take to fade, so only paper and writing are left to fold. */
const CHROME_FADE_MS = 200;
/** With reduced motion the sheet fades out; this is how long before the scene's note takes over. */
const LEAVE_MS = 250;

const OUTLINE = paperOutline(PAPER_SEED)
  .map(({ x, y }) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
  .join(" ");

const FADE = "transition-opacity duration-200 motion-reduce:transition-none";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * Writing, then: the title and buttons fade, the sheet folds twice like a letter, and the folded note flies down to
 * the animal's paws, where the scene takes it. With reduced motion the sheet just fades.
 */
type Stage = "writing" | "fading" | "folding" | "leaving" | "done";

/** The words on the sheet. */
export interface PaperCopy {
  title: string;
  helper: string;
  placeholder: string;
  fieldLabel: string;
  submit: string;
  cancel: string;
}

/** What the sheet accepts, and what it says about the limit. */
export interface PaperRules {
  /** Cuts text down to what fits, never splitting a character. */
  limit: (text: string) => string;
  canSubmit: (text: string) => boolean;
  /** What the visible counter says for this many characters; empty hides it. */
  counter: (count: number) => string;
  /** What a screen reader is told about the limit, only at a few points, otherwise empty. */
  announce: (count: number) => string;
}

/**
 * A sheet of paper by the fire where someone writes. The text lives only in this component's state and, for the
 * fold, in a copy on the folding paper: it is handed to `onSubmit` once, never stored, sent or logged by the
 * dialog, and is cleared when the folded note leaves the page. The scene never gets it.
 */
export function PaperDialog({
  copy,
  rules,
  edge = "none",
  notice,
  onSubmit,
  getTarget,
  onLaunch,
  onAbort,
  onClose,
}: {
  copy: PaperCopy;
  rules: PaperRules;
  /** A gold edge marks a sheet that becomes something more than ash. */
  edge?: "gold" | "none";
  /** Called once with what was written, when it is handed over. Resolves to false if it can't be (then nothing happens). */
  onSubmit: (text: string) => boolean | Promise<boolean>;
  /** Something to tell them on the sheet itself (a modal hides the rest of the page), such as why it was not taken. */
  notice?: string | undefined;
  /** Where the folded note should land: the animal's paws, in window coordinates. */
  getTarget: () => NoteTarget | undefined;
  /** The note is at the paws: the scene takes it. Returns false if it could not. */
  onLaunch: () => boolean;
  /** The ritual was started but could not finish. */
  onAbort: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [stage, setStage] = useState<Stage>("writing");
  // The sheet as it was and a copy of its writing, only for the folding paper.
  const [fold, setFold] = useState<{ measure: PaperMeasure; text: string } | undefined>();
  // The note is flying: the backdrop fades so the scene shows through.
  const [handing, setHanding] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef(new Set<number>());
  const started = useRef(false);
  // `onSubmit` may take a moment: a second tap meanwhile does nothing.
  const submitting = useRef(false);
  const launched = useRef(false);
  const abort = useRef(onAbort);
  useEffect(() => {
    abort.current = onAbort;
  });
  const titleId = useId();
  const helperId = useId();
  const counterId = useId();
  const { inset, height } = useVisualViewport();

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
      pending.clear();
      // Gone in the middle of the ritual: it can't finish, so let the page know.
      if (started.current && !launched.current) abort.current();
    };
  }, []);

  const later = (action: () => void, ms: number) => {
    timers.current.add(window.setTimeout(action, ms));
  };

  /** The note is at the paws (or, with reduced motion, the sheet has faded): the scene takes it. */
  const launch = () => {
    launched.current = true;
    if (!onLaunch()) {
      onAbort();
      onClose();
      return;
    }
    // The folded paper has done its job: the writing on it goes.
    setFold(undefined);
    setStage("done");
    later(onClose, 150);
  };

  const beginFold = (written: string) => {
    const paper = paperRef.current;
    const field = fieldRef.current;
    if (!paper || !field) return;
    setFold({ measure: measurePaper(paper, field), text: written });
    setText("");
    setStage("folding");
  };

  const submit = async () => {
    if (stage !== "writing" || submitting.current || !rules.canSubmit(text)) return;
    const written = text.trim();
    submitting.current = true;
    let accepted = false;
    try {
      accepted = await onSubmit(written);
    } catch (error) {
      // Whatever went wrong, the sheet must not be left unable to try again.
      console.error("Could not hand over the sheet", error);
    } finally {
      submitting.current = false;
    }
    if (!accepted) return;
    started.current = true;
    setStage("fading");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // No fold: the sheet fades away and the scene's note fades into the fire.
      setHanding(true);
      setStage("leaving");
      setText("");
      later(launch, LEAVE_MS);
      return;
    }
    later(() => beginFold(written), CHROME_FADE_MS);
  };

  // Everything but the paper and the writing fades once the ritual starts.
  const fading = stage !== "writing";
  const count = burdenLength(text);
  const announced = rules.announce(count);
  const counterText = rules.counter(count);

  return (
    <ModalDialog
      labelledBy={titleId}
      describedBy={helperId}
      onClose={onClose}
      handing={handing}
      onCancel={(event) => {
        // Escape must not cut the ritual short.
        if (stage !== "writing") event.preventDefault();
      }}
      className="paper-dialog m-auto w-[min(92vw,30rem)] max-sm:fixed max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-[var(--keyboard,0px)] max-sm:m-0 max-sm:w-full"
      style={
        {
          "--keyboard": `${inset}px`,
          "--viewport": height ? `${height}px` : "100dvh",
        } as React.CSSProperties
      }
    >
      <div
        ref={paperRef}
        data-focused={focused ? "" : undefined}
        data-edge={edge}
        // Wider than the screen on phones, so the tilted corners never show a gap.
        className={`paper-sheet relative max-sm:-mx-2 max-sm:-mb-3 ${stage === "leaving" ? "opacity-0 transition-opacity duration-200 motion-reduce:transition-none" : ""}`}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className={`paper-shape absolute inset-0 h-full w-full ${stage === "folding" || stage === "done" ? "invisible" : ""}`}
        >
          <defs>
            <linearGradient id="paper-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-paper)" }} />
              <stop offset="0.55" style={{ stopColor: "var(--color-paper)" }} />
              {/* Lit warmly from below by the fire. */}
              <stop offset="1" style={{ stopColor: "var(--color-paper-glow)" }} />
            </linearGradient>
          </defs>
          <polygon points={OUTLINE} fill="url(#paper-fill)" />
        </svg>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className={`relative flex flex-col gap-3 px-8 pt-9 pb-6 max-sm:px-9 max-sm:pb-8 sm:px-11 ${stage === "folding" || stage === "done" ? "invisible" : ""}`}
        >
          <h2
            id={titleId}
            className={`font-title text-3xl leading-tight text-ink ${FADE} ${fading ? "opacity-0" : ""}`}
          >
            {copy.title}
          </h2>
          <p id={helperId} className={`text-sm text-ink-soft ${FADE} ${fading ? "opacity-0" : ""}`}>
            {copy.helper}
          </p>
          <textarea
            ref={fieldRef}
            autoFocus
            readOnly={fading || handing}
            value={text}
            onChange={(event) => setText(rules.limit(event.target.value))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={copy.placeholder}
            aria-label={copy.fieldLabel}
            aria-describedby={`${helperId} ${counterId}`}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            // The writing area shrinks when the keyboard takes up much of a phone's screen.
            className="ruled font-hand m-0 block h-[clamp(4rem,calc(var(--viewport)-18rem),12rem)] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[1.65rem] text-ink caret-ink outline-none placeholder:text-ink-faint"
          />
          <p
            id={counterId}
            aria-hidden="true"
            className={`h-5 self-end text-sm text-ink-soft tabular-nums ${FADE} ${fading ? "opacity-0" : ""}`}
          >
            {counterText}
          </p>
          <p role="status" className="text-center text-sm text-ink">
            {notice}
          </p>
          {/* Said aloud only at a few points, not on every keystroke. */}
          <p role="status" className="sr-only">
            {announced}
          </p>
          <div
            className={`flex items-center justify-end gap-4 ${FADE} ${fading ? "opacity-0" : ""}`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`min-h-11 rounded-paper px-3 text-base text-ink-soft underline-offset-4 hover:text-ink hover:underline ${FOCUS_RING}`}
            >
              {copy.cancel}
            </button>
            <button
              type="submit"
              disabled={!rules.canSubmit(text) || fading || handing}
              className={`min-h-11 rounded-full bg-ember px-6 text-base font-medium text-ink shadow-ember hover:bg-ember-soft disabled:opacity-45 disabled:shadow-none disabled:hover:bg-ember ${FOCUS_RING}`}
            >
              {copy.submit}
            </button>
          </div>
          <p className={`text-center text-xs text-ink-soft ${FADE} ${fading ? "opacity-0" : ""}`}>
            {t.common.notProfessionalHelp}
          </p>
        </form>
        {fold && stage === "folding" && (
          <FoldingNote
            measure={fold.measure}
            text={fold.text}
            getTarget={getTarget}
            onFlyStart={() => setHanding(true)}
            onLanded={(landed) => {
              if (landed) launch();
              else {
                onAbort();
                onClose();
              }
            }}
          />
        )}
      </div>
    </ModalDialog>
  );
}
