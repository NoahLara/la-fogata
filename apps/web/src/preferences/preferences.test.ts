// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  applyTextSize,
  DEFAULT_PREFERENCES,
  readPreferences,
  saveAnimal,
  saveCrackle,
  saveMusic,
  saveSound,
  saveTextSize,
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
  it("start with a random animal and small text", () => {
    expect(readPreferences(memoryStorage())).toEqual(DEFAULT_PREFERENCES);
  });

  it("come back as they were saved", () => {
    const storage = memoryStorage();
    saveAnimal("owl", storage);
    saveTextSize("large", storage);
    expect(readPreferences(storage)).toEqual({
      animal: "owl",
      textSize: "large",
      sound: true,
      crackle: 75,
      music: 25,
    });
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
    });
    expect(readPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
  });

  it("survive storage that refuses to be read or written", () => {
    expect(() => saveAnimal("cat", broken)).not.toThrow();
    expect(() => saveTextSize("large", broken)).not.toThrow();
    expect(readPreferences(broken)).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it("keep nothing but the five choices", () => {
    const storage = memoryStorage();
    saveAnimal("bear", storage);
    saveTextSize("normal", storage);
    saveSound(true, storage);
    saveCrackle(70, storage);
    saveMusic(30, storage);
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

describe("the sound preference", () => {
  it("is on by default", () => {
    expect(DEFAULT_PREFERENCES.sound).toBe(true);
    expect(readPreferences(memoryStorage()).sound).toBe(true);
  });

  it("is remembered, off and on", () => {
    const storage = memoryStorage();
    saveSound(false, storage);
    expect(storage.data.get(STORAGE_KEYS.sound)).toBe("0");
    expect(readPreferences(storage).sound).toBe(false);
    saveSound(true, storage);
    expect(readPreferences(storage).sound).toBe(true);
  });

  it("only an explicit off turns it off: anything else is the default", () => {
    expect(readPreferences(memoryStorage({ [STORAGE_KEYS.sound]: "maybe" })).sound).toBe(true);
  });

  it("survives storage that refuses to read or write", () => {
    expect(readPreferences(broken).sound).toBe(true);
    expect(() => saveSound(false, broken)).not.toThrow();
  });
});

describe("the crackle volume preference", () => {
  it("starts at 75", () => {
    expect(readPreferences(memoryStorage()).crackle).toBe(75);
  });

  it("is remembered, and a bad stored value falls back to the middle", () => {
    const storage = memoryStorage();
    saveCrackle(80, storage);
    expect(readPreferences(storage).crackle).toBe(80);
    expect(readPreferences(memoryStorage({ [STORAGE_KEYS.crackle]: "loud" })).crackle).toBe(75);
    expect(() => saveCrackle(10, broken)).not.toThrow();
  });
});

describe("the music volume preference", () => {
  it("starts at 25, is remembered on its own, and survives bad values", () => {
    expect(readPreferences(memoryStorage()).music).toBe(25);
    const storage = memoryStorage();
    saveMusic(20, storage);
    expect(readPreferences(storage)).toMatchObject({ music: 20, crackle: 75 });
    expect(readPreferences(memoryStorage({ [STORAGE_KEYS.music]: "x" })).music).toBe(25);
    expect(() => saveMusic(10, broken)).not.toThrow();
  });
});
