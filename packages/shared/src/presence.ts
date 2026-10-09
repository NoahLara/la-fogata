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
