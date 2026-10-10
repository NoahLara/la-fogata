import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { es } from "../i18n/es";
import { LOCALES, type Locale } from "../i18n/locale";
import {
  contextualWordsFor,
  fullVerseNumber,
  textOf,
  WORDS,
  wordsFor,
  type WordTheme,
} from "./words";

/** The longest a word may be, so it reads well on a phone. */
const MAX_LENGTH = 120;
/** A word should be this short or shorter; a few may go over, up to MAX_LENGTH. */
const SOFT_LENGTH = 90;
/** The most words per language that may go over SOFT_LENGTH. */
const MAX_LONG = 8;
const MIN_PER_LANGUAGE = 20;
const MIN_PER_THEME = 2;
const THEMES: readonly WordTheme[] = [
  "presence",
  "rest",
  "night",
  "peace",
  "love",
  "asking",
  "together",
];

/** Names the fire never says: an entry with one must be cut to a part without it, or left out. */
const EXCLUDED = [
  "Dios",
  "God",
  "Señor",
  "Lord",
  "Yahweh",
  "Jehová",
  "Jesús",
  "Jesus",
  "Cristo",
  "Christ",
  "Espíritu",
  "Spirit",
  "Padre",
  "Father",
];

/** Entries whose source verse ends without a full stop, so they end as it does. */
const SOURCE_ENDS_WITHOUT_STOP = new Set(["presence-isaiah-43-2b:es"]);

const texts = (locale: Locale) =>
  wordsFor(locale).map((word) => ({ id: word.id, text: textOf(word, locale) ?? "" }));

describe("WORDS", () => {
  it("has unique ids", () => {
    expect(new Set(WORDS.map((word) => word.id)).size).toBe(WORDS.length);
  });

  it("has at least one language per entry, and none empty", () => {
    for (const word of WORDS) {
      expect(word.text.es !== undefined || word.text.en !== undefined, word.id).toBe(true);
      for (const locale of LOCALES) expect(word.text[locale]?.trim(), word.id).not.toBe("");
    }
  });

  it.each(LOCALES)("has enough words in %s", (locale) => {
    expect(wordsFor(locale).length).toBeGreaterThanOrEqual(MIN_PER_LANGUAGE);
  });

  it.each(LOCALES)("has every theme in %s", (locale) => {
    for (const theme of THEMES) {
      const count = wordsFor(locale).filter((word) => word.theme === theme).length;
      expect(count, `${theme} in ${locale}`).toBeGreaterThanOrEqual(MIN_PER_THEME);
    }
  });

  it.each(LOCALES)("keeps every %s word within the length limit", (locale) => {
    for (const { id, text } of texts(locale)) {
      expect(text.length, id).toBeLessThanOrEqual(MAX_LENGTH);
    }
  });

  it.each(LOCALES)("keeps most %s words short", (locale) => {
    const long = texts(locale).filter(({ text }) => text.length > SOFT_LENGTH);
    expect(long.map(({ id }) => id).length).toBeLessThanOrEqual(MAX_LONG);
  });

  it("names none of the excluded names", () => {
    const pattern = new RegExp(`(?<![\\p{L}])(${EXCLUDED.join("|")})(?![\\p{L}])`, "iu");
    for (const locale of LOCALES) {
      for (const { id, text } of texts(locale))
        expect(text, `${id} ${locale}`).not.toMatch(pattern);
    }
  });

  it("shows no quotation marks", () => {
    for (const locale of LOCALES) {
      for (const { id, text } of texts(locale))
        expect(text, `${id} ${locale}`).not.toMatch(/[«»“”‘"]/);
    }
  });

  it("starts at a sentence, or with … when it starts in the middle of one", () => {
    for (const locale of LOCALES) {
      for (const { id, text } of texts(locale)) {
        expect(text, `${id} ${locale}`).toMatch(/^(…|[¿¡]?\p{Lu})/u);
      }
    }
  });

  it("ends at the end of a sentence, or with … where it was cut", () => {
    for (const locale of LOCALES) {
      for (const { id, text } of texts(locale)) {
        if (SOURCE_ENDS_WITHOUT_STOP.has(`${id}:${locale}`)) continue;
        expect(text, `${id} ${locale}`).toMatch(/[.!?…]$/u);
      }
    }
  });

  it("names a book that both dictionaries know", () => {
    for (const word of WORDS) {
      expect(es.books[word.ref.book], word.id).toBeTruthy();
      expect(en.books[word.ref.book], word.id).toBeTruthy();
    }
  });
});

describe("the verse number of the reference", () => {
  const find = (id: string) => {
    const word = WORDS.find((entry) => entry.id === id);
    if (!word) throw new Error(`missing word ${id}`);
    return word;
  };

  it("keeps the a or b of a fragment in the number of the reference", () => {
    const word = find("peace-isaiah-43-1");
    expect(fullVerseNumber(word, "es")).toBe("43:1b");
  });

  it("follows the language when the translations cut a verse differently", () => {
    const word = find("asking-isaiah-65-24");
    expect(fullVerseNumber(word, "es")).toBe("65:24");
    expect(fullVerseNumber(word, "en")).toBe("65:24b");
  });

  it("keeps a range whole", () => {
    expect(fullVerseNumber(find("night-psalms-126-5"), "es")).toBe("126:5–6");
  });
});

describe("contextualWordsFor", () => {
  it("leaves out the words that are only for a tap", () => {
    const ids = contextualWordsFor("es").map((word) => word.id);
    expect(ids).not.toContain("presence-revelation-3-20");
    expect(wordsFor("es").map((word) => word.id)).toContain("presence-revelation-3-20");
  });

  it("keeps every theme in both languages", () => {
    for (const locale of LOCALES) {
      for (const theme of THEMES) {
        const count = contextualWordsFor(locale).filter((word) => word.theme === theme).length;
        expect(count, `${theme} in ${locale}`).toBeGreaterThanOrEqual(MIN_PER_THEME);
      }
    }
  });
});

describe("wordsFor", () => {
  it("has the one-language words the editors chose", () => {
    const only = (id: string) => WORDS.find((word) => word.id === id)?.text;
    expect(only("presence-revelation-3-20")?.en).toBeUndefined();
    expect(only("peace-corinthians2-4-8")?.en).toBeUndefined();
    expect(only("rest-psalms-56-8")?.en).toBeUndefined();
  });

  it("leaves out entries that have no text in that language", () => {
    expect(wordsFor("es").map((word) => word.id)).not.toContain("asking-matthew-7-7");
    expect(wordsFor("en").map((word) => word.id)).not.toContain("peace-isaiah-54-10b");
  });
});
