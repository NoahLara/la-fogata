// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { browserSeenStore } from "./wordBag";

describe("browserSeenStore", () => {
  afterEach(() => window.localStorage.clear());

  it("keeps the ids it was given, per language", () => {
    browserSeenStore("es").save(["a", "b"]);
    expect(browserSeenStore("es").load()).toEqual(["a", "b"]);
    expect(browserSeenStore("en").load()).toEqual([]);
  });

  it("starts empty when nothing is saved or what is saved is not a list", () => {
    expect(browserSeenStore("es").load()).toEqual([]);
    window.localStorage.setItem("fogata.wordsSeen.es", "{not json");
    expect(browserSeenStore("es").load()).toEqual([]);
    window.localStorage.setItem("fogata.wordsSeen.es", '{"a":1}');
    expect(browserSeenStore("es").load()).toEqual([]);
  });

  it("drops anything that is not an id", () => {
    window.localStorage.setItem("fogata.wordsSeen.es", JSON.stringify(["a", 3, null, "b"]));
    expect(browserSeenStore("es").load()).toEqual(["a", "b"]);
  });
});
