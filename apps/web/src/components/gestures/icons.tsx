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
    <svg {...COMMON}>
      <path d="M4 17.5 14 9.5" />
      <path d="M8 19.5 20 11" />
      <circle cx="16.4" cy="7.4" r="1.3" />
      <path d="M4 20.2h6" />
    </svg>
  );
}

export function BurdenIcon() {
  return (
    <svg {...COMMON}>
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9.5 12.5h5M9.5 15.5h5" />
    </svg>
  );
}

export function PetitionIcon() {
  return (
    <svg {...COMMON}>
      <path d="m12 3.5 2.4 5.2 5.6.7-4.1 3.9 1 5.6L12 16.2l-4.9 2.7 1-5.6L4 9.4l5.6-.7L12 3.5Z" />
    </svg>
  );
}
