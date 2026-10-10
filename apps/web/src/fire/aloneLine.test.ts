import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { aloneLine, otherFiresDescription, shouldSayAlone } from "./aloneLine";

describe("shouldSayAlone", () => {
  it("speaks when the visitor is the only one, the first time", () => {
    expect(shouldSayAlone({ people: 1, alreadySaid: false })).toBe(true);
  });

  it("is quiet once it has been said this visit", () => {
    expect(shouldSayAlone({ people: 1, alreadySaid: true })).toBe(false);
  });

  it("is quiet when someone else is at the fire", () => {
    expect(shouldSayAlone({ people: 2, alreadySaid: false })).toBe(false);
    expect(shouldSayAlone({ people: 7, alreadySaid: false })).toBe(false);
  });
});

describe("aloneLine", () => {
  it("counts the other fires, in the right plural", () => {
    expect(aloneLine("es", es.company, 1)).toBe("Hay 1 fogata más encendida ahora.");
    expect(aloneLine("es", es.company, 3)).toBe("Hay 3 fogatas más encendidas ahora.");
    expect(aloneLine("en", en.company, 1)).toBe("There is 1 other fire burning right now.");
    expect(aloneLine("en", en.company, 12)).toBe("There are 12 other fires burning right now.");
  });

  it("says nothing when there are no other fires", () => {
    expect(aloneLine("es", es.company, 0)).toBeUndefined();
    expect(aloneLine("en", en.company, 0)).toBeUndefined();
  });

  it("never promises that someone will come", () => {
    for (const count of [0, 1, 4]) {
      expect(aloneLine("es", es.company, count) ?? "").not.toMatch(/llegar|vendr|pronto|alguien/i);
      expect(aloneLine("en", en.company, count) ?? "").not.toMatch(/will|soon|someone|arrive/i);
    }
  });
});

describe("otherFiresDescription", () => {
  it("describes the scene with the number of other fires", () => {
    expect(otherFiresDescription("en", en.company, 2)).toBe(
      "There are 2 other fires burning right now.",
    );
    expect(otherFiresDescription("es", es.company, 0)).toBe(
      "No hay otras fogatas encendidas ahora.",
    );
  });
});
