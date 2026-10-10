import { z } from "zod";
import { PETITION_ANSWER_MAX_LENGTH, PETITION_MAX_LENGTH } from "./petitionRules";

/**
 * The language the browser and the server that keeps the petitions speak. Every request and every answer is validated
 * with these on both sides, and none of them has a field for an author: a petition never says who wrote it.
 */

/** The secret that proves a petition is yours: random, made and kept by the browser, sent only in this header. */
export const OWNER_KEY_HEADER = "x-owner-key";
export const ownerKeySchema = z.string().regex(/^[0-9a-f]{32}$/);

export const API_PATHS = {
  sky: "/api/sky",
  mine: "/api/mine",
  petitions: "/api/petitions",
} as const;

/** A day as `YYYY-MM-DD`: only the day a petition was written or answered is ever kept. */
export const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const idSchema = z.string().min(1).max(64);

export const petitionViewSchema = z
  .object({
    id: idSchema,
    text: z.string().max(PETITION_MAX_LENGTH * 4),
    /** Milliseconds since the epoch. */
    createdAt: z.number().int().nonnegative(),
    createdOn: dayKeySchema,
    prayers: z.number().int().nonnegative(),
    answered: z
      .object({
        at: z.number().int().nonnegative(),
        on: dayKeySchema,
        note: z
          .string()
          .max(PETITION_ANSWER_MAX_LENGTH * 4)
          .optional(),
      })
      .strict()
      .optional(),
    /** The visitor wrote this one (the server compared the keys: it never tells whose it is). */
    mine: z.boolean(),
    /** The visitor is already with it. */
    prayed: z.boolean(),
  })
  .strict();
export type PetitionView = z.infer<typeof petitionViewSchema>;

// What the browser asks.

export const createPetitionRequestSchema = z
  .object({ text: z.string().max(PETITION_MAX_LENGTH * 4), day: dayKeySchema })
  .strict();
export type CreatePetitionRequest = z.infer<typeof createPetitionRequestSchema>;

export const answerPetitionRequestSchema = z
  .object({ note: z.string().max(PETITION_ANSWER_MAX_LENGTH * 4), day: dayKeySchema })
  .strict();
export type AnswerPetitionRequest = z.infer<typeof answerPetitionRequestSchema>;

// What the server answers. A refusal for a reason of the content never says which word.

const contentIssueSchema = z.enum(["no-words", "gibberish", "offensive"]);

export const listResponseSchema = z.object({ petitions: z.array(petitionViewSchema) }).strict();

export const createResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created"), petition: petitionViewSchema }).strict(),
  z.object({ status: z.literal("empty") }).strict(),
  z.object({ status: z.literal("too-long") }).strict(),
  z.object({ status: z.literal("risk") }).strict(),
  z.object({ status: z.literal("rejected"), reason: contentIssueSchema }).strict(),
]);

export const answerResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("answered"), petition: petitionViewSchema }).strict(),
  z.object({ status: z.literal("not-yours") }).strict(),
  z.object({ status: z.literal("not-found") }).strict(),
  z.object({ status: z.literal("already-answered") }).strict(),
  z.object({ status: z.literal("note-required") }).strict(),
  z.object({ status: z.literal("too-long") }).strict(),
  z.object({ status: z.literal("risk") }).strict(),
  z.object({ status: z.literal("rejected"), reason: contentIssueSchema }).strict(),
]);

export const removeResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("removed") }).strict(),
  z.object({ status: z.literal("not-yours") }).strict(),
  z.object({ status: z.literal("not-found") }).strict(),
]);

export const reportResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("reported") }).strict(),
  z.object({ status: z.literal("own") }).strict(),
  z.object({ status: z.literal("not-found") }).strict(),
]);

export const prayResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("prayed"), prayers: z.number().int().nonnegative() }).strict(),
  z
    .object({ status: z.literal("already-prayed"), prayers: z.number().int().nonnegative() })
    .strict(),
  z.object({ status: z.literal("own") }).strict(),
  z.object({ status: z.literal("not-found") }).strict(),
]);

/** Something the request itself got wrong (not what was asked for): sent with a 4xx status. */
export const apiErrorSchema = z
  .object({ error: z.enum(["bad-request", "missing-key", "slow-down", "not-found"]) })
  .strict();
