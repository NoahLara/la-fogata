// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LoadingFire } from "./LoadingFire";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const show = (ready: boolean, locale: "es" | "en" = "es") =>
  render(
    <I18nProvider initialLocale={locale}>
      <LoadingFire ready={ready} />
    </I18nProvider>,
  );

describe("the loading screen", () => {
  it("shows no words, only a flame, but tells a screen reader that the fire is being lit", () => {
    const { container } = show(false);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("status").className).toContain("sr-only");
    expect(screen.getByRole("status").textContent).toBe(es.loading.lighting);
    cleanup();
    show(false, "en");
    expect(screen.getByRole("status").textContent).toBe(en.loading.lighting);
  });

  it("stays while the scene is not ready", () => {
    const { container } = show(false);
    expect(container.querySelector("[data-leaving]")).toBeNull();
  });

  it("fades when the scene is ready and then leaves the page", () => {
    vi.useFakeTimers();
    const { container } = show(true);
    expect(container.querySelector("[data-leaving]")).not.toBeNull();
    act(() => void vi.advanceTimersByTime(700));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("draws its fire from the theme, not from raw colors", () => {
    const { container } = show(false);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
