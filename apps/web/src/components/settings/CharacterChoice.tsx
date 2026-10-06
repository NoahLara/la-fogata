"use client";

import { useId } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { SPECIES } from "@/scene/characters/species";
import type { AnimalChoice } from "@/preferences/preferences";
import { CharacterDisc } from "./CharacterDisc";
import { discBackground } from "./discTones";

const TILE =
  "flex flex-col items-center gap-1 btn-tile rounded-sheet px-0.5 py-1.5 text-center text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold";
const DISC = "flex items-center justify-center rounded-full ring-1 ring-ember/40";

/** The 7 characters (front view, each on a disc the fire seems to light) and "Random", as a radio group. */
export function CharacterChoice({
  value,
  onChange,
  autoFocus = false,
  compact = false,
}: {
  value: AnimalChoice;
  onChange: (choice: AnimalChoice) => void;
  /** Focus goes to the chosen one when this opens, so the arrow keys work at once. */
  autoFocus?: boolean;
  /** Smaller tiles, for the settings panel, where the room is tight. */
  compact?: boolean;
}) {
  const { t } = useI18n();
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="legend-text mb-2 text-sm font-medium">
        {t.settings.character.legend}
      </legend>
      <div className="grid grid-cols-4 gap-x-1 gap-y-2.5">
        {SPECIES.map((species) => (
          <label key={species} className="relative block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={species}
              checked={value === species}
              onChange={() => onChange(species)}
              data-autofocus={autoFocus && value === species ? "" : undefined}
              className="peer sr-only"
            />
            <span className={TILE}>
              <CharacterDisc species={species} compact={compact} />
              <span>{t.species[species]}</span>
            </span>
          </label>
        ))}
        <label className="relative block cursor-pointer">
          <input
            type="radio"
            name={name}
            value="random"
            checked={value === "random"}
            onChange={() => onChange("random")}
            data-autofocus={autoFocus && value === "random" ? "" : undefined}
            className="peer sr-only"
          />
          <span className={TILE}>
            <span
              className={`${DISC} ${compact ? "size-10" : "size-12"} font-title text-2xl text-ink`}
              style={{ background: discBackground("flame") }}
              aria-hidden="true"
            >
              ?
            </span>
            <span>{t.settings.character.random}</span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
