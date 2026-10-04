import { describe, expect, it } from "vitest";
import type { Petition } from "@/data/types";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { cardState, countLabel, starName } from "./cardState";

const petition = (overrides: Partial<Petition> = {}): Petition => ({
  id: "p",
  text: "Paz",
  createdAt: 0,
  prayers: 0,
  mine: false,
  prayed: false,
  ...overrides,
});

describe("cardState", () => {
  it("a waiting star of someone else: the fish can be pressed, with no count at zero", () => {
    expect(cardState(petition())).toEqual({
      own: false,
      answered: false,
      note: undefined,
      count: 0,
      showCount: false,
      pressable: true,
      pressed: false,
    });
  });

  it("an answered star shows how it happened, when the author said", () => {
    const state = cardState(petition({ answered: { at: 1, note: "  pasó así  " } }));
    expect(state).toMatchObject({ answered: true, note: "pasó así", pressable: true });
    expect(cardState(petition({ answered: { at: 1 } })).note).toBeUndefined();
    expect(cardState(petition({ answered: { at: 1, note: "   " } })).note).toBeUndefined();
  });

  it("is the same one fish and one count for waiting and answered stars", () => {
    const waiting = cardState(petition({ prayers: 3 }));
    const answered = cardState(petition({ prayers: 3, answered: { at: 1 } }));
    expect([waiting.count, waiting.showCount]).toEqual([answered.count, answered.showCount]);
  });

  it("shows the count from one person on", () => {
    expect(cardState(petition({ prayers: 1 })).showCount).toBe(true);
  });

  it("draws the fish pressed once the visitor is with it", () => {
    expect(cardState(petition({ prayed: true, prayers: 2 })).pressed).toBe(true);
    expect(cardState(petition({ prayed: true, answered: { at: 1 } })).pressed).toBe(true);
  });

  it("an own star only counts: nothing to press", () => {
    const state = cardState(petition({ mine: true, prayers: 2, prayed: true }));
    expect(state).toMatchObject({ own: true, pressable: false, pressed: false, showCount: true });
  });
});

describe("countLabel (what a screen reader hears)", () => {
  const label = (locale: "es" | "en", own: boolean, count: number) =>
    countLabel(locale, locale === "es" ? es.sky : en.sky, { own, count });

  it("says nothing at zero", () => {
    expect(label("es", false, 0)).toBeUndefined();
    expect(label("en", true, 0)).toBeUndefined();
  });

  it("uses the plural rules of each language, for others' stars", () => {
    expect(label("es", false, 1)).toBe("1 persona acompaña esto");
    expect(label("es", false, 2)).toBe("2 personas acompañan esto");
    expect(label("en", false, 1)).toBe("1 person is with this");
    expect(label("en", false, 5)).toBe("5 people are with this");
  });

  it("and for the visitor's own", () => {
    expect(label("es", true, 1)).toBe("1 persona te acompaña");
    expect(label("es", true, 3)).toBe("3 personas te acompañan");
    expect(label("en", true, 1)).toBe("1 person is with you");
    expect(label("en", true, 4)).toBe("4 people are with you");
  });
});

describe("starName", () => {
  const same = (text: string) => text;
  it("names the visitor's own stars, and others' answered ones, as asked", () => {
    expect(starName(es.sky, petition({ mine: true }), same)).toBe("Tu estrella: Paz");
    expect(starName(en.sky, petition({ mine: true }), same)).toBe("Your star: Paz");
    expect(starName(es.sky, petition({ answered: { at: 1 } }), same)).toBe("Respondida: Paz");
    expect(starName(en.sky, petition({ answered: { at: 1 } }), same)).toBe("Answered: Paz");
  });

  it("names another's waiting star by its text alone", () => {
    expect(starName(es.sky, petition(), same)).toBe("Paz");
  });
});
