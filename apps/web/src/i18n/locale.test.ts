import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, localeCookie, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("is Spanish by default, on a first visit", () => {
    expect(DEFAULT_LOCALE).toBe("es");
    expect(resolveLocale({})).toBe("es");
    expect(resolveLocale({ cookie: undefined })).toBe("es");
    expect(resolveLocale({ cookie: null })).toBe("es");
  });

  it("uses what the visitor chose, and only that", () => {
    expect(resolveLocale({ cookie: "en" })).toBe("en");
    expect(resolveLocale({ cookie: "es" })).toBe("es");
  });

  it("ignores a cookie that is not a supported language", () => {
    expect(resolveLocale({ cookie: "fr" })).toBe("es");
    expect(resolveLocale({ cookie: "" })).toBe("es");
    expect(resolveLocale({ cookie: "EN" })).toBe("es");
  });

  it("does not take the browser's language for the visitor's choice", () => {
    // `resolveLocale` no longer even looks at the Accept-Language header: an English browser gets Spanish.
    const input = { acceptLanguage: "en-US,en;q=0.9" } as unknown as Parameters<
      typeof resolveLocale
    >[0];
    expect(resolveLocale(input)).toBe("es");
  });
});

describe("localeCookie", () => {
  it("is a lasting, site-wide, same-site preference", () => {
    expect(localeCookie("en")).toBe("lang=en; Path=/; Max-Age=31536000; SameSite=Lax");
  });
});
