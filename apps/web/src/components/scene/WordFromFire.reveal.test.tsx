// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestServices } from "@/data/testing";
import { DataProvider } from "@/data/DataProvider";
import { wordsFor } from "@/fire/words";
import { I18nProvider } from "@/i18n/I18nProvider";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import type { Locale } from "@/i18n/locale";
import type { FogataScene } from "@/scene/createScene";
import { InteractionProvider } from "./Interaction";
import { WordFromFire } from "./WordFromFire";

const scene = {
  petitionSpots: () => new Map<string, { x: number; y: number }>(),
  dimPetitionStars: () => {},
  fireBounds: () => ({ x: 100, y: 200, width: 90, height: 105 }),
  wordBottom: () => 120,
  touchFire: () => {},
  onLayout: () => () => {},
} as unknown as FogataScene;

/** The verse number as it used to show: chapter and verse, such as "41:10", on its own. */
const VERSE_NUMBER = /\d+:\d+/;

async function setup(locale: Locale) {
  const services = createTestServices({ seatCount: 7, keys: { get: () => "key", set: () => {} } });
  await services.presence.join();
  const view = render(
    <I18nProvider initialLocale={locale}>
      <DataProvider services={services}>
        <InteractionProvider>
          <WordFromFire scene={scene} />
        </InteractionProvider>
      </DataProvider>
    </I18nProvider>,
  );
  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe.each([
  ["es", es],
  ["en", en],
] as const)("the word from the fire, in %s", (locale, messages) => {
  async function touchFire() {
    await setup(locale);
    fireEvent.click(screen.getByRole("button", { name: messages.fire.listen }));
    await advance(100);
    return screen.getByTestId("fire-word");
  }

  it("shows only the words: no verse number anywhere", async () => {
    const word = await touchFire();
    expect(wordsFor(locale).map((entry) => entry.text[locale])).toContain(word.textContent);
    // The dialog-free scene holds the word and nothing but the words and the (screen-reader-only) hint.
    const visible = [...document.body.querySelectorAll("button, p, span, div")]
      .filter((element) => !element.classList.contains("sr-only") && element.children.length === 0)
      .map((element) => element.textContent ?? "");
    expect(visible.some((text) => VERSE_NUMBER.test(text))).toBe(false);
    expect(screen.queryByText(messages.fire.notice)).toBeNull();
  });

  it("makes the words a button that says what it does to a screen reader, without the number", async () => {
    const word = await touchFire();
    const button = word.closest("button") as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    // Its name is the words themselves, and the hint tells what tapping does.
    expect(button.getAttribute("aria-label")).toBeNull();
    const hint = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe(messages.fire.referenceHint);
    expect(hint?.textContent ?? "").not.toMatch(VERSE_NUMBER);
  });

  it("shows where the words come from when they are tapped, and hides it when tapped again", async () => {
    const word = await touchFire();
    const button = word.closest("button") as HTMLButtonElement;
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(VERSE_NUMBER, { exact: false })).toBeTruthy();
    expect(screen.getByText(messages.fire.notice)).toBeTruthy();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(messages.fire.notice)).toBeNull();
  });

  it("stays while its source is open, and lets go a while after it is closed", async () => {
    const word = await touchFire();
    const button = word.closest("button") as HTMLButtonElement;
    fireEvent.click(button);
    // Well past the time a word stays: it is being read, so it waits.
    await advance(30_000);
    expect(screen.queryByTestId("fire-word")).not.toBeNull();
    fireEvent.click(button);
    await advance(10_500);
    await advance(1_200);
    expect(screen.queryByTestId("fire-word")).toBeNull();
  });

  it("lets go by itself when nobody touches it", async () => {
    await touchFire();
    await advance(10_500);
    await advance(1_200);
    expect(screen.queryByTestId("fire-word")).toBeNull();
  });
});
