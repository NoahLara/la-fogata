"use client";

import { useId } from "react";

/**
 * A short choice shown as one wooden trough with the options side by side, the chosen one raised in orange: the
 * language, the text size. It is a radio group, so the arrow keys move between the options, natively. Every option
 * stays on the same line, chosen or not.
 */
export function SegmentedChoice<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: readonly { value: T; label: string; lang?: string; className?: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  const legendId = useId();
  return (
    <div role="radiogroup" aria-labelledby={legendId} className="min-w-0">
      <span id={legendId} className="legend-text mb-1.5 block text-sm font-medium">
        {legend}
      </span>
      <div className="segmented">
        {options.map((option) => (
          <label key={option.value} className="relative flex min-w-0 flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              lang={option.lang}
              className={`segment peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold ${option.className ?? "text-sm"}`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
