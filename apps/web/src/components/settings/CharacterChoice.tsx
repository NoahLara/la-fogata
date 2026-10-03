"use client";

import { useId } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { SPECIES } from "@/scene/characters/species";
import type { AnimalChoice } from "@/preferences/preferences";
import { CharacterDisc } from "./CharacterDisc";
import { discBackground } from "./discTones";

const TILE =
  "flex flex-col items-center gap-1 rounded-sheet px-0.5 py-2 text-center text-sm ring-1 ring-ember/30 hover:bg-ember/20 peer-checked:bg-ember/20 peer-checked:ring-2 peer-checked:ring-gold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold";
const DISC = "flex size-12 items-center justify-center rounded-full ring-1 ring-ember/40";

/** The 7 characters (front view, each on a disc the fire seems to light) and "Random", as a radio group. */
export function CharacterChoice({
  value,
  onChange,
  autoFocus = false,
}: {
  value: AnimalChoice;
  onChange: (choice: AnimalChoice) => void;
  /** Focus goes to the chosen one when this opens, so the arrow keys work at once. */
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm text-gold/90">{t.settings.character.legend}</legend>
      <div className="grid grid-cols-4 gap-1">
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
              <CharacterDisc species={species} />
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
              className={`${DISC} font-title text-2xl text-ink`}
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
