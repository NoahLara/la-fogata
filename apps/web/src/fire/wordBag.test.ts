import { describe, expect, it } from "vitest";
import { createRandom } from "../scene/random";
import { createWordBag, type SeenStore } from "./wordBag";

const memoryStore = (initial: string[] = []): SeenStore & { saved: string[] } => ({
  saved: initial,
  load() {
    return this.saved;
  },
  save(ids) {
    this.saved = [...ids];
  },
});

const IDS = ["a", "b", "c", "d", "e"];

describe("createWordBag", () => {
  it("gives every word once before any repeats", () => {
    const bag = createWordBag(IDS, memoryStore(), createRandom(1));
    const round = IDS.map(() => bag.next());
    expect([...round].sort()).toEqual(IDS);
  });

  it("does not start the next round with the last word of the previous one", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const bag = createWordBag(IDS, memoryStore(), createRandom(seed));
      const first = IDS.map(() => bag.next());
      expect(bag.next()).not.toBe(first[first.length - 1]);
    }
  });

  it("remembers what was heard across visits", () => {
    const store = memoryStore();
    const first = createWordBag(IDS, store, createRandom(7));
    const heard = [first.next(), first.next()];
    const later = createWordBag(IDS, store, createRandom(8));
    const rest = [later.next(), later.next(), later.next()];
    expect([...heard, ...rest].sort()).toEqual(IDS);
  });

  it("forgets ids that are no longer words", () => {
    const store = memoryStore(["gone", "a"]);
    const bag = createWordBag(IDS, store, createRandom(3));
    const round = IDS.slice(1).map(() => bag.next());
    expect([...round].sort()).toEqual(["b", "c", "d", "e"]);
  });

  it("works with a single word", () => {
    const bag = createWordBag(["only"], memoryStore(), createRandom(1));
    expect([bag.next(), bag.next()]).toEqual(["only", "only"]);
  });

  it("refuses an empty list", () => {
    expect(() => createWordBag([], memoryStore(), createRandom(1)).next()).toThrow();
  });
});
