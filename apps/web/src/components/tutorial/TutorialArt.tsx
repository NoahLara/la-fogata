import { useId, type ReactNode } from "react";
import type { TutorialStep } from "@/tutorial/tutorial";

/**
 * The small drawing over each step of the tutorial. They are made of the same things the scene is made of (the
 * same flame, the same star, the same fish), in the theme's colours, so what is taught looks like what the visitor
 * has in front of them. Every drawing is decorative: the words say it all. Each is a still picture that reads on its
 * own; the movement (`tutorial-*` in globals.css) is added only when the visitor has not asked for less of it.
 */

/** The little stars of the night behind every drawing. */
const NIGHT: readonly [number, number, number][] = [
  [22, 20, 1.3],
  [58, 11, 1],
  [96, 24, 1.1],
  [150, 12, 1.2],
  [196, 26, 1.4],
  [222, 54, 1],
  [14, 62, 1],
  [210, 96, 1.1],
];

function Stage({ children }: { children: ReactNode }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 240 140"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
      role="presentation"
    >
      <defs>
        {/* The soft glow around a star: bright in the middle, gone at the edge. Only one drawing shows at a time. */}
        <radialGradient id="tutorial-halo">
          <stop offset="0" style={{ stopColor: "var(--color-paper)", stopOpacity: 0.55 }} />
          <stop offset="0.5" style={{ stopColor: "var(--color-paper)", stopOpacity: 0.16 }} />
          <stop offset="1" style={{ stopColor: "var(--color-paper)", stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="88%" r="72%">
          <stop offset="0" style={{ stopColor: "var(--color-ember)", stopOpacity: 0.34 }} />
          <stop offset="1" style={{ stopColor: "var(--color-ember)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <rect width="240" height="140" rx="16" className="fill-night" />
      <rect width="240" height="140" rx="16" fill={`url(#${id}-glow)`} />
      <g className="fill-gold" opacity="0.7">
        {NIGHT.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      {children}
    </svg>
  );
}

/** The flame of the loading screen, with its base at (x, y). */
function Flame({
  x,
  y,
  scale,
  delay = 0,
}: {
  x: number;
  y: number;
  scale: number;
  delay?: number;
}) {
  const style = (extra: number) => ({ animationDelay: `${delay + extra}s` });
  return (
    <g transform={`translate(${x - 30 * scale} ${y - 74 * scale}) scale(${scale})`}>
      <path
        className="loading-flame fill-ember"
        style={style(0)}
        d="M30 74 C12 64 14 40 26 22 C27 34 33 36 36 26 C46 42 50 62 30 74 Z"
      />
      <path
        className="loading-flame fill-ember-soft"
        style={style(-0.4)}
        d="M30 74 C19 67 21 52 30 41 C32 50 37 52 39 47 C44 58 42 68 30 74 Z"
      />
      <path
        className="loading-flame fill-gold"
        style={style(-0.7)}
        d="M30 74 C24 70 25 62 30 56 C35 62 36 70 30 74 Z"
      />
    </g>
  );
}

/** Two logs leaning on each other and one in front, with the ground at `y`. */
function Logs({ x, y }: { x: number; y: number }) {
  return (
    <g strokeLinecap="round" fill="none" strokeWidth={7}>
      <line x1={x + 30} y1={y} x2={x - 6} y2={y - 22} className="stroke-bark-lit" />
      <line x1={x - 30} y1={y} x2={x + 6} y2={y - 22} className="stroke-ember-lip" />
      <line
        x1={x - 22}
        y1={y + 3}
        x2={x + 22}
        y2={y + 3}
        className="stroke-ember-lip"
        strokeWidth={6}
      />
    </g>
  );
}

/** A five-pointed star of the sky, centred on (x, y). */
function Star({
  x,
  y,
  size = 1,
  className = "fill-paper",
}: {
  x: number;
  y: number;
  size?: number;
  className?: string;
}) {
  return (
    <path
      transform={`translate(${x - 12 * size} ${y - 12 * size}) scale(${size})`}
      className={className}
      d="m12 3 2.1 4.6 5 .6-3.7 3.4 1 5-4.4-2.5-4.4 2.5 1-5L4.9 8.2l5-.6L12 3Z"
    />
  );
}

/** The soft white aura that says a star is the visitor's own. */
function Aura({ x, y, r = 14 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * 1.5} className="t-aura" fill="url(#tutorial-halo)" />
    </g>
  );
}

/** A small spark rising from the fire. */
function Spark({
  x,
  y,
  delay,
  className = "fill-gold",
}: {
  x: number;
  y: number;
  delay: number;
  className?: string;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r="1.6"
      className={`loading-ember ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/** A pine on the horizon. */
function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      className="fill-bark-deep"
      d="M0 0 L7 -16 L3.5 -16 L10 -30 L5.5 -30 L12 -48 L18.5 -30 L14 -30 L20.5 -16 L17 -16 L24 0 Z"
    />
  );
}

/** A campfire far off between the trees: a tiny flame and the light it throws on the ground. */
function DistantFire({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className="t-distant"
      style={{ animationDelay: `${delay}s` }}
    >
      <ellipse cx="0" cy="1" rx="11" ry="3" className="fill-ember" opacity="0.28" />
      <path
        d="M0 0 C-3 -2 -2.6 -6 -0.6 -9 C-0.4 -6.6 1 -6.4 1.6 -8.6 C3.6 -5.4 3.4 -1.8 0 0 Z"
        className="fill-ember-soft"
      />
    </g>
  );
}

function Forest() {
  return (
    <Stage>
      <Pine x={4} y={100} s={1.1} />
      <Pine x={26} y={102} s={0.8} />
      <Pine x={190} y={101} s={0.9} />
      <Pine x={212} y={99} s={1.2} />
      <DistantFire x={58} y={96} delay={0} />
      <DistantFire x={178} y={92} delay={-1.3} />
      <ellipse cx="120" cy="120" rx="62" ry="9" className="fill-hearth" opacity="0.6" />
      <Logs x={120} y={118} />
      <Flame x={120} y={110} scale={0.62} />
      <Spark x={110} y={62} delay={-0.4} />
      <Spark x={130} y={58} delay={-1.5} className="fill-ember-soft" />
    </Stage>
  );
}

function Wood() {
  return (
    <Stage>
      <ellipse cx="120" cy="124" rx="70" ry="9" className="fill-hearth" opacity="0.6" />
      <Logs x={120} y={122} />
      <g className="t-flare">
        <Flame x={120} y={114} scale={0.7} />
      </g>
      {/* The log in the air, coming from the left: it lands in the flames and the fire flares. */}
      <g transform="translate(78 58)">
        <g className="t-log">
          <rect x="-18" y="-4.5" width="36" height="9" rx="4.5" className="fill-ember-lip" />
          <rect
            x="-18"
            y="-4.5"
            width="36"
            height="3"
            rx="1.5"
            className="fill-ember-deep"
            opacity="0.8"
          />
          <circle cx="17" cy="0" r="3.4" className="fill-hearth" />
        </g>
      </g>
      <Spark x={104} y={70} delay={-0.2} />
      <Spark x={134} y={66} delay={-1.1} className="fill-ember-soft" />
      <Spark x={146} y={78} delay={-1.9} />
    </Stage>
  );
}

function Burden() {
  return (
    <Stage>
      <ellipse cx="120" cy="124" rx="70" ry="9" className="fill-hearth" opacity="0.6" />
      <Logs x={120} y={122} />
      <Flame x={120} y={114} scale={0.7} />
      {/* The folded note, blank: it goes down to the embers and burns. */}
      <g transform="translate(120 58)">
        <g className="t-note">
          <rect x="-14" y="-18" width="28" height="36" rx="3" className="fill-paper" />
          <path
            d="M-14 -4 H14 M-14 8 H14"
            className="stroke-paper-shade"
            strokeWidth="1.4"
            fill="none"
          />
          <rect
            x="-14"
            y="-18"
            width="28"
            height="36"
            rx="3"
            className="stroke-ink-soft"
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
          />
        </g>
      </g>
      <Spark x={108} y={64} delay={-0.3} className="fill-paper-shade" />
      <Spark x={126} y={60} delay={-1.2} />
      <Spark x={118} y={52} delay={-2} className="fill-ember-soft" />
    </Stage>
  );
}

function Petition() {
  return (
    <Stage>
      <ellipse cx="80" cy="124" rx="56" ry="8" className="fill-hearth" opacity="0.6" />
      <Logs x={80} y={122} />
      <Flame x={80} y={114} scale={0.62} />
      {/* A small light rises from the flames and becomes a star in the sky. */}
      <g transform="translate(84 62)">
        <g className="t-light">
          <circle r="8" className="fill-gold" opacity="0.22" />
          <circle r="2.6" className="fill-gold" />
        </g>
      </g>
      <g transform="translate(166 34)">
        <g className="t-bloom">
          <circle r="26" fill="url(#tutorial-halo)" />
          <Star x={0} y={0} size={1.1} className="fill-paper" />
        </g>
      </g>
    </Stage>
  );
}

function Sky() {
  // Your stars, joined by thin lines, with the soft aura; the others are alone and turn with the sky.
  const mine: readonly [number, number][] = [
    [62, 64],
    [108, 40],
    [150, 70],
    [104, 100],
  ];
  return (
    <Stage>
      <g className="t-drift">
        <Star x={26} y={36} size={0.5} className="fill-paper" />
        <Star x={206} y={44} size={0.6} className="fill-paper" />
        <Star x={196} y={104} size={0.5} className="fill-paper" />
        <Star x={30} y={112} size={0.45} className="fill-paper" />
      </g>
      <g className="stroke-gold" strokeWidth="1.2" opacity="0.55" fill="none">
        <path d="M62 64 L108 40 L150 70 M108 40 L104 100" />
      </g>
      {mine.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <Aura x={x} y={y} />
          <Star x={x} y={y} size={0.62} className="fill-paper" />
        </g>
      ))}
    </Stage>
  );
}

function Answered() {
  return (
    <Stage>
      {/* The visitor's own star: tapped, and it starts to twinkle. */}
      <g transform="translate(120 44)">
        <circle r="32" className="t-aura" fill="url(#tutorial-halo)" />
        <g className="t-tap">
          <circle r="9" className="stroke-gold" strokeWidth="1.4" fill="none" />
        </g>
        <g className="t-twinkle">
          <Star x={0} y={0} size={0.8} className="fill-paper" />
        </g>
      </g>
      {/* And a shooting star crosses the sky. */}
      <g transform="translate(196 22)">
        <g className="t-shoot">
          <path
            d="M0 0 L-26 14"
            className="stroke-gold"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.8"
          />
          <circle r="2" className="fill-gold" />
        </g>
      </g>
      {/* The card of the star, with a small spiked star: it has been answered. */}
      <g transform="translate(62 84)">
        <rect width="116" height="40" rx="5" className="fill-paper" />
        <path
          d="M12 12 H84 M12 22 H98 M12 32 H64"
          className="stroke-ink-soft"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          transform="translate(92 22) scale(0.7)"
          className="fill-ink-soft"
          d="M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z"
        />
      </g>
    </Stage>
  );
}

function Company() {
  return (
    <Stage>
      {/* Someone else's star, far off, and the fish: a light goes from one to the other. */}
      <g transform="translate(176 36)">
        <g className="t-receive">
          <circle r="26" fill="url(#tutorial-halo)" />
          <Star x={0} y={0} size={0.9} className="fill-paper" />
        </g>
      </g>
      <g transform="translate(64 96)">
        <g className="t-tap">
          <circle cx="16" cy="0" r="17" className="stroke-gold" strokeWidth="1.4" fill="none" />
        </g>
        <circle cx="16" cy="0" r="17" className="fill-ember" opacity="0.18" />
        <g transform="translate(-4 -8) scale(1.45)">
          <path d="M2 10 Q14 -2 25 10 Q14 22 2 10Z" className="fill-ember" opacity="0.85" />
          <path
            d="M2 10 Q14 -2 25 10 L31 17 M2 10 Q14 22 25 10 L31 3"
            className="stroke-gold"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </g>
      <g transform="translate(88 82)">
        <g className="t-gift">
          <circle r="5" className="fill-gold" opacity="0.3" />
          <circle r="2" className="fill-gold" />
        </g>
      </g>
    </Stage>
  );
}

function Word() {
  return (
    <Stage>
      <ellipse cx="120" cy="124" rx="70" ry="9" className="fill-hearth" opacity="0.6" />
      <Logs x={120} y={122} />
      <Flame x={120} y={114} scale={0.62} />
      {/* A few words rise from the fire, as if said by it. */}
      <g transform="translate(120 46)">
        <g className="t-words">
          <rect
            x="-48"
            y="-14"
            width="96"
            height="28"
            rx="8"
            className="fill-night"
            opacity="0.7"
          />
          <rect
            x="-48"
            y="-14"
            width="96"
            height="28"
            rx="8"
            className="stroke-ember-soft"
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M-34 -4 H34 M-24 6 H24"
            className="stroke-ember-soft"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </g>
      <Spark x={104} y={74} delay={-0.5} />
      <Spark x={136} y={70} delay={-1.6} className="fill-ember-soft" />
    </Stage>
  );
}

const ARTS: Record<TutorialStep, () => ReactNode> = {
  forest: Forest,
  wood: Wood,
  burden: Burden,
  petition: Petition,
  sky: Sky,
  answered: Answered,
  company: Company,
  word: Word,
};

export function TutorialArt({ step }: { step: TutorialStep }) {
  const Art = ARTS[step];
  return (
    <div className="tutorial-art aspect-[240/140] w-full overflow-hidden rounded-2xl ring-1 ring-ember/25">
      <Art />
    </div>
  );
}
