import { describe, expect, it } from "vitest";
import { WORDS as VERSES, textOf } from "@/fire/words";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { checkContent } from "./content";
import { WORDS_EN, WORDS_ES } from "./words";

const refused = (text: string) => {
  const verdict = checkContent(text);
  return verdict.ok ? "ok" : verdict.reason;
};

/** Whole words as people write them, beyond the stems in the list. */
const SPANISH_INSULTS = [
  "puta",
  "putas",
  "puto",
  "putos",
  "putita",
  "hijo de puta",
  "hijoputa",
  "hijueputa",
  "hijos de puta",
  "pendejo",
  "pendeja",
  "pendejos",
  "pendejada",
  "cabrón",
  "cabrona",
  "cabrones",
  "mierda",
  "mierdas",
  "mierdoso",
  "culero",
  "culera",
  "culo",
  "culiao",
  "verga",
  "ojete",
  "chinga tu madre",
  "chingado",
  "chingada",
  "chingón",
  "cojones",
  "huevón",
  "weón",
  "boludo",
  "pelotudo",
  "gilipollas",
  "maricón",
  "marica",
  "joto",
  "sudaca",
  "pinche",
  "carajo",
  "joder",
  "jódete",
  "jodido",
  "puñeta",
  "zorra",
  "idiota",
  "imbécil",
  "estúpido",
  "estúpida",
  "subnormal",
  "cretino",
  "tarado",
  "mamón",
  "mamada",
  "mamaguevo",
  "pajero",
  "cagada",
  "cagón",
  "hdp",
  "ptm",
  "ctm",
  "hijo de la gran puta",
  "come mierda",
  "coman mierda",
  "cómete la mierda",
  "vete a la mierda",
  "vete a la verga",
  "chúpamela",
  "concha tu madre",
  "conchetumadre",
  "malparido",
  "malnacido",
  "púdrete",
  "muérete",
  "mátate",
  "te voy a matar",
  "voy a matarte",
  "te voy a violar",
  "ojalá te pudras",
  "mamahuevo",
  "putilla",
  "culeado",
  "cabroncete",
  "suicídate",
  "hijas de puta",
  "ptmre",
  "ctmre",
  "ojalá te mueras",
  "tu puta madre",
  "hijo de mierda",
  "cerote",
  "cerota",
  "cerotes",
  "sos cerote",
  "sos un cerote",
  "forro",
  "trolo",
  "sorete",
  "cojudo",
  "caremonda",
  "marico",
  "pajuo",
  "baboso",
  "la concha de tu madre",
  "hijo de re mil puta",
  "chupa verga",
];

const ENGLISH_INSULTS = [
  "fuck",
  "fucker",
  "fucking",
  "fucked",
  "motherfucker",
  "shit",
  "shitty",
  "bullshit",
  "bitch",
  "bitches",
  "bastard",
  "asshole",
  "dumbass",
  "jackass",
  "cunt",
  "whore",
  "slut",
  "pussy",
  "dickhead",
  "douchebag",
  "wanker",
  "twat",
  "bollocks",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "retarded",
  "stfu",
  "kys",
  "fuck you",
  "fuck off",
  "go fuck yourself",
  "son of a bitch",
  "kill yourself",
  "go kill yourself",
  "eat shit",
  "suck my dick",
  "i hope you die",
  "die in a fire",
  "hang yourself",
  "i'll kill you",
];

const ALL = [...SPANISH_INSULTS, ...ENGLISH_INSULTS];

/** The ways people try to get a word past a filter, each one applied to the word. */
const DISGUISES: ReadonlyArray<readonly [string, (text: string) => string]> = [
  ["as it is", (t) => t],
  ["capitals", (t) => t.toUpperCase()],
  ["mixed capitals", (t) => [...t].map((c, i) => (i % 2 ? c.toUpperCase() : c)).join("")],
  ["stretched letters", (t) => t.replace(/[aeiou]/gi, (c) => c.repeat(4))],
  ["every letter doubled", (t) => [...t].map((c) => c + c).join("")],
  ["last letter stretched", (t) => t + t.slice(-1).repeat(6)],
  ["spelled out with spaces", (t) => [...t.replace(/ /g, "")].join(" ")],
  ["spelled out with wide gaps", (t) => [...t].join("   ")],
  ["spelled out with dots", (t) => [...t.replace(/ /g, "")].join(".")],
  ["spelled out with dashes", (t) => [...t.replace(/ /g, "")].join("-")],
  ["spelled out with stars", (t) => [...t.replace(/ /g, "")].join("*")],
  ["spelled out with underscores", (t) => [...t.replace(/ /g, "")].join("_")],
  ["spaced letters, stretched", (t) => [...t].map((c) => c + c.repeat(2)).join(" ")],
  ["run together", (t) => t.replace(/ /g, "")],
  ["with commas", (t) => t.replace(/ /g, ", ")],
  ["numbers for letters", (t) => t.replace(/o/gi, "0").replace(/a/gi, "4").replace(/e/gi, "3")],
  ["more numbers", (t) => t.replace(/i/gi, "1").replace(/s/gi, "5").replace(/t/gi, "7")],
  ["symbols for letters", (t) => t.replace(/a/gi, "@").replace(/s/gi, "$")],
  ["accents on everything", (t) => t.replace(/[aeiou]/gi, (c) => `${c}́`)],
  ["invisible characters", (t) => [...t].join("​")],
  ["soft hyphens", (t) => [...t].join("­")],
  [
    "look-alike letters",
    (t) => t.replace(/a/g, "а").replace(/e/g, "е").replace(/o/g, "о").replace(/c/g, "с"),
  ],
  [
    "full-width letters",
    (t) => t.replace(/[a-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)),
  ],
  ["in a sentence", (t) => `no puedo creer que seas tan ${t} la verdad`],
  ["after a sentence", (t) => `Hoy fue un día largo. ${t}`],
  ["between lines", (t) => `hola\n\n${t}\n\nadiós`],
  ["with punctuation", (t) => `¡¡${t}!!`],
  ["in quotes", (t) => `"${t}"`],
  ["with emoji", (t) => `😡 ${t} 😡`],
];

describe("an insult, however it is written, is refused", () => {
  for (const [name, disguise] of DISGUISES) {
    it(`when written with ${name}`, () => {
      const missed = ALL.filter((word) => refused(disguise(word)) !== "offensive");
      expect(missed).toEqual([]);
    });
  }

  it("when two disguises are used at once", () => {
    const missed: string[] = [];
    for (const word of ALL) {
      for (const [, first] of DISGUISES.slice(1, 12)) {
        for (const [, second] of DISGUISES.slice(12, 22)) {
          const text = second(first(word));
          if (refused(text) !== "offensive") missed.push(`${word} → ${text}`);
        }
      }
    }
    // A few combinations destroy the word altogether (an accent mark between every spelled letter, then stars).
    expect(missed.length / (ALL.length * 11 * 10)).toBeLessThan(0.02);
  });

  it("whatever the list holds", () => {
    const stems = [...WORDS_ES, ...WORDS_EN].map((entry) => entry.replace(/\*$/, ""));
    const missed = stems.filter((stem) => refused(stem) !== "offensive");
    expect(missed).toEqual([]);
  });

  it("coño, when it is written with its tilde (without it, cono is also a cone)", () => {
    for (const text of ["coño", "COÑO", "qué coño quieres", "coñooo", "¡coño!"]) {
      expect(refused(text)).toBe("offensive");
    }
    expect(refused("Un cono de helado")).toBe("ok");
  });

  it("the examples that were asked for", () => {
    for (const text of [
      "hijo de puta",
      "h i j o   d  e   p u t t a a a a",
      "H.I.J.O D.E P.U.T.A",
      "culero",
      "coman mierda",
      "COMAN MIERDA",
      "c o m a n  m i e r d a",
    ]) {
      expect(refused(text)).toBe("offensive");
    }
  });
});

const KIND_THINGS = [
  "María, Maricela, Maricruz y Mariana rezan conmigo; Jodie y Mamadou también están aquí.",
  "Tengo reunión de la PTA el martes y me preocupa; mi tío trabaja en Wankel y mi tía tuvo gonorrhea.",
  "Mi primo Tarik, mi amigo Kike y mi vecina Zoraida me acompañaron al hospital.",
  "Pido por mi mamá, que está enferma, y por mi hermano, que no encuentra trabajo.",
  "Estoy cansado de sentirme solo. Quisiera que alguien me abrazara.",
  "Gracias por esta noche, de verdad la necesitaba.",
  "Please keep my family safe this winter, and help me forgive my father.",
  "I'm scared about the results tomorrow. I just want some peace.",
  "Que mi hija encuentre su camino y que yo sepa acompañarla sin controlarla.",
  "Tengo miedo de perder mi trabajo y no poder pagar la renta.",
  "Hoy me siento perdida, pero quiero creer que mañana será distinto.",
  "Dios mío, dame fuerzas 🙏🙏🙏",
  "Mi abuelo murió esta semana y todavía no lo creo.",
  "Help me stop drinking. One day at a time.",
  "Perdoné a quien me hizo daño y por fin duermo tranquila.",
  "Quiero ser mejor padre, mejor amigo y mejor persona.",
  "I am grateful for the small things: coffee, rain, a kind word.",
  "El análisis salió bien. La doctora dijo que todo está estable.",
  "Passing the class was hard, but I assess that I did my best. Classic Scunthorpe, a bass guitar and a cocktail.",
  "Pasé el examen. Mi compañero Dick me ayudó a estudiar en la clase de análisis.",
  "A Nigerian friend, a Shiite neighbor and a Maricopa County sheriff were all kind to me.",
  "Zora y Sora son mis dos gatas; Culiacán es mi ciudad; Mammon no será mi dios.",
  "Un cono de helado, una pinchada en el dedo, una pinza, un cocodrilo, un coco.",
  "The cage, the witch, the butch haircut, the hello, the shell, the hitch, the glass.",
  "Hostia consagrada, huevos, vergüenza, concha de mar, polla de la lotería.",
  "ansiedad",
  "Necesito paz",
  "Healing",
  "Por favor, que se cure mi perro. Se llama Pepe y tiene 12 años.",
  "Tuve 3 entrevistas esta semana, 2 fueron bien y 1 no.",
  "Quiero dormir sin pesadillas. Quiero dejar de tener miedo.",
  "Mi mamá, mi papá, mis tíos, mis primos: que estén todos bien.",
];

describe("an ordinary, honest text is taken", () => {
  for (const text of KIND_THINGS) {
    it(text.slice(0, 50), () => {
      expect(refused(text)).toBe("ok");
    });
  }

  it("every long text of plain words, in either language", () => {
    const lines = Array.from(
      { length: 200 },
      (_, i) =>
        `Quiero pedir por la persona número ${i}, que está pasando por un momento difícil y necesita calma.`,
    );
    expect(lines.filter((line) => refused(line) !== "ok")).toEqual([]);
  });
});

describe("nothing readable is refused", () => {
  it("only numbers", () => {
    for (const text of ["12345", "1234567890 1234567890", "0000000", "3 14 15 92 65"]) {
      expect(refused(text)).toBe("no-words");
    }
  });
  it("only symbols", () => {
    for (const text of ["!!!!!!", "......", "?!?!?!?!", "@#$%^&*()", "---===---", "¿¿¿???"]) {
      expect(refused(text)).toBe("no-words");
    }
  });
  it("only spaces and line breaks", () => {
    for (const text of ["      ", "\n\n\n\n\n", " \t \n \t ", "      "]) {
      expect(refused(text)).toBe("no-words");
    }
  });
  it("only emoji", () => {
    for (const text of ["🙏🙏🙏🙏🙏", "😀😀😀😀😀😀", "❤️❤️❤️❤️"]) {
      expect(refused(text)).toBe("no-words");
    }
  });
  it("mostly symbols and numbers around a word", () => {
    expect(refused("a 123 456 789 000 !!! ??? ...")).toBe("no-words");
  });
  it("invisible characters alone", () => {
    expect(refused("​​​​​")).toBe("no-words");
  });
});

describe("keyboard mashing and repetition are refused", () => {
  const rubbish = [
    "asdfasdf",
    "asdf asdf asdf",
    "qwerty qwerty",
    "zxcvbnm",
    "hjkl hjkl",
    "aaaaaaaa",
    "jajajajajaja",
    "hahahahahaha",
    "xxxxxxxxxx",
    "hola hola hola hola hola hola hola hola hola",
    "lorem lorem lorem lorem lorem lorem lorem lorem",
    "sdfghjkl",
    "ñlkjhgfd",
    "pppppppppppp",
    "ghjkghjkghjk",
    "bcdfgh jklmnp",
    "trewq fdsa",
    "mnbvcxz",
    "holaholahola",
    "abababababab",
    "llllllllllll mmmmmmmmm",
    "sssssssssssssssssss",
    "kjhgfdsa",
    "ansiedad asdfgh",
  ];
  for (const text of rubbish) {
    it(text, () => {
      expect(refused(text)).toBe("gibberish");
    });
  }

  it("a very long word with no spaces", () => {
    expect(refused("a".repeat(5) + "bcdefghijklmnopqrstuvwxyz".repeat(2))).toBe("gibberish");
  });
});

describe("what is not refused by mistake", () => {
  it("short and plain, in both languages", () => {
    for (const text of [
      "Paz",
      "Amén",
      "Gracias",
      "Thank you",
      "Sanación",
      "Hope",
      "Shhh... quiet",
      "mmmm bueno",
    ]) {
      const verdict = refused(text);
      // Under five characters there is nothing to hand over anyway; what matters is that none is called rude.
      expect(verdict).not.toBe("offensive");
    }
  });

  it("a name and a place it may look like a bad word", () => {
    for (const text of [
      "Soy de Culiacán y mi gata se llama Zora",
      "My friend Dick lives in Scunthorpe",
    ]) {
      expect(refused(text)).toBe("ok");
    }
  });

  it("other alphabets", () => {
    for (const text of [
      "Пожалуйста, помогите моей семье",
      "家族が健康でありますように",
      "ادعُ لعائلتي",
    ]) {
      expect(refused(text)).toBe("ok");
    }
  });
});

describe("the whole corpus the app already has", () => {
  it("every verse the fire can say, in both languages", () => {
    const refusedVerses: string[] = [];
    for (const word of VERSES) {
      for (const locale of ["es", "en"] as const) {
        const text = textOf(word, locale);
        if (text && checkContent(text).ok === false) refusedVerses.push(text);
      }
    }
    expect(refusedVerses).toEqual([]);
  });
});

/** A small deterministic generator, so a failure can be reproduced. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("many sentences of everyday words", () => {
  const SPANISH =
    "quiero pedir por mi familia que esté bien salud trabajo paz amor gracias hoy mañana noche difícil miedo cansado cansada solo sola ayuda fuerza calma esperanza perdón madre padre hermano hermana hijo hija amigo amiga pareja casa dinero examen escuela enfermedad doctor hospital camino vida tiempo corazón sueño dormir llorar sanar seguir intentar entender aceptar soltar culpa pasado futuro presente análisis clase pasar aprobar cocina cuchara pecado puerta conocer concha pelota pollo huevo verdad vergüenza cultura culto cumbre cabra cabrito pija mamá papá abuelo abuela tío tía".split(
      " ",
    );
  const ENGLISH =
    "please pray for my family health work peace love thank you today tomorrow night hard fear tired alone help strength calm hope forgive mother father brother sister son daughter friend partner house money exam school illness doctor hospital road life time heart dream sleep cry heal keep trying understand accept let go guilt past future present class pass assess bass glass hello shell hitch cocktail cockpit scunthorpe penistone arsenal analysis title classic mass massive passage grass".split(
      " ",
    );
  const LINKS = ["y", "que", "pero", "con", "de", "para", "and", "but", "with", "for", "the", "a"];

  for (const [name, vocabulary] of [
    ["Spanish", SPANISH],
    ["English", ENGLISH],
  ] as const) {
    it(`${name}: none is refused`, () => {
      const next = random(name === "Spanish" ? 7 : 11);
      const wrong: string[] = [];
      for (let i = 0; i < 4000; i++) {
        const length = 4 + Math.floor(next() * 14);
        const words: string[] = [];
        for (let j = 0; j < length; j++) {
          words.push(vocabulary[Math.floor(next() * vocabulary.length)] ?? "");
          if (next() < 0.25) words.push(LINKS[Math.floor(next() * LINKS.length)] ?? "");
        }
        const text = words.join(" ");
        if (!checkContent(text).ok) wrong.push(text);
      }
      expect(wrong).toEqual([]);
    });
  }
});

describe("an insult hidden in a long, kind text is still found", () => {
  it("anywhere in it", () => {
    const next = random(3);
    const kind = KIND_THINGS.slice(0, 8);
    const missed: string[] = [];
    for (let i = 0; i < 1500; i++) {
      const word = ALL[Math.floor(next() * ALL.length)] ?? "";
      const [, disguise] = DISGUISES[Math.floor(next() * DISGUISES.length)] ?? [];
      const at = Math.floor(next() * kind.length);
      const text = [...kind.slice(0, at), disguise?.(word) ?? word, ...kind.slice(at)].join(" ");
      if (refused(text) !== "offensive") missed.push(text);
    }
    expect(missed).toEqual([]);
  });
});

describe("the ways people try to get around it, one by one", () => {
  const TRICKS = [
    "h i j o d e p u t a",
    "h.i.j.o d.e p.u.t.a",
    "hijo d3 pvt4",
    "hijoDEputa",
    "HiJo De PuTa",
    "hiiiijooo deee puuuutaaa",
    "p*ta madre",
    "p.t.m",
    "hij0 d3 put@",
    "ɦijo de puta",
    "ｈｉｊｏ ｄｅ ｐｕｔａ",
    "hijo\u200bde\u200bputa",
    "c u l e r o",
    "c e r o t e",
    "c3r0t3",
    "cerooote",
    "cuuuleeero",
    "cvlero",
    "kulero",
    "kulero!!!",
    "cul3ro",
    "cu1ero",
    "cvl3r0",
    "c-u-l-e-r-o",
    "coman mierda",
    "comanmierda",
    "c0man m13rd4",
    "c o m a n   m i e r d a a a",
    "COMAN MIERDAAAA",
    "comán mierdá",
    "vete a la mierda",
    "v3t3 4 14 m13rd4",
    "vetealamierda",
    "ve te a la m i e r d a",
    "pinche pendejo",
    "p1nch3 p3nd3j0",
    "pendeeeejo",
    "p e n d e j o",
    "pe-ndejo",
    "eres un idiota",
    "1d10t4",
    "idiiiiota",
    "eres una zorra",
    "z0rr4",
    "sorra",
    "fuck you",
    "f u c k y o u",
    "fuuuuck you",
    "f*ck you",
    "f.u.c.k",
    "fvck",
    "fck u",
    "fuk",
    "sh1t",
    "sh!t",
    "s h i t",
    "b1tch",
    "b!tch",
    "b*tch",
    "bitchhhh",
    "b i t c h",
    "a$$hole",
    "a55hole",
    "asshole",
    "motherfucker",
    "mother fucker",
    "mother f*cker",
    "m0th3rfuck3r",
    "wtf you cunt",
    "c.u.n.t",
    "cvnt",
    "pvssy",
    "n1gg3r",
    "n!gger",
    "n i g g e r",
    "nigg4",
    "f4gg0t",
    "f a g g o t",
    "r3tard",
    "retaaard",
    "kill yourself",
    "k i l l y o u r s e l f",
    "kill y0urself",
    "kys",
    "k y s",
    "K.Y.S",
    "go to hell you bastard",
    "b4st4rd",
    "basstard",
    "wanker",
    "w4nk3r",
    "hdp",
    "h d p",
    "H.D.P.",
    "hdpppp",
    "ptm",
    "ctm madre",
    "ctmre",
    "chinga tu madre",
    "ch1ng4 tu m4dr3",
    "chingatumadre",
    "chinga-tu-madre",
    "chingas a tu madre",
    "hijueputa",
    "hijue puta",
    "hijueeeeputa",
    "hij*eputa",
    "maricón",
    "maricon",
    "m4r1c0n",
    "marikon",
    "joto",
    "j0t0",
    "sudaca",
    "malparido",
    "m4lp4r1d0",
    "pelotudo",
    "boludo",
    "b0lud0",
    "weón",
    "aweonao",
    "huevón",
    "hu3v0n",
    "gilipollas",
    "g1l1p0ll4s",
    "cabrón",
    "cabr0n",
    "kabron",
    "joder",
    "j0d3r",
    "jódete",
    "jodete",
    "mamón",
    "mam0n",
    "mamaguevo",
    "mamaguev0",
    "me cago en tu madre",
    "cagada",
    "cagón",
    "caga",
    "c4g4d4",
  ];
  const slipped = TRICKS.filter((text) => refused(text) !== "offensive");

  it("none gets through", () => {
    expect(slipped).toEqual([]);
  });
});

describe("the app's own words", () => {
  const strings = (value: unknown): string[] =>
    typeof value === "string"
      ? [value]
      : value && typeof value === "object"
        ? Object.values(value).flatMap(strings)
        : [];

  it("none of its Spanish or English text is called an insult", () => {
    const flagged = [...strings(es), ...strings(en)].filter(
      (text) => refused(text) === "offensive",
    );
    expect(flagged).toEqual([]);
  });
});
