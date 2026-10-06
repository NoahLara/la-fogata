"use client";

/** An on/off switch: a wooden slot with a knob that slides, and the state said in words beside it. */
export function SoundSwitch({
  legend,
  on,
  onWord,
  offWord,
  onChange,
}: {
  legend: string;
  on: boolean;
  onWord: string;
  offWord: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="legend-text text-sm font-medium">{legend}</span>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-sm text-ink-soft">
          {on ? onWord : offWord}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={legend}
          onClick={() => onChange(!on)}
          className="switch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        />
      </div>
    </div>
  );
}
