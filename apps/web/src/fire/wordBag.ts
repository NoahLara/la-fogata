/** Where the ids of the words already heard are kept between visits. */
export interface SeenStore {
  load(): string[];
  save(ids: readonly string[]): void;
}

/** Each language keeps its own, since not every word exists in both. */
const storageKey = (locale: string) => `fogata.wordsSeen.${locale}`;

/** Keeps the seen ids in localStorage. Storage can be blocked, so the bag still works for the visit without it. */
export function browserSeenStore(locale: string): SeenStore {
  return {
    load() {
      try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(locale)) ?? "[]");
        return Array.isArray(parsed)
          ? parsed.filter((id): id is string => typeof id === "string")
          : [];
      } catch {
        return [];
      }
    },
    save(ids) {
      try {
        window.localStorage.setItem(storageKey(locale), JSON.stringify(ids));
      } catch {
        // Blocked: the words repeat only once the page is reloaded.
      }
    },
  };
}

export interface WordBag {
  /** The id of the next word: random, and never one already heard until every one has been. */
  next(): string;
}

/**
 * A shuffle bag over `ids`. When the bag is empty it fills again, and the word just heard can't come first in
 * the next round. Ids that are no longer in the list are forgotten.
 */
export function createWordBag(
  ids: readonly string[],
  store: SeenStore,
  random: () => number,
): WordBag {
  const known = new Set(ids);
  let seen = store.load().filter((id) => known.has(id));
  return {
    next() {
      let left = ids.filter((id) => !seen.includes(id));
      if (left.length === 0) {
        const last = seen[seen.length - 1];
        seen = last === undefined || ids.length < 2 ? [] : [last];
        left = ids.filter((id) => !seen.includes(id));
      }
      const id = left[Math.min(left.length - 1, Math.floor(random() * left.length))];
      if (id === undefined) throw new Error("A word bag needs at least one word");
      seen = [...seen, id];
      store.save(seen);
      return id;
    },
  };
}
