import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { groupName, skyCounts } from "./skySummary";

describe("skyCounts", () => {
  it("counts the stars and the answered ones", () => {
    expect(skyCounts([])).toEqual({ stars: 0, answered: 0 });
    expect(
      skyCounts([{ answered: { at: 1 } }, {}, { answered: { at: 2, note: "x" } }, {}]),
    ).toEqual({ stars: 4, answered: 2 });
  });
});

describe("the name of the group of the visitor's stars", () => {
  it("says the counts, each with Spanish plural rules", () => {
    expect(groupName("es", es.sky, { stars: 0, answered: 0 })).toBe(
      "Tus peticiones: 0 estrellas, 0 respondidas",
    );
    expect(groupName("es", es.sky, { stars: 1, answered: 0 })).toBe(
      "Tus peticiones: 1 estrella, 0 respondidas",
    );
    expect(groupName("es", es.sky, { stars: 1, answered: 1 })).toBe(
      "Tus peticiones: 1 estrella, 1 respondida",
    );
    expect(groupName("es", es.sky, { stars: 5, answered: 2 })).toBe(
      "Tus peticiones: 5 estrellas, 2 respondidas",
    );
  });

  it("says them with English plural rules", () => {
    expect(groupName("en", en.sky, { stars: 1, answered: 1 })).toBe(
      "Your stars: 1 star, 1 answered",
    );
    expect(groupName("en", en.sky, { stars: 3, answered: 0 })).toBe(
      "Your stars: 3 stars, 0 answered",
    );
  });
});
