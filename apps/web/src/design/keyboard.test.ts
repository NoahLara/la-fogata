import { describe, expect, it } from "vitest";
import { keyboardInset } from "./keyboard";

describe("keyboardInset", () => {
  it("is nothing when the viewport fills the window", () => {
    expect(keyboardInset(800, 800, 0)).toBe(0);
  });

  it("is the height the keyboard takes from the bottom", () => {
    expect(keyboardInset(800, 500, 0)).toBe(300);
  });

  it("accounts for the page being scrolled up inside the visual viewport", () => {
    expect(keyboardInset(800, 500, 120)).toBe(180);
  });

  it("is never negative, for example while the browser bar is moving", () => {
    expect(keyboardInset(800, 810, 0)).toBe(0);
  });
});
