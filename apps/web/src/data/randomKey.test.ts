import { describe, expect, it } from "vitest";
import { randomKey } from "./randomKey";

describe("randomKey", () => {
  it("is 32 hex characters and differs each time", () => {
    const a = randomKey();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(randomKey()).not.toBe(a);
  });

  it("works without crypto.randomUUID, as on plain http", () => {
    const insecure = { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) };
    expect(randomKey(insecure)).toMatch(/^[0-9a-f]{32}$/);
  });
});
