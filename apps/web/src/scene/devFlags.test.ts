import { describe, expect, it } from "vitest";
import { readDevFlags } from "./devFlags";

describe("readDevFlags", () => {
  it("reads ?animal, ?shuffle and ?demo in development", () => {
    expect(readDevFlags("?animal=fox", false)).toEqual({
      shuffle: false,
      demo: false,
      skipIntro: false,
      clean: false,
      animal: "fox",
    });
    expect(readDevFlags("?shuffle", false)).toEqual({
      shuffle: true,
      demo: false,
      skipIntro: false,
      clean: false,
    });
    expect(readDevFlags("?demo", false)).toEqual({
      shuffle: false,
      demo: true,
      skipIntro: false,
      clean: false,
    });
    expect(readDevFlags("?shuffle&animal=bear", false)).toEqual({
      shuffle: true,
      demo: false,
      skipIntro: false,
      clean: false,
      animal: "bear",
    });
  });

  it("reads ?skipIntro in development only", () => {
    expect(readDevFlags("?skipIntro", false).skipIntro).toBe(true);
    expect(readDevFlags("?skipIntro", true).skipIntro).toBe(false);
  });

  it("sets nothing when the flags are absent or empty", () => {
    const none = { shuffle: false, demo: false, skipIntro: false, clean: false };
    expect(readDevFlags("", false)).toEqual(none);
    expect(readDevFlags("?animal=", false)).toEqual(none);
    expect(readDevFlags("?other=1", false)).toEqual(none);
  });

  it("ignores every flag in production", () => {
    const none = { shuffle: false, demo: false, skipIntro: false, clean: false };
    expect(readDevFlags("?animal=fox", true)).toEqual(none);
    expect(readDevFlags("?shuffle", true)).toEqual(none);
    expect(readDevFlags("?demo", true)).toEqual(none);
    expect(readDevFlags("?shuffle&animal=bear", true)).toEqual(none);
  });
});

describe("readDevFlags ?clean", () => {
  it("hides the buttons in development only", () => {
    expect(readDevFlags("?demo&clean", false).clean).toBe(true);
    expect(readDevFlags("?demo&clean", true).clean).toBe(false);
  });
});
