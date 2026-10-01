import { z } from "zod";

export const pingEventSchema = z.object({ type: z.literal("ping") });

export type PingEvent = z.infer<typeof pingEventSchema>;
