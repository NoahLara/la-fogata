import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import type { Messages } from "@/i18n/messages";
import type { StorageLike } from "@/preferences/preferences";
import {
  hasSeenTutorial,
  nextStep,
  previousStep,
  saveTutorialSeen,
  TUTORIAL_STEPS,
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_VERSION,
} from "./tutorial";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

const broken: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("having seen the tutorial", () => {
  it("is false for anyone who has not, and where the browser keeps nothing", () => {
    expect(hasSeenTutorial(memoryStorage())).toBe(false);
    expect(hasSeenTutorial(undefined)).toBe(false);
    expect(hasSeenTutorial(broken)).toBe(false);
  });

  it("is remembered, and only the version is kept", () => {
    const storage = memoryStorage();
    saveTutorialSeen(storage);
    expect(hasSeenTutorial(storage)).toBe(true);
    expect([...storage.data.entries()]).toEqual([[TUTORIAL_STORAGE_KEY, TUTORIAL_VERSION]]);
  });

  it("shows again when the tutorial changes so much that it is worth it", () => {
    expect(hasSeenTutorial(memoryStorage({ [TUTORIAL_STORAGE_KEY]: "0" }))).toBe(false);
  });

  it("does not throw when the browser refuses storage", () => {
    expect(() => saveTutorialSeen(broken)).not.toThrow();
  });
});

describe("the steps", () => {
  it("move one at a time and stop at the ends", () => {
    expect(nextStep(0)).toBe(1);
    expect(nextStep(TUTORIAL_STEPS.length - 1)).toBe(TUTORIAL_STEPS.length - 1);
    expect(previousStep(3)).toBe(2);
    expect(previousStep(0)).toBe(0);
  });

  it.each([
    ["es", es],
    ["en", en],
  ])("each has a title and its words in %s, and nothing is left over", (_language, messages) => {
    expect(Object.keys(messages.tutorial.steps).sort()).toEqual([...TUTORIAL_STEPS].sort());
    for (const step of TUTORIAL_STEPS) {
      const { title, body } = messages.tutorial.steps[step];
      expect(title.trim().length).toBeGreaterThan(2);
      expect(body.trim().length).toBeGreaterThan(40);
    }
  });

  it.each([
    ["es", es],
    ["en", en],
  ])("fill in the step number and the total in %s", (_language, messages) => {
    expect(messages.tutorial.progress).toContain("{current}");
    expect(messages.tutorial.progress).toContain("{total}");
    expect(messages.tutorial.goTo).toContain("{step}");
  });
});

describe("what the tutorial says", () => {
  const text = (messages: Messages) =>
    Object.values(messages.tutorial.steps)
      .map((step) => `${step.title} ${step.body}`)
      .join(" ");

  // The rules were dropped on purpose (no daily limit, no expiry): the tutorial must not promise them.
  it.each([
    ["es", es],
    ["en", en],
  ])("promises no daily limit and no expiry in %s", (_language, messages) => {
    expect(text(messages)).not.toMatch(/30|al día|por día|a day|per day|each day|expir|caduc/i);
  });

  // La Fogata is a place to pray and to keep company, and the tutorial says so plainly, at the very start.
  it.each([
    ["es", es],
    ["en", en],
  ])(
    "opens by saying it is a place to pray and to keep company, and that all are welcome, in %s",
    (_language, messages) => {
      const welcome = messages.tutorial.steps.forest.body;
      expect(welcome).toMatch(/orar|pray/i);
      expect(welcome).toMatch(/acompa[ñn]arse|keep company/i);
      expect(welcome).toMatch(/presente|present/i);
      expect(welcome).toMatch(/creas lo que creas|whatever you believe/i);
    },
  );

  it.each([
    ["es", es],
    ["en", en],
  ])(
    "speaks of prayer where it happens: the burden, the petition, the sky and the fish, in %s",
    (_language, messages) => {
      for (const step of ["burden", "petition", "sky", "company"] as const) {
        expect(messages.tutorial.steps[step].body, step).toMatch(/oraci[oó]n|orar|\bora\b|pray/i);
      }
    },
  );

  // Praying is an invitation, never a requirement: being present is enough, and nothing preaches or pressures.
  it.each([
    ["es", es],
    ["en", en],
  ])("invites and never preaches or demands, in %s", (_language, messages) => {
    expect(messages.tutorial.steps.forest.body).toMatch(/simplemente|simply/i);
    expect(text(messages)).not.toMatch(
      /\b(debes|tienes que|deber[ií]as|est[aá]s obligad|must|you have to|you should|have to)\b/i,
    );
  });

  // The symbols are never explained.
  it.each([
    ["es", es],
    ["en", en],
  ])("does not explain the symbols (the three logs, the Trinity), in %s", (_language, messages) => {
    expect(text(messages)).not.toMatch(/trinidad|tres troncos|three logs|trinity/i);
  });

  it.each([
    ["es", es],
    ["en", en],
  ])("says the burden never leaves the browser, in %s", (_language, messages) => {
    expect(messages.tutorial.steps.burden.body).toMatch(/navegador|browser/);
  });

  // In the interface they are characters ("personaje" / "character"), never animals.
  it.each([
    ["es", es],
    ["en", en],
  ])("calls them characters, never animals, in %s", (_language, messages) => {
    expect(text(messages)).not.toMatch(/animal/i);
    expect(text(messages)).toMatch(/personaje|character/i);
  });

  it.each([
    ["es", es, /¡Bienvenidos!/],
    ["en", en, /Welcome!/],
  ])("begins by welcoming whoever arrives, in %s", (_language, messages, welcome) => {
    expect(messages.tutorial.steps.forest.title).toMatch(welcome);
  });

  it.each([
    ["es", es],
    ["en", en],
  ])("says the sky is everyone's asks, and what twinkling means, in %s", (_language, messages) => {
    const sky = messages.tutorial.steps.sky.body;
    expect(sky).toMatch(/todas las personas|everyone/i);
    expect(sky).toMatch(/titil|twinkl/i);
    expect(sky).toMatch(/respondidas|answered/i);
    expect(sky).toMatch(/esperan|waiting/i);
  });

  // Some things are for the visitor to find out: the tutorial does not spell them out.
  it.each([
    ["es", es],
    ["en", en],
  ])(
    "does not limit the answer to one line, nor explain where the words come from, in %s",
    (_language, messages) => {
      expect(messages.tutorial.steps.answered.body).not.toMatch(/una l[ií]nea|one line/i);
      expect(messages.tutorial.steps.word.body).not.toMatch(/d[oó]nde vienen|come from/i);
      expect(messages.tutorial.steps.sky.body).not.toMatch(/constelaci|constellation|halo|glow/i);
    },
  );

  it("says 'ask', never 'petition', in English", () => {
    expect(text(en)).not.toMatch(/petition/i);
    expect(en.tutorial.steps.petition.title).toMatch(/ask/i);
  });
});
