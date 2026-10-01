import { describe, expect, it } from "vitest";
import { pingEventSchema } from "./index";

describe("pingEventSchema", () => {
  it("accepts a ping event", () => {
    expect(pingEventSchema.parse({ type: "ping" })).toEqual({ type: "ping" });
  });

  it("rejects unknown events", () => {
    expect(pingEventSchema.safeParse({ type: "nope" }).success).toBe(false);
  });
});
