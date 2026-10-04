/** Small drawn symbols for the star cards: they carry meaning without a word on the paper. */

/** The ichthys, the fish: "I'm with you". Pressed, it is drawn brighter, with a thicker stroke and a soft glow. */
export function Ichthys({ pressed }: { pressed: boolean }) {
  return (
    <svg
      viewBox="0 0 34 20"
      aria-hidden="true"
      focusable="false"
      className="h-6 w-10 overflow-visible"
      style={pressed ? { filter: "drop-shadow(0 0 5px var(--color-ember))" } : undefined}
    >
      {pressed && (
        <path
          d="M2 10 Q14 -2 25 10 Q14 22 2 10Z"
          style={{ fill: "var(--color-ember)", opacity: 0.85 }}
        />
      )}
      <path
        d="M2 10 Q14 -2 25 10 L31 17 M2 10 Q14 22 25 10 L31 3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={pressed ? 3 : 1.6}
        style={{ stroke: pressed ? "var(--color-ink)" : "var(--color-ink-soft)" }}
      />
    </svg>
  );
}

/** A small flag: report. */
export function FlagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5"
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ stroke: "currentColor" }}
    >
      <path d="M5 21V3.5M5 4.5h12l-2.8 4 2.8 4H5" />
    </svg>
  );
}

/** A small spiked star: this one has been answered. */
export function SpikedStar() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="inline-block h-4 w-4 align-baseline"
      style={{ fill: "var(--color-ink-soft)" }}
    >
      <path d="M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z" />
    </svg>
  );
}
