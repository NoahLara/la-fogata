// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { hasAcceptedTerms, saveTermsAccepted, TERMS_STORAGE_KEY, TERMS_VERSION } from "./terms";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
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

  it("asks again of whoever agreed to an earlier version: the first spoke of petitions that expire, the second of petitions kept only in the browser", () => {
    expect(hasAcceptedTerms(memoryStorage({ [TERMS_STORAGE_KEY]: "1" }))).toBe(false);
    expect(hasAcceptedTerms(memoryStorage({ [TERMS_STORAGE_KEY]: "2" }))).toBe(false);
  });

  it("does not throw when the browser refuses storage", () => {
    expect(hasAcceptedTerms(broken)).toBe(false);
    expect(() => saveTermsAccepted(broken)).not.toThrow();
  });
});

describe("what the terms say about petitions", () => {
  // Petitions neither expire nor are limited to one a day, so the terms must not promise either.
  it.each([
    ["es", es.terms],
    ["en", en.terms],
  ])("in %s, mentions no expiry and no daily limit", (_language, terms) => {
    const text = Object.values(terms)
      .map((section) => (typeof section === "string" ? section : (section.body ?? "")))
      .join(" ");
    expect(text).not.toMatch(/30|treinta|thirty/i);
    expect(text).not.toMatch(/al día|por día|a day|per day|each day/i);
  });

  it.each([
    ["es", es.terms.petitions.body, /servidores/, /quien administra/, /huella/],
    ["en", en.terms.petitions.body, /servers/, /whoever runs/, /fingerprint/],
  ])(
    "says in %s that it is kept on the servers, who can read it, and how little says who wrote it",
    (_language, body, kept, reads, fingerprint) => {
      expect(body).toMatch(kept);
      expect(body).toMatch(reads);
      expect(body).toMatch(fingerprint);
    },
  );

  it("says in both languages that a petition stays until its author sends it back", () => {
    expect(es.terms.petitions.body).toContain("no caduca");
    expect(en.terms.petitions.body).toContain("doesn't expire");
  });
});
