import type { Species } from "@/scene/characters/species";
import { DISC_FOR, discBackground } from "./discTones";

/** A character's front silhouette on a small disc the fire seems to light. Decorative: the name goes beside it. */
export function CharacterDisc({
  species,
  compact = false,
}: {
  species: Species;
  compact?: boolean;
}) {
  return (
    <span
      className={`flex items-center justify-center rounded-full ring-1 ring-ember/40 ${compact ? "size-10" : "size-12"}`}
      style={{ background: discBackground(DISC_FOR[species]) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a small static drawing; nothing to optimize */}
      <img
        src={`/characters/${species}/front.svg`}
        alt=""
        width={40}
        height={40}
        draggable={false}
        // The thin warm rim the scene gives every silhouette, so dark patches don't melt into the disc.
        className={`object-contain drop-shadow-[0_0_1.5px_var(--color-gold)] ${compact ? "size-8" : "size-10"}`}
      />
    </span>
  );
}
