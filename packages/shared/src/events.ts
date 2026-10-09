import { z } from "zod";
import { SEAT_COUNT, personSchema, speciesSchema } from "./presence";

/** Browser → campfire. Leaving is just closing the socket. */
export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), preferred: speciesSchema.optional() }).strict(),
  z.object({ type: z.literal("changeSpecies"), species: speciesSchema }).strict(),
]);
export type ClientEvent = z.infer<typeof clientEventSchema>;

/** Campfire → browser. */
export const serverEventSchema = z.discriminatedUnion("type", [
  // Sent only to the one who just sat down: who they are and who is already there.
  z
    .object({
      type: z.literal("welcome"),
      self: personSchema,
      people: z.array(personSchema).max(SEAT_COUNT),
    })
    .strict(),
  z.object({ type: z.literal("joined"), person: personSchema }).strict(),
  z.object({ type: z.literal("left"), id: z.string().min(1).max(64) }).strict(),
  // The same person, in the same seat, now as another animal.
  z.object({ type: z.literal("changed"), person: personSchema }).strict(),
  // This campfire has no room: the client should try another one.
  z.object({ type: z.literal("full") }).strict(),
]);
export type ServerEvent = z.infer<typeof serverEventSchema>;
