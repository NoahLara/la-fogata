import { describe, expect, it } from "vitest";
import { clientEventSchema, serverEventSchema } from "./events";

describe("clientEventSchema", () => {
  it("accepts a join without a preferred animal", () => {
    expect(clientEventSchema.safeParse({ type: "join" }).success).toBe(true);
  });

  it("rejects an animal that does not exist", () => {
    expect(clientEventSchema.safeParse({ type: "join", preferred: "dragon" }).success).toBe(false);
  });

  it("accepts a ping and nothing more", () => {
    expect(clientEventSchema.safeParse({ type: "ping" }).success).toBe(true);
    expect(clientEventSchema.safeParse({ type: "ping", at: 1 }).success).toBe(false);
  });

  it("accepts a log and nothing more", () => {
    expect(clientEventSchema.safeParse({ type: "wood" }).success).toBe(true);
    expect(clientEventSchema.safeParse({ type: "wood", fuel: 1 }).success).toBe(false);
  });

  it("rejects extra fields", () => {
    expect(clientEventSchema.safeParse({ type: "join", name: "Ana" }).success).toBe(false);
  });
});

describe("serverEventSchema", () => {
  it("accepts a full campfire", () => {
    expect(serverEventSchema.safeParse({ type: "full" }).success).toBe(true);
  });

  it("tells who threw a log and the fuel after it, nothing else", () => {
    expect(serverEventSchema.safeParse({ type: "wood", by: "a", fuel: 0.4 }).success).toBe(true);
    expect(serverEventSchema.safeParse({ type: "wood", by: "a", fuel: 2 }).success).toBe(false);
    expect(
      serverEventSchema.safeParse({ type: "wood", by: "a", fuel: 0.4, text: "x" }).success,
    ).toBe(false);
  });

  it("brings the fire's fuel in the welcome", () => {
    const person = { id: "a", species: "fox", seat: 1 };
    const welcome = { type: "welcome", self: person, people: [person] };
    expect(serverEventSchema.safeParse({ ...welcome, fuel: 0.5 }).success).toBe(true);
    expect(serverEventSchema.safeParse(welcome).success).toBe(false);
    expect(serverEventSchema.safeParse({ ...welcome, fuel: -1 }).success).toBe(false);
  });

  it("rejects a seat out of range", () => {
    const person = { id: "a", species: "fox", seat: 7 };
    expect(serverEventSchema.safeParse({ type: "joined", person }).success).toBe(false);
  });
});
