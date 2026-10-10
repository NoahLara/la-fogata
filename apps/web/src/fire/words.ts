import type { Locale } from "../i18n/locale";

export type WordTheme = "presence" | "rest" | "night" | "peace" | "love" | "asking" | "together";

/** Keys into `books` in the dictionaries, where the localized book names live. */
export type BookKey =
  | "isaiah"
  | "psalms"
  | "matthew"
  | "hebrews"
  | "joshua"
  | "galatians"
  | "john"
  | "songOfSongs"
  | "corinthians2"
  | "jeremiah"
  | "revelation"
  | "ecclesiastes"
  | "romans"
  | "proverbs"
  | "thessalonians1";

/** At least one language: a verse can read well in one translation and only weakly in the other. */
export type WordText = { es: string; en?: string } | { es?: string; en: string };

export interface Word {
  id: string;
  theme: WordTheme;
  /**
   * `verses` is a verse or range, with a or b when the text is only part of a verse. It can differ by language
   * when the two translations cut the verse differently. Never shown unless the visitor asks.
   */
  ref: { book: BookKey; chapter: number; verses: string | Record<Locale, string> };
  /** Spanish: Traducción en lenguaje actual (TLA). English: World English Bible (WEB). Exactly as published. */
  text: WordText;
  /** Only when the visitor touches the fire: never said on its own, such as when they are left alone. */
  tapOnly?: true;
}

/**
 * The words the fire can say. The text is never edited: an entry is a whole verse or a contiguous fragment of one.
 * A fragment that starts mid-sentence begins with "…"; one that stops at a ; , or : ends with "…" in its place.
 * Quotation marks are left out. Nothing names God, Lord, Yahweh, Jesus, Christ, the Spirit or the Father, and
 * nothing addresses the reader in the singular with a gendered word.
 */
export const WORDS: readonly Word[] = [
  {
    id: "presence-isaiah-41-10",
    theme: "presence",
    ref: { book: "isaiah", chapter: 41, verses: "10a" },
    text: { en: "Don’t you be afraid, for I am with you." },
  },
  {
    id: "presence-isaiah-43-2a",
    theme: "presence",
    ref: { book: "isaiah", chapter: 43, verses: "2a" },
    text: {
      es: "Aunque tengas graves problemas, yo siempre estaré contigo…",
      en: "When you pass through the waters, I will be with you…",
    },
  },
  {
    id: "presence-isaiah-43-2b",
    theme: "presence",
    ref: { book: "isaiah", chapter: 43, verses: "2b" },
    text: {
      es: "…cruzarás ríos y no te ahogarás, caminarás en el fuego y no te quemarás",
      en: "When you walk through the fire, you will not be burned, and flame will not scorch you.",
    },
  },
  {
    id: "presence-psalms-23-4",
    theme: "presence",
    ref: { book: "psalms", chapter: 23, verses: "4a" },
    text: {
      es: "Puedo cruzar lugares peligrosos y no tener miedo de nada…",
      en: "…I will fear no evil, for you are with me.",
    },
  },
  {
    id: "presence-matthew-28-20",
    theme: "presence",
    ref: { book: "matthew", chapter: 28, verses: "20b" },
    text: { es: "Yo estaré siempre con ustedes…", en: "…I am with you always…" },
  },
  {
    id: "presence-hebrews-13-5",
    theme: "presence",
    ref: { book: "hebrews", chapter: 13, verses: "5b" },
    text: { en: "I will in no way leave you…" },
  },
  {
    id: "presence-isaiah-49-15",
    theme: "presence",
    ref: { book: "isaiah", chapter: 49, verses: "15b" },
    text: { es: "…yo no me olvidaré de ti.", en: "…yet I will not forget you!" },
  },
  {
    id: "presence-joshua-1-9",
    theme: "presence",
    ref: { book: "joshua", chapter: 1, verses: "9a" },
    text: {
      es: "Yo te pido que seas fuerte y valiente, que no te desanimes ni tengas miedo…",
      en: "Be strong and courageous. Don’t be afraid.",
    },
  },
  {
    id: "presence-revelation-3-20",
    theme: "presence",
    ref: { book: "revelation", chapter: 3, verses: "20" },
    text: {
      es: "Yo estoy a tu puerta, y llamo; si oyes mi voz y me abres, entraré en tu casa y cenaré contigo.",
    },
    tapOnly: true,
  },
  {
    id: "rest-matthew-11-28",
    theme: "rest",
    ref: { book: "matthew", chapter: 11, verses: "28" },
    text: {
      es: "Ustedes viven siempre angustiados y preocupados. Vengan a mí, y yo los haré descansar.",
      en: "Come to me, all you who labor and are heavily burdened, and I will give you rest.",
    },
  },
  {
    id: "rest-galatians-6-2",
    theme: "rest",
    ref: { book: "galatians", chapter: 6, verses: "2a" },
    text: {
      es: "Cuando tengan dificultades, ayúdense unos a otros.",
      en: "Bear one another’s burdens…",
    },
  },
  {
    id: "rest-psalms-56-8",
    theme: "rest",
    ref: { book: "psalms", chapter: 56, verses: "8b" },
    text: {
      es: "…tú bien sabes las veces que he llorado.",
    },
  },
  {
    id: "rest-matthew-6-34",
    theme: "rest",
    ref: { book: "matthew", chapter: 6, verses: "34a" },
    text: {
      es: "Así que no se preocupen por lo que pasará mañana.",
      en: "Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself.",
    },
  },
  {
    id: "night-psalms-30-5",
    theme: "night",
    ref: { book: "psalms", chapter: 30, verses: "5b" },
    text: {
      es: "Tal vez lloremos por la noche, pero en la mañana estaremos felices.",
      en: "Weeping may stay for the night, but joy comes in the morning.",
    },
  },
  {
    id: "night-psalms-139-12a",
    theme: "night",
    ref: { book: "psalms", chapter: 139, verses: "12a" },
    text: {
      es: "¡Para ti no hay diferencia entre la oscuridad y la luz!",
      en: "The darkness is like light to you.",
    },
  },
  {
    id: "night-psalms-139-12b",
    theme: "night",
    ref: { book: "psalms", chapter: 139, verses: "12b" },
    text: {
      es: "¡Para ti, hasta la noche brilla como la luz del sol!",
      en: "…the night shines as the day.",
    },
  },
  {
    id: "night-john-1-5",
    theme: "night",
    ref: { book: "john", chapter: 1, verses: "5" },
    text: {
      es: "La luz alumbra en la oscuridad, ¡y nada puede destruirla!",
      en: "The light shines in the darkness, and the darkness hasn’t overcome it.",
    },
  },
  {
    id: "night-isaiah-42-3",
    theme: "night",
    ref: { book: "isaiah", chapter: 42, verses: "3b" },
    text: { en: "He won’t quench a dimly burning wick." },
  },
  {
    id: "night-song-of-songs-8-7",
    theme: "night",
    ref: { book: "songOfSongs", chapter: 8, verses: "7a" },
    text: {
      es: "¡No hay mares que puedan apagarlo, ni ríos que puedan extinguirlo!",
      en: "Many waters can’t quench love, neither can floods drown it.",
    },
  },
  {
    id: "night-psalms-126-5",
    theme: "night",
    ref: { book: "psalms", chapter: 126, verses: { es: "5–6", en: "5" } },
    text: {
      es: "Las lágrimas que derramamos cuando sembramos la semilla se volverán cantos de alegría cuando cosechemos el trigo.",
      en: "Those who sow in tears will reap in joy.",
    },
  },
  {
    id: "peace-john-14-27a",
    theme: "peace",
    ref: { book: "john", chapter: 14, verses: "27a" },
    text: {
      es: "Les doy la paz, mi propia paz…",
      en: "Peace I leave with you. My peace I give to you…",
    },
  },
  {
    id: "peace-john-14-27b",
    theme: "peace",
    ref: { book: "john", chapter: 14, verses: "27b" },
    text: {
      es: "No se preocupen ni tengan miedo por lo que pronto va a pasar.",
      en: "Don’t let your heart be troubled, neither let it be fearful.",
    },
  },
  {
    id: "peace-isaiah-43-1",
    theme: "peace",
    ref: { book: "isaiah", chapter: 43, verses: "1b" },
    text: {
      es: "…te he llamado por tu nombre y tú me perteneces.",
      en: "I have called you by your name. You are mine.",
    },
  },
  {
    id: "peace-isaiah-54-10a",
    theme: "peace",
    ref: { book: "isaiah", chapter: 54, verses: "10a" },
    text: {
      es: "Las montañas podrán cambiar de lugar, los cerros podrán venirse abajo, pero mi amor por ti no cambiará.",
      en: "For the mountains may depart, and the hills be removed, but my loving kindness will not depart from you…",
    },
  },
  {
    id: "peace-isaiah-54-10b",
    theme: "peace",
    ref: { book: "isaiah", chapter: 54, verses: "10b" },
    text: { es: "Siempre estaré a tu lado y juntos viviremos en paz." },
  },
  {
    id: "peace-corinthians2-4-8",
    theme: "peace",
    ref: { book: "corinthians2", chapter: 4, verses: "8b" },
    text: {
      es: "Tenemos preocupaciones, pero no perdemos la calma.",
    },
  },
  {
    id: "peace-corinthians2-4-9",
    theme: "peace",
    ref: { book: "corinthians2", chapter: 4, verses: "9b" },
    text: { es: "Nos hacen caer, pero no nos destruyen.", en: "…struck down, yet not destroyed…" },
  },
  {
    id: "peace-corinthians2-12-9",
    theme: "peace",
    ref: { book: "corinthians2", chapter: 12, verses: "9a" },
    text: { es: "Mi amor es todo lo que necesitas.", en: "My grace is sufficient for you…" },
  },
  {
    id: "love-jeremiah-31-3",
    theme: "love",
    ref: { book: "jeremiah", chapter: 31, verses: "3b" },
    text: {
      es: "…siempre te he amado, siempre te he sido fiel.",
      en: "Yes, I have loved you with an everlasting love.",
    },
  },
  {
    id: "love-isaiah-43-4",
    theme: "love",
    ref: { book: "isaiah", chapter: 43, verses: "4a" },
    text: {
      es: "…yo te amo; tú vales mucho para mí.",
      en: "…you have been precious and honored in my sight, and I have loved you…",
    },
  },
  {
    id: "asking-matthew-7-7",
    theme: "asking",
    ref: { book: "matthew", chapter: 7, verses: "7" },
    text: {
      en: "Ask, and it will be given you. Seek, and you will find. Knock, and it will be opened for you.",
    },
  },
  {
    id: "asking-jeremiah-33-3",
    theme: "asking",
    ref: { book: "jeremiah", chapter: 33, verses: "3a" },
    text: { es: "Llámame y te responderé.", en: "Call to me, and I will answer you…" },
  },
  {
    id: "asking-jeremiah-29-13",
    theme: "asking",
    ref: { book: "jeremiah", chapter: 29, verses: "13" },
    text: {
      es: "Cuando ustedes me busquen, me encontrarán, siempre y cuando me busquen de todo corazón.",
      en: "You shall seek me and find me, when you search for me with all your heart.",
    },
  },
  {
    id: "asking-isaiah-65-24",
    theme: "asking",
    ref: { book: "isaiah", chapter: 65, verses: { es: "24", en: "24b" } },
    text: {
      es: "Antes de que me llamen, yo les responderé; antes de que terminen de hablar, ya los habré escuchado.",
      en: "…before they call, I will answer; and while they are yet speaking, I will hear.",
    },
  },
  {
    id: "together-matthew-18-20",
    theme: "together",
    ref: { book: "matthew", chapter: 18, verses: "20b" },
    text: {
      es: "…allí donde dos o tres de ustedes se reúnan en mi nombre, allí estaré yo.",
      en: "…where two or three are gathered together in my name, there I am in the middle of them.",
    },
  },
  {
    id: "together-ecclesiastes-4-10",
    theme: "together",
    ref: { book: "ecclesiastes", chapter: 4, verses: "10a" },
    text: {
      es: "…si uno de ellos se tropieza, el otro puede levantarlo.",
      en: "…if they fall, the one will lift up his fellow…",
    },
  },
  {
    id: "together-ecclesiastes-4-12",
    theme: "together",
    ref: { book: "ecclesiastes", chapter: 4, verses: "12b" },
    text: {
      es: "…si tres unen sus fuerzas, ya no es fácil derrotarlas.",
      en: "…a threefold cord is not quickly broken.",
    },
  },
  {
    id: "together-romans-12-15",
    theme: "together",
    ref: { book: "romans", chapter: 12, verses: "15b" },
    text: {
      es: "…si alguno está triste, acompáñenlo en su tristeza.",
      en: "Weep with those who weep.",
    },
  },
  {
    id: "together-proverbs-17-17",
    theme: "together",
    ref: { book: "proverbs", chapter: 17, verses: { es: "17", en: "17a" } },
    text: {
      es: "El amigo siempre es amigo, y en los tiempos difíciles es más que un hermano.",
      en: "A friend loves at all times…",
    },
  },
  {
    id: "together-thessalonians1-5-11",
    theme: "together",
    ref: { book: "thessalonians1", chapter: 5, verses: { es: "11a", en: "11b" } },
    text: { es: "…anímense los unos a los otros…", en: "…build each other up…" },
  },
];

/** The text in this language, if the entry has it. */
export function textOf(word: Word, locale: Locale): string | undefined {
  return word.text[locale];
}

/** The entries that can be said in this language. */
export function wordsFor(locale: Locale): readonly Word[] {
  return WORDS.filter((word) => textOf(word, locale) !== undefined);
}

/** The entries the fire may say by itself, when something happens (for example when the visitor is left alone). */
export function contextualWordsFor(locale: Locale): readonly Word[] {
  return wordsFor(locale).filter((word) => word.tapOnly !== true);
}

/** The verses of an entry in this language, such as "10b". */
export function versesOf(word: Word, locale: Locale): string {
  return typeof word.ref.verses === "string" ? word.ref.verses : word.ref.verses[locale];
}

/** The number in the full reference, which keeps the a or b of a fragment, such as "41:10b". */
export function fullVerseNumber(word: Word, locale: Locale): string {
  return `${word.ref.chapter}:${versesOf(word, locale)}`;
}
