// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { BrowserKeyStore } from "./keyStore";

const KEY = "0123456789abcdef0123456789abcdef";

describe("BrowserKeyStore", () => {
  afterEach(() => window.localStorage.clear());

  it("returns the key it was given", () => {
    const store = new BrowserKeyStore();
    store.set(KEY);
    expect(new BrowserKeyStore().get()).toBe(KEY);
  });

  it("ignores a stored value that is not a key", () => {
    window.localStorage.setItem("fogata.ownerKey", "not a key");
    expect(new BrowserKeyStore().get()).toBeUndefined();
  });
});
