import { z } from "zod";

export const pingEventSchema = z.object({ type: z.literal("ping") });

export type PingEvent = z.infer<typeof pingEventSchema>;

export * from "./presence";
export * from "./events";
export * from "./roster";
export * from "./fuel";
export * from "./throttle";
