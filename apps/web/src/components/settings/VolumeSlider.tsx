"use client";

import type { CSSProperties } from "react";
import { TRIM_MAX, TRIM_MIN } from "@/sound/volumeTrim";

/** A volume from 0 to 100 (the middle is the normal level), greyed out while the sound is off. */
export function VolumeSlider({
  legend,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-baseline justify-between gap-3 text-sm font-medium">
        <span className={disabled ? "text-ink-soft" : "text-ink"}>{legend}</span>
        <span aria-hidden="true" className="tabular-nums text-ink-soft">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={TRIM_MIN}
        max={TRIM_MAX}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={legend}
        aria-valuetext={`${value}%`}
        className="volume-range h-9 w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-default disabled:opacity-50"
        style={{ "--fill": `${value}%` } as CSSProperties}
      />
    </div>
  );
}
