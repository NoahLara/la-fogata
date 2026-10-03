// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  applyTextSize,
  DEFAULT_PREFERENCES,
  readPreferences,
  saveAnimal,
  saveTextSize,
  saveVisited,
  STORAGE_KEYS,
  TEXT_SIZE_SCRIPT,
  type StorageLike,
} from "./preferences";

function memoryStorage(
  initial: Record<string, string> = {},
): StorageLike & { data: Map<string, string> } {
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

describe("preferences", () => {
  it("start as a first visit with a random animal and small text", () => {
    expect(readPreferences(memoryStorage())).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES.visited).toBe(false);
  });

  it("come back as they were saved", () => {
    const storage = memoryStorage();
    saveAnimal("owl", storage);
    saveTextSize("large", storage);
    saveVisited(storage);
    expect(readPreferences(storage)).toEqual({ animal: "owl", textSize: "large", visited: true });
  });

  it("can be changed again, including back to random", () => {
    const storage = memoryStorage();
    saveAnimal("fox", storage);
    saveAnimal("random", storage);
    expect(readPreferences(storage).animal).toBe("random");
  });

  it("ignore values nobody saved: an unknown animal or size falls back", () => {
    const storage = memoryStorage({
      [STORAGE_KEYS.animal]: "dragon",
      [STORAGE_KEYS.textSize]: "huge",
      [STORAGE_KEYS.visited]: "yes",
    });
    expect(readPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
  });

  it("survive storage that refuses to be read or written", () => {
    expect(() => saveAnimal("cat", broken)).not.toThrow();
    expect(() => saveTextSize("large", broken)).not.toThrow();
    expect(() => saveVisited(broken)).not.toThrow();
    expect(readPreferences(broken)).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it("keep nothing but the three choices", () => {
    const storage = memoryStorage();
    saveAnimal("bear", storage);
    saveTextSize("normal", storage);
    saveVisited(storage);
    expect([...storage.data.keys()].sort()).toEqual(Object.values(STORAGE_KEYS).sort());
  });
});

describe("text size", () => {
  afterEach(() => document.documentElement.removeAttribute("data-text-size"));

  it("marks the page, which the stylesheet turns into a bigger root font size", () => {
    applyTextSize("large");
    expect(document.documentElement.getAttribute("data-text-size")).toBe("large");
    applyTextSize("normal");
    expect(document.documentElement.getAttribute("data-text-size")).toBe("normal");
    applyTextSize("small");
    expect(document.documentElement.getAttribute("data-text-size")).toBe("small");
  });

  it("is applied before first paint by a script that reads the saved size", () => {
    localStorage.setItem(STORAGE_KEYS.textSize, "large");
    new Function(TEXT_SIZE_SCRIPT)();
    expect(document.documentElement.getAttribute("data-text-size")).toBe("large");
    localStorage.clear();
  });

  it("leaves a first visit without the attribute, which the stylesheet reads as small", () => {
    localStorage.clear();
    new Function(TEXT_SIZE_SCRIPT)();
    expect(document.documentElement.hasAttribute("data-text-size")).toBe(false);
  });

  it("is small by default and when the stored size is not one of ours", () => {
    expect(DEFAULT_PREFERENCES.textSize).toBe("small");
    expect(readPreferences(memoryStorage({ [STORAGE_KEYS.textSize]: "huge" })).textSize).toBe(
      "small",
    );
  });
});
