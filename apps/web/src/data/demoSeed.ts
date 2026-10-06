import type { Locale } from "@/i18n/locale";
import type { MemoryPetitions } from "./memoryPetitions";

/** One sample petition of another person. */
export interface DemoPetition {
  text: string;
  prayers: number;
  /** Answered: how it happened (may be empty for an answer without a line). */
  answered?: string;
}

/** The sample petitions' module: it only exists in development, so the page passes a loader for it there and nothing in production. */
export type DemoLoader = () => Promise<{
  DEMO_PETITIONS: Record<Locale, readonly DemoPetition[]>;
}>;

/**
 * Fills the sky with `count` petitions of other people for `?demo`. The texts may repeat. Without a `load` (a
 * production build never has one) nothing is seeded and nothing is imported: no one is ever made up.
 */
export async function seedDemoPetitions(
  petitions: Pick<MemoryPetitions, "seedOther">,
  options: { count: number; locale: Locale; load: DemoLoader | undefined },
): Promise<number> {
  if (!options.load || options.count <= 0) return 0;
  const { DEMO_PETITIONS } = await options.load();
  const samples = DEMO_PETITIONS[options.locale];
  if (samples.length === 0) return 0;
  for (let i = 0; i < options.count; i++) {
    const sample = samples[i % samples.length];
    if (!sample) continue;
    petitions.seedOther(sample.text, {
      // Repeats keep the mix but not the exact counts.
      prayers: sample.prayers + Math.floor(i / samples.length),
      // Letters of different days, spread over the weeks a petition lives.
      daysAgo: 1 + ((i * 7) % 24),
      ...(sample.answered !== undefined ? { answered: sample.answered } : {}),
    });
  }
  return options.count;
}
