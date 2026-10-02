import { describe, expect, it } from "vitest";
import { en } from "./en";
import { es } from "./es";

type Tree = { [key: string]: string | Tree };

/** Every string in a dictionary, by its dotted key. */
function leaves(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[`${prefix}${key}`, value] as [string, string]]
      : leaves(value, `${prefix}${key}.`),
  );
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("dictionaries", () => {
  const spanish = leaves(es);
  const english = leaves(en);

  it("have the same keys", () => {
    expect(english.map(([key]) => key)).toEqual(spanish.map(([key]) => key));
  });

  it("have no empty strings", () => {
    for (const [key, value] of [...spanish, ...english]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("use the same {placeholders} in every language", () => {
    const englishByKey = new Map(english);
    for (const [key, value] of spanish) {
      expect(placeholders(englishByKey.get(key) ?? ""), key).toEqual(placeholders(value));
    }
  });

  it("give every plural both forms", () => {
    for (const [key] of spanish.filter(([key]) => /\.(one|other)$/.test(key))) {
      const base = key.replace(/\.(one|other)$/, "");
      expect(
        spanish.map(([k]) => k),
        base,
      ).toContain(`${base}.one`);
      expect(
        spanish.map(([k]) => k),
        base,
      ).toContain(`${base}.other`);
    }
  });
});
