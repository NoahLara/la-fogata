import {
  allLeetVariants,
  brokenWords,
  joinedWords,
  leetVariants,
  plain,
  skeleton,
  spacedWords,
  spelledOutWords,
} from "./fold";
import { ALLOWED, MASKED, PHRASES, WORDS_EN, WORDS_ES } from "./words";

/** Why a text was not taken. */
export type ContentIssue = "no-words" | "gibberish" | "offensive";

export type ContentVerdict = { ok: true } | { ok: false; reason: ContentIssue };

const OK: ContentVerdict = { ok: true };
const refuse = (reason: ContentIssue): ContentVerdict => ({ ok: false, reason });

/** A word with this many more letters than a listed stem still counts as that word. */
const EXTRA_LETTERS = 3;

const squash = (entry: string) => entry.replace(/[^a-z*]/g, "");
const compile = (entries: readonly string[]) => {
  const exact = new Set<string>();
  const stems: string[] = [];
  for (const entry of entries.map((value) => squash(plain(value)))) {
    if (entry.endsWith("*")) stems.push(skeleton(entry.slice(0, -1)));
    else exact.add(skeleton(entry));
  }
  return { exact, stems };
};
const BAD = compile([...WORDS_ES, ...WORDS_EN]);
const MASKED_WORDS = new Set(MASKED);
const PHRASE_SKELETONS = PHRASES.map((phrase) => skeleton(squash(plain(phrase))));
const ALLOWED_WORDS = new Set(ALLOWED.map((word) => squash(plain(word))));

function isBadWord(word: string): boolean {
  if (ALLOWED_WORDS.has(word)) return false;
  const spelled = skeleton(word);
  if (BAD.exact.has(spelled)) return true;
  return BAD.stems.some(
    (stem) => spelled.startsWith(stem) && spelled.length - stem.length <= EXTRA_LETTERS,
  );
}

/** "coño" with its tilde: without it "cono" is also a cone. */
const CONO = /(^|[^\p{L}])co[ñÑ]+[oa]+s?(?![\p{L}])/iu;

/** Whether the words, or the letters run together, hold an insult. */
function isOffensive(text: string): boolean {
  if (CONO.test(text.normalize("NFC"))) return true;
  const folded = plain(text);
  const inWords = leetVariants(folded).some((reading) => {
    const spaced = spacedWords(reading);
    return (
      [...spaced, ...joinedWords(reading)].some(isBadWord) ||
      brokenWords(reading).some((word) => MASKED_WORDS.has(word))
    );
  });
  if (inWords) return true;
  // A word spelled out a letter at a time may use numbers and symbols for some of its letters ("p u t 4").
  const spelledOut = allLeetVariants(folded).some((reading) =>
    spelledOutWords(spacedWords(reading)).some(isBadWord),
  );
  if (spelledOut) return true;
  return [...leetVariants(folded), ...allLeetVariants(folded)].some((reading) => {
    const run = skeleton(spacedWords(reading).join(""));
    return PHRASE_SKELETONS.some((phrase) => run.includes(phrase));
  });
}

const LETTER = /\p{L}/gu;
const EMOJI = /\p{Extended_Pictographic}|\u200d|\ufe0f/gu;
const SPACE = /\s/gu;

/** Nothing readable: no letters, or mostly digits and symbols. Emoji beside real words are fine. */
function hasNoWords(text: string): boolean {
  const letters = (text.match(LETTER) ?? []).length;
  if (letters < 2) return true;
  const others = text.replace(EMOJI, "").replace(SPACE, "").replace(LETTER, "").length;
  return letters < others;
}

const VOWEL = /[aeiouy]/;
/** Neighbouring keys on a keyboard row, which no ordinary word contains. */
const KEY_RUNS: readonly string[] = [
  "qwer",
  "wert",
  "asdf",
  "sdfg",
  "dfgh",
  "fghj",
  "ghjk",
  "hjkl",
  "zxcv",
  "xcvb",
  "cvbn",
  "vbnm",
  "rewq",
  "trew",
  "fdsa",
  "gfds",
  "hgfd",
  "jhgf",
  "kjhg",
  "lkjh",
  "vcxz",
  "bvcx",
  "nbvc",
  "mnbv",
];

function isJunkWord(word: string): boolean {
  if (!/^[a-z]+$/.test(word)) return false;
  if (word.length > 30) return true;
  if (word.length >= 4 && !VOWEL.test(word)) return true;
  if (/[^aeiouy]{6,}/.test(word)) return true;
  return word.length >= 4 && KEY_RUNS.some((run) => word.includes(run));
}

/** Mashed keys, one letter or one chunk over and over, or the same word again and again. */
function isGibberish(text: string): boolean {
  const reading = plain(text);
  const words = spacedWords(reading);
  const letters = words.join("");
  if (letters.length >= 6 && new Set(letters).size <= 3) return true;
  if (letters.length >= 8 && /^(.{1,6}?)\1{2,}$/.test(letters)) return true;
  const long = words.filter((word) => word.length >= 3);
  if (long.length >= 8 && new Set(long).size * 8 <= long.length) return true;
  const junk = long.filter(isJunkWord).length;
  return junk > 0 && junk * 2 >= long.length;
}

/**
 * Looks at what someone wrote before it is handed over or raised: the words are checked and nothing is kept.
 * It cannot catch everything, only the common ways of getting around it; it is meant to keep the sky free of
 * rubbish, not to judge anyone.
 */
export function checkContent(text: string): ContentVerdict {
  if (isOffensive(text)) return refuse("offensive");
  if (hasNoWords(text)) return refuse("no-words");
  if (isGibberish(text)) return refuse("gibberish");
  return OK;
}
