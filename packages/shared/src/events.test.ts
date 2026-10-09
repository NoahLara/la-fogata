import { describe, expect, it } from "vitest";
import { clientEventSchema, serverEventSchema } from "./events";

describe("clientEventSchema", () => {
  it("accepts a join without a preferred animal", () => {
    expect(clientEventSchema.safeParse({ type: "join" }).success).toBe(true);
  });

  it("rejects an animal that does not exist", () => {
    expect(clientEventSchema.safeParse({ type: "join", preferred: "dragon" }).success).toBe(false);
  });

  it("rejects extra fields", () => {
    expect(clientEventSchema.safeParse({ type: "join", name: "Ana" }).success).toBe(false);
  });
});

describe("serverEventSchema", () => {
  it("accepts a full campfire", () => {
    expect(serverEventSchema.safeParse({ type: "full" }).success).toBe(true);
  });

  it("rejects a seat out of range", () => {
    const person = { id: "a", species: "fox", seat: 7 };
    expect(serverEventSchema.safeParse({ type: "joined", person }).success).toBe(false);
  });
});
