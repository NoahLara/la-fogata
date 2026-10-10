import { z } from "zod";

export const pingEventSchema = z.object({ type: z.literal("ping") });

export type PingEvent = z.infer<typeof pingEventSchema>;

export * from "./presence";
export * from "./events";
export * from "./roster";
export * from "./fuel";
export * from "./throttle";
export * from "./moderation/content";
export { WORDS_EN, WORDS_ES } from "./moderation/words";
export * from "./risk";
export * from "./text";
export * from "./petitionRules";
export * from "./sky";

export * from "./petitionApi";
