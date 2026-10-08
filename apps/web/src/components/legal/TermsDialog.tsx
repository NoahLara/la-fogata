"use client";

import { useId } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { HELPLINE_URL } from "@/i18n/links";
import { DIALOG_PRIMARY, DIALOG_SECONDARY, ModalDialog } from "../ModalDialog";

const SECTIONS = [
  "company",
  "age",
  "privacy",
  "petitions",
  "respect",
  "liability",
  "changes",
] as const;

const PANEL =
  "m-auto flex max-h-[calc(100dvh-2rem)] w-[min(94vw,34rem)] flex-col rounded-sheet bg-bark-deep p-0 text-gold shadow-2xl ring-1 ring-ember/40 backdrop:bg-black/65 max-sm:mb-0 max-sm:mt-auto max-sm:max-h-[92dvh] max-sm:w-full max-sm:rounded-b-none";

/**
 * The terms. Asked for once (`mode="accept"`): it cannot be dismissed, only accepted. Read again from the settings
 * (`mode="read"`): it only closes.
 */
export function TermsDialog({
  mode,
  onAccept,
  onClose,
}: {
  mode: "accept" | "read";
  onAccept?: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const accepting = mode === "accept";
  return (
    <ModalDialog
      labelledBy={titleId}
      onClose={onClose}
      className={PANEL}
      // Escape must not skip the agreement.
      onCancel={accepting ? (event) => event.preventDefault() : undefined}
    >
      <div className="px-6 pt-6 pb-3">
        <h2 id={titleId} className="font-title text-xl font-medium">
          {t.terms.title}
        </h2>
        <p className="mt-1 text-sm text-gold/80">{t.terms.intro}</p>
      </div>
      {/* Long text scrolls on its own; it takes the keyboard so it can be read without a mouse. */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={titleId}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-y border-ember/20 px-6 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
      >
        {SECTIONS.map((key) => (
          <section key={key}>
            <h3 className="text-sm font-medium text-ember-soft">{t.terms[key].heading}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gold/90">{t.terms[key].body}</p>
            {key === "company" && (
              <a
                href={HELPLINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                {t.help.link}
              </a>
            )}
          </section>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {accepting ? (
          <>
            <p className="text-xs text-gold/70">{t.terms.acceptNote}</p>
            <button type="button" onClick={onAccept} className={DIALOG_PRIMARY}>
              {t.terms.accept}
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className={DIALOG_SECONDARY}>
            {t.common.close}
          </button>
        )}
        <p className="text-xs text-gold/60">{t.common.notProfessionalHelp}</p>
      </div>
    </ModalDialog>
  );
}
