import { describe, expect, it } from "vitest";
import { readDevFlags } from "./devFlags";

describe("readDevFlags", () => {
  it("reads ?animal, ?shuffle and ?demo in development", () => {
    expect(readDevFlags("?animal=fox", false)).toEqual({
      shuffle: false,
      demo: false,
      animal: "fox",
    });
    expect(readDevFlags("?shuffle", false)).toEqual({ shuffle: true, demo: false });
    expect(readDevFlags("?demo", false)).toEqual({ shuffle: false, demo: true });
    expect(readDevFlags("?shuffle&animal=bear", false)).toEqual({
      shuffle: true,
      demo: false,
      animal: "bear",
    });
  });

  it("sets nothing when the flags are absent or empty", () => {
    const none = { shuffle: false, demo: false };
    expect(readDevFlags("", false)).toEqual(none);
    expect(readDevFlags("?animal=", false)).toEqual(none);
    expect(readDevFlags("?other=1", false)).toEqual(none);
  });

  it("ignores every flag in production", () => {
    const none = { shuffle: false, demo: false };
    expect(readDevFlags("?animal=fox", true)).toEqual(none);
    expect(readDevFlags("?shuffle", true)).toEqual(none);
    expect(readDevFlags("?demo", true)).toEqual(none);
    expect(readDevFlags("?shuffle&animal=bear", true)).toEqual(none);
  });
});
