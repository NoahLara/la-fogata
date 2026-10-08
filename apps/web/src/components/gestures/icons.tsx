/** Small line icons for the gesture bar. Decorative: the buttons carry their own labels. */
const COMMON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function WoodIcon() {
  return (
    <svg {...COMMON} width={26} height={26}>
      {/* Two logs leaning together, and a flame leaping above them. */}
      <path d="M4 19.5 14.5 12.5" />
      <path d="M20 19.5 9.5 12.5" />
      <path d="M3.5 21h17" />
      <path
        className="gesture-flame"
        d="M12 3c.4 2.2 2.6 3.2 2.6 5.4a2.6 2.6 0 0 1-5.2 0c0-1 .5-1.7 1-2.3.7-.8 1.4-1.6 1.6-3.1Z"
      />
    </svg>
  );
}

export function BurdenIcon() {
  return (
    <svg {...COMMON}>
      {/* A rock: the weight you set down by the fire. */}
      <path d="M4.5 18.5c-1-1.6-.8-4.2.6-6.4l2.6-4.1a2.2 2.2 0 0 1 2.2-1l4.6.7c.8.1 1.5.6 1.9 1.3l1.9 3.5c.9 1.6 1 3.5.2 6-.2.6-.7 1-1.3 1H5.8c-.5 0-1-.4-1.3-1Z" />
      <path className="gesture-lines" d="M9.5 8.2 11 12.5l3.8 1.2M11 12.5l-.8 4.3" />
    </svg>
  );
}

export function PetitionIcon() {
  return (
    <svg {...COMMON}>
      {/* A star with a thread of smoke rising to it. */}
      <path
        className="gesture-star"
        d="m12 3 2.1 4.6 5 .6-3.7 3.4 1 5-4.4-2.5-4.4 2.5 1-5L4.9 8.2l5-.6L12 3Z"
      />
      <path className="gesture-lines" d="M12 17.8c-1 .8-1 1.6 0 2.2s1 1.2 0 1.8" />
    </svg>
  );
}
