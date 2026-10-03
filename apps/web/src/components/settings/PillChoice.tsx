"use client";

import { useId } from "react";

/** A short radio group shown as pills: the language, the text size. Arrow keys move between them, natively. */
export function PillChoice<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: readonly { value: T; label: string; lang?: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm text-gold/90">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="relative block cursor-pointer">
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
              className="flex min-h-11 items-center rounded-full bg-bark px-5 text-sm ring-1 ring-ember/50 hover:bg-ember/20 peer-checked:bg-ember/90 peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
