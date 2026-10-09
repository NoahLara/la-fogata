import { z } from "zod";

export const SPECIES = ["panda", "cat", "owl", "fox", "capybara", "rabbit", "bear"] as const;

export const speciesSchema = z.enum(SPECIES);

export type Species = z.infer<typeof speciesSchema>;

export const SEAT_COUNT = 7;

export const personSchema = z
  .object({
    id: z.string().min(1).max(64),
    species: speciesSchema,
    seat: z
      .number()
      .int()
      .min(0)
      .max(SEAT_COUNT - 1),
  })
  .strict();

export type Person = z.infer<typeof personSchema>;

/** The browser tells the campfire it is still there this often. */
export const PING_EVERY_MS = 15_000;
/** A seat whose owner has been silent this long is given up: their device is gone without a goodbye. */
export const IDLE_LIMIT_MS = 60_000;
