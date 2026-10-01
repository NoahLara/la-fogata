import { describe, expect, it } from "vitest";
import { readDevFlags } from "./devFlags";

describe("readDevFlags", () => {
  it("reads ?animal and ?shuffle in development", () => {
    expect(readDevFlags("?animal=fox", false)).toEqual({ shuffle: false, animal: "fox" });
    expect(readDevFlags("?shuffle", false)).toEqual({ shuffle: true });
    expect(readDevFlags("?shuffle&animal=bear", false)).toEqual({ shuffle: true, animal: "bear" });
  });

  it("sets nothing when the flags are absent or empty", () => {
    expect(readDevFlags("", false)).toEqual({ shuffle: false });
    expect(readDevFlags("?animal=", false)).toEqual({ shuffle: false });
    expect(readDevFlags("?other=1", false)).toEqual({ shuffle: false });
  });

  it("ignores every flag in production", () => {
    expect(readDevFlags("?animal=fox", true)).toEqual({ shuffle: false });
    expect(readDevFlags("?shuffle", true)).toEqual({ shuffle: false });
    expect(readDevFlags("?shuffle&animal=bear", true)).toEqual({ shuffle: false });
  });
});
