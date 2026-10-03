"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const DEFAULT_CLASS =
  "m-auto w-[min(92vw,28rem)] rounded-sheet bg-bark-deep p-6 text-gold shadow-2xl ring-1 ring-ember/40 backdrop:bg-black/65";

/**
 * A native modal <dialog>: it traps focus, closes with Escape, and gives focus back to what opened it.
 * It is opened as soon as it is mounted, so render it only while it should be showing.
 */
export function ModalDialog({
  labelledBy,
  describedBy,
  onClose,
  children,
  className = DEFAULT_CLASS,
  style,
  handing,
  onCancel,
  persistent = false,
}: {
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** The sheet is leaving for the fire: the backdrop fades so the scene shows through. */
  handing?: boolean;
  /** Escape was pressed: call `preventDefault` to keep the dialog open. */
  onCancel?: (event: React.SyntheticEvent<HTMLDialogElement>) => void;
  /** Escape can't close it: it is only left by what the page does. */
  persistent?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    // No cleanup: a modal dialog that leaves the page leaves the top layer too, and closing it by hand
    // would call `onClose` for a dialog the page has already dropped.
    dialog.showModal();
    // The browser focuses the first thing it can; a dialog says where focus belongs with `data-autofocus`.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Escape closes the dialog by itself; this keeps React's state in step.
      onClose={(event) => {
        // A second Escape can close a dialog without a `cancel` event; a persistent one just opens again.
        if (persistent) {
          if (!event.currentTarget.open) event.currentTarget.showModal();
          return;
        }
        onClose();
      }}
      onCancel={(event) => {
        if (persistent) event.preventDefault();
        onCancel?.(event);
      }}
      className={className}
      style={style}
      data-handing={handing ? "" : undefined}
    >
      {children}
    </dialog>
  );
}

export const DIALOG_BUTTON =
  "min-h-11 rounded-full px-5 text-sm ring-1 ring-ember/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
export const DIALOG_PRIMARY = `${DIALOG_BUTTON} bg-ember/90 text-ink hover:bg-ember-soft disabled:opacity-40 disabled:hover:bg-ember/90`;
export const DIALOG_SECONDARY = `${DIALOG_BUTTON} bg-bark hover:bg-ember/20`;
