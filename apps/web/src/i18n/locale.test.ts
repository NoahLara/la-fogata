import { describe, expect, it } from "vitest";
import { localeCookie, parseAcceptLanguage, resolveLocale } from "./locale";

describe("parseAcceptLanguage", () => {
  it("reads Spanish and English, with or without a region", () => {
    expect(parseAcceptLanguage("es")).toBe("es");
    expect(parseAcceptLanguage("es-MX,es;q=0.9")).toBe("es");
    expect(parseAcceptLanguage("en-GB")).toBe("en");
    expect(parseAcceptLanguage("EN-us")).toBe("en");
  });

  it("takes the highest priority among the supported ones", () => {
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("en;q=0.5,es;q=0.9")).toBe("es");
    expect(parseAcceptLanguage("en,es")).toBe("en");
  });

  it("ignores languages refused with q=0 and malformed priorities", () => {
    expect(parseAcceptLanguage("es;q=0,en;q=0.1")).toBe("en");
    expect(parseAcceptLanguage("es;q=oops")).toBeUndefined();
  });

  it("finds nothing in other languages, an empty header or none", () => {
    expect(parseAcceptLanguage("fr-FR,de;q=0.8")).toBeUndefined();
    expect(parseAcceptLanguage("")).toBeUndefined();
    expect(parseAcceptLanguage(null)).toBeUndefined();
    expect(parseAcceptLanguage("*")).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("prefers the saved choice over the browser", () => {
    expect(resolveLocale({ cookie: "en", acceptLanguage: "es-ES" })).toBe("en");
    expect(resolveLocale({ cookie: "es", acceptLanguage: "en-US" })).toBe("es");
  });

  it("ignores a cookie that is not a supported language", () => {
    expect(resolveLocale({ cookie: "fr", acceptLanguage: "en-US" })).toBe("en");
    expect(resolveLocale({ cookie: "", acceptLanguage: undefined })).toBe("es");
  });

  it("uses the browser's language on a first visit", () => {
    expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
    expect(resolveLocale({ acceptLanguage: "es-AR" })).toBe("es");
  });

  it("falls back to Spanish", () => {
    expect(resolveLocale({ acceptLanguage: "fr-FR" })).toBe("es");
    expect(resolveLocale({})).toBe("es");
  });
});

describe("localeCookie", () => {
  it("is a lasting, site-wide, same-site preference", () => {
    expect(localeCookie("en")).toBe("lang=en; Path=/; Max-Age=31536000; SameSite=Lax");
  });
});
