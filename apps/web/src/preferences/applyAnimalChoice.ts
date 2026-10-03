import type { PresenceService } from "@/data/types";
import type { AnimalChoice } from "./preferences";

/**
 * What happened when the visitor picked an animal. The choice itself is always saved by the caller.
 * - changed: they were sitting down and the animal was free, so it replaced theirs in the same seat.
 * - taken: somebody else at this campfire already is that animal; it will be theirs next time.
 * - saved: nothing to do now (not seated, "random", or already that animal).
 */
export type AnimalChangeOutcome = "changed" | "taken" | "saved";

export async function applyAnimalChoice(
  choice: AnimalChoice,
  presence: Pick<PresenceService, "changeSpecies">,
): Promise<AnimalChangeOutcome> {
  if (choice === "random") return "saved";
  const result = await presence.changeSpecies(choice);
  if (result.status === "changed") return "changed";
  if (result.status === "taken") return "taken";
  return "saved";
}
