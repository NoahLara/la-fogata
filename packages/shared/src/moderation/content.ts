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
import { ALLOWED, MASKED, PHRASES, ROOTS, WORDS_EN, WORDS_ES } from "./words";

/** Why a text was not taken. */
export type ContentIssue = "no-words" | "gibberish" | "offensive";

export type ContentVerdict = { ok: true } | { ok: false; reason: ContentIssue };

const OK: ContentVerdict = { ok: true };
const refuse = (reason: ContentIssue): ContentVerdict => ({ ok: false, reason });

/** A word with this many more letters than a stem ending in `*` still counts as that word; `**` allows more. */
const EXTRA_LETTERS = 3;
const MANY_EXTRA_LETTERS = 8;

/** Words and stems at least this long also match with one letter added, left out or changed. */
const FUZZY_FROM = 8;

const squash = (entry: string) => entry.replace(/[^a-z*]/g, "");

interface Stem {
  stem: string;
  extra: number;
  /** One letter wrong is forgiven. Spanish only: English words this close to "retarded" are "rewarded", "regarded". */
  fuzzy: boolean;
}

const compile = (entries: readonly string[], fuzzy: boolean) => {
  const exact = new Set<string>();
  const stems: Stem[] = [];
  for (const entry of entries.map((value) => squash(plain(value)))) {
    if (entry.endsWith("**"))
      stems.push({ stem: skeleton(entry.slice(0, -2)), extra: MANY_EXTRA_LETTERS, fuzzy });
    else if (entry.endsWith("*"))
      stems.push({ stem: skeleton(entry.slice(0, -1)), extra: EXTRA_LETTERS, fuzzy });
    else exact.add(skeleton(entry));
  }
  return {
    exact,
    stems,
    longExact: fuzzy ? [...exact].filter((word) => word.length >= FUZZY_FROM) : [],
  };
};
const SPANISH = compile(WORDS_ES, true);
const ENGLISH = compile(WORDS_EN, false);
const LISTS = [SPANISH, ENGLISH];
const MASKED_WORDS = new Set(MASKED);
const ROOT_SKELETONS = ROOTS.map((root) => skeleton(squash(plain(root))));
const PHRASE_SKELETONS = PHRASES.map((phrase) => skeleton(squash(plain(phrase))));
const ALLOWED_WORDS = new Set(ALLOWED.map((word) => squash(plain(word))));

/** Whether the two differ by at most one letter added, left out or changed. */
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  const restA = a.slice(i + 1);
  const restB = b.slice(i + 1);
  return restA === b.slice(i) || restB === a.slice(i) || restA === restB;
}

function startsLike(word: string, { stem, extra, fuzzy }: Stem): boolean {
  if (word.startsWith(stem)) return word.length - stem.length <= extra;
  if (!fuzzy || stem.length < FUZZY_FROM) return false;
  // The start may have one letter wrong, one too many or one too few.
  return [stem.length - 1, stem.length, stem.length + 1].some(
    (length) => word.length - length <= extra && oneEditApart(word.slice(0, length), stem),
  );
}

/**
 * Little words people glue in front of an insult when they leave out the spaces ("eresputa", "sosunputo"). Only
 * words of three letters or more (and "un"): shorter ones would turn "teaching" into te + a + ching.
 */
const GLUE = [
  "eres",
  "soy",
  "sos",
  "vos",
  "somos",
  "un",
  "una",
  "unos",
  "unas",
  "que",
  "tus",
  "mis",
  "los",
  "las",
  "ese",
  "esa",
  "esos",
  "esas",
  "este",
  "esta",
  "eso",
  "muy",
  "tan",
  "pinche",
  "you",
  "youre",
  "youare",
  "are",
  "such",
  "the",
  "what",
  "youarea",
  "youarean",
  "yourea",
  "sucha",
  "suchan",
]
  .map(skeleton)
  .sort((a, b) => b.length - a.length);

/** Whether the word is a bad word with a few little words glued in front of it. */
function glued(word: string, depth = 0): boolean {
  if (depth >= 4) return false;
  return GLUE.some(
    (little) =>
      word.length - little.length >= 3 &&
      word.startsWith(little) &&
      (isBadAlone(word.slice(little.length)) || glued(word.slice(little.length), depth + 1)),
  );
}

function isBadWord(word: string): boolean {
  return isBadAlone(word) || glued(skeleton(word));
}

function isBadAlone(word: string): boolean {
  if (ALLOWED_WORDS.has(word)) return false;
  const spelled = skeleton(word);
  if (LISTS.some((list) => list.exact.has(spelled))) return true;
  if (LISTS.some((list) => list.stems.some((stem) => startsLike(spelled, stem)))) return true;
  if (ROOT_SKELETONS.some((root) => spelled.includes(root))) return true;
  return (
    spelled.length >= FUZZY_FROM && SPANISH.longExact.some((entry) => oneEditApart(spelled, entry))
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
