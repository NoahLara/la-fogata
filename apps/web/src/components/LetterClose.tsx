"use client";

import { useI18n } from "@/i18n/I18nProvider";

/** The X in the corner of a letter panel: closes it, with a 44 px target and a name for screen readers. */
export function LetterClose({
  onClick,
  hidden = false,
}: {
  onClick: () => void;
  /** Out of sight and out of reach while a ritual is under way. */
  hidden?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t.common.close}
      onClick={onClick}
      tabIndex={hidden ? -1 : undefined}
      className={`absolute top-3 right-3 z-10 inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-opacity duration-200 btn-press hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${hidden ? "pointer-events-none opacity-0" : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        aria-hidden="true"
        focusable="false"
        style={{ stroke: "currentColor" }}
        strokeWidth={2}
        strokeLinecap="round"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
