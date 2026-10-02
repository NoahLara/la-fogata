import { describe, expect, it } from "vitest";
import { en } from "./en";
import { format, plural } from "./format";
import { es } from "./es";

describe("plural", () => {
  it("picks the singular for exactly one, in English", () => {
    const text = (n: number) => format(plural("en", en.burden.remaining, n), { remaining: n });
    expect(text(1)).toBe("1 character left.");
    expect(text(0)).toBe("0 characters left.");
    expect(text(2)).toBe("2 characters left.");
    expect(text(140)).toBe("140 characters left.");
  });

  it("picks the singular for exactly one, in Spanish", () => {
    const text = (n: number) => format(plural("es", es.petition.remaining, n), { remaining: n });
    expect(text(1)).toBe("Te queda 1 carácter.");
    expect(text(0)).toBe("Te quedan 0 caracteres.");
    expect(text(2)).toBe("Te quedan 2 caracteres.");
    expect(text(140)).toBe("Te quedan 140 caracteres.");
  });
});

describe("format", () => {
  it("fills every placeholder and leaves unknown ones alone", () => {
    expect(format("{count} of {max}", { count: 3, max: 140 })).toBe("3 of 140");
    expect(format("{a} {b}", { a: "x" })).toBe("x {b}");
  });
});
