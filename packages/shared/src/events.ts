import { z } from "zod";
import { FUEL } from "./fuel";
import { SEAT_COUNT, personSchema, speciesSchema } from "./presence";

const fuelSchema = z.number().min(0).max(FUEL.maxFuel);

/** Browser → campfire. Leaving is just closing the socket. */
export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), preferred: speciesSchema.optional() }).strict(),
  z.object({ type: z.literal("changeSpecies"), species: speciesSchema }).strict(),
  // Sent every few seconds while sitting: a device that went to sleep without saying goodbye stops sending it.
  z.object({ type: z.literal("ping") }).strict(),
  // A log into the fire.
  z.object({ type: z.literal("wood") }).strict(),
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
      // How much fuel the fire has right now, so a late arrival sees the same fire.
      fuel: fuelSchema,
    })
    .strict(),
  z.object({ type: z.literal("joined"), person: personSchema }).strict(),
  z.object({ type: z.literal("left"), id: z.string().min(1).max(64) }).strict(),
  // The same person, in the same seat, now as another animal.
  z.object({ type: z.literal("changed"), person: personSchema }).strict(),
  // Someone threw a log, whoever they are, and the fuel the fire has once it has landed. Never any more about them.
  z.object({ type: z.literal("wood"), by: z.string().min(1).max(64), fuel: fuelSchema }).strict(),
  // This campfire has no room: the client should try another one.
  z.object({ type: z.literal("full") }).strict(),
]);
export type ServerEvent = z.infer<typeof serverEventSchema>;
