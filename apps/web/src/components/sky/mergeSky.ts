import type { Petition } from "@/data/types";

/**
 * The stars of other people's petitions after the sky has been looked at again. The ones already there stay where
 * they are (a star that has just been accompanied must not drop out of the sky because it now has more company), with
 * what is new about them (their company, whether they have been answered); the ones that came by since are added; and
 * when there are more than `room`, the oldest ones to arrive leave first, so the sky never grows without end.
 */
export function mergeSky(
  current: readonly Petition[],
  fresh: readonly Petition[],
  room: number,
): Petition[] {
  const latest = new Map(fresh.map((petition) => [petition.id, petition]));
  const kept = current.map((petition) => latest.get(petition.id) ?? petition);
  const known = new Set(current.map((petition) => petition.id));
  const merged = [...kept, ...fresh.filter((petition) => !known.has(petition.id))];
  return merged.length > room ? merged.slice(merged.length - room) : merged;
}
