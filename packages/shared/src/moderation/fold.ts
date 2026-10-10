/**
 * Turning what someone typed into something that can be compared, however it was disguised: capitals, accents,
 * digits and symbols standing in for letters ("pu7a", "m13rd@"), look-alike letters from other alphabets,
 * invisible characters, letters spread out ("p u t a") or broken up with punctuation ("p.u.t.a"), and stretched
 * letters ("puuuuta"). This only ever runs in the browser, on text that is checked and then dropped.
 */

// These classes are made of invisible and combining characters on purpose: that is what they strip.
/* eslint-disable no-misleading-character-class, no-irregular-whitespace */
const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁯ㅤ﻿ﾠ]/g;
const MARKS = /[̀-ͯ]/g;
/* eslint-enable no-misleading-character-class, no-irregular-whitespace */

/** Letters from other alphabets that look like Latin ones. */
const HOMOGLYPHS: Readonly<Record<string, string>> = {
  а: "a",
  в: "b",
  е: "e",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x",
  і: "i",
  ї: "i",
  ѕ: "s",
  ј: "j",
  ԁ: "d",
  ӏ: "l",
  α: "a",
  β: "b",
  ε: "e",
  ι: "i",
  κ: "k",
  ν: "v",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "u",
  χ: "x",
  ı: "i",
  ɡ: "g",
  ɑ: "a",
  ᴏ: "o",
  ꜱ: "s",
};

/** What a digit or symbol stands for. "1" can be an i or an l, so a text has two readings. */
const LEET: Readonly<Record<string, readonly [string, string]>> = {
  "0": ["o", "o"],
  "1": ["i", "l"],
  "3": ["e", "e"],
  "4": ["a", "a"],
  "5": ["s", "s"],
  "7": ["t", "t"],
  "@": ["a", "a"],
  $: ["s", "s"],
  "+": ["t", "t"],
};

const unique = (values: string[]) => [...new Set(values)];

/** Lower case, no accents or invisible characters, look-alike letters made Latin. `ñ` becomes `n`. */
export function plain(text: string): string {
  const folded = text
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .normalize("NFD")
    .replace(MARKS, "")
    .toLowerCase();
  let out = "";
  for (const char of folded) out += HOMOGLYPHS[char] ?? char;
  return out;
}

/**
 * The text with digits and symbols standing in for letters turned back into letters, but only inside a stretch
 * that already has letters in it ("pu7a", "m13rd@"): a number on its own ("3 hijos", "2024") stays a number.
 */
export function leetVariants(text: string): string[] {
  // An exclamation mark between letters is an "i" ("b!tch"); at the end of a word it is just punctuation.
  text = text.replace(/(?<=[a-z])!(?=[a-z])/g, "i");
  const read = (which: 0 | 1) =>
    text.replace(/[a-z0-9@$+]+/g, (run) =>
      /[a-z]/.test(run) ? run.replace(/[0-9@$+]/g, (char) => LEET[char]?.[which] ?? char) : run,
    );
  return unique([read(0), read(1)]);
}

/** The text with every digit and symbol turned into its letter, wherever it is. Only for long phrases. */
export function allLeetVariants(text: string): string[] {
  const read = (which: 0 | 1) => text.replace(/[0-9@$+]/g, (char) => LEET[char]?.[which] ?? char);
  return unique([read(0), read(1)]);
}

/** What sits inside a word to break it up. */
const INNER_BREAKS = /(?<=[a-z])[.*_\-'’·•|/\\#~^`"=,;:](?=[a-z])/g;

/** The runs of letters, with the punctuation inside words taken out ("p.u.t.a" is "puta"). */
export function joinedWords(text: string): string[] {
  return text
    .replace(INNER_BREAKS, "")
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/**
 * Words with punctuation inside them, joined ("p*ta" is "pta", "b.i.t.c.h" is "bitch"): the stretches of text
 * that hold letters and breaks together, with the breaks taken out.
 */
export function brokenWords(text: string): string[] {
  return text
    .split(/[^a-z.*_\-'’·•|/\\#~^`"=,;:]+/)
    .filter((chunk) => /[a-z]/.test(chunk) && chunk.replace(/[a-z]/g, "").length > 0)
    .map((chunk) => chunk.replace(/[^a-z]/g, ""))
    .filter(Boolean);
}

/** The runs of letters, with every other character a break. */
export function spacedWords(text: string): string[] {
  return text.split(/[^a-z]+/).filter(Boolean);
}

/** The longest spelled-out stretch that is searched for words inside it. */
const MAX_SPELLED_RUN = 40;

/**
 * Words spelled out a letter at a time ("p u t a", "ppp uuu ttt aaa"): in every stretch of single letters (once
 * each stretched letter is one), every run of three or more letters is a candidate word, since the word may
 * have other single letters beside it ("n i g g e r I'm scared").
 */
export function spelledOutWords(words: readonly string[]): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    const letters = run.slice(0, MAX_SPELLED_RUN);
    for (let start = 0; start + 3 <= letters.length; start++) {
      for (let end = start + 3; end <= letters.length; end++) {
        out.push(letters.slice(start, end).join(""));
      }
    }
    run = [];
  };
  for (const word of words) {
    const letters = word.replace(/(.)\1+/g, "$1");
    if (letters.length === 1) run.push(letters);
    else flush();
  }
  flush();
  return out;
}

/**
 * The spelling that things are compared in: stretched letters are one, and the letters Spanish and English
 * writers swap or misspell most are the same (b/v, c/k, s/z).
 */
export function skeleton(word: string): string {
  return word
    .replace(/[bv]/g, "u")
    .replace(/k/g, "c")
    .replace(/z/g, "s")
    .replace(/(.)\1+/g, "$1");
}
