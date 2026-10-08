// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { hasAcceptedTerms, saveTermsAccepted, TERMS_STORAGE_KEY, TERMS_VERSION } from "./terms";
import type { StorageLike } from "@/preferences/preferences";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

const broken: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("terms acceptance", () => {
  it("asks anyone who has not agreed yet", () => {
    expect(hasAcceptedTerms(memoryStorage())).toBe(false);
    expect(hasAcceptedTerms(undefined)).toBe(false);
  });

  it("remembers the agreement, and keeps only the version", () => {
    const storage = memoryStorage();
    saveTermsAccepted(storage);
    expect(hasAcceptedTerms(storage)).toBe(true);
    expect([...storage.data.entries()]).toEqual([[TERMS_STORAGE_KEY, TERMS_VERSION]]);
  });

  it("asks again when the terms change", () => {
    expect(hasAcceptedTerms(memoryStorage({ [TERMS_STORAGE_KEY]: "0" }))).toBe(false);
  });

  it("does not throw when the browser refuses storage", () => {
    expect(hasAcceptedTerms(broken)).toBe(false);
    expect(() => saveTermsAccepted(broken)).not.toThrow();
  });
});
