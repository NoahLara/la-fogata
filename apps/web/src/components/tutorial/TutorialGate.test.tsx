// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TERMS_STORAGE_KEY, TERMS_VERSION } from "@/legal/terms";
import { resetSettingsStore, SettingsProvider } from "@/preferences/SettingsProvider";
import { TUTORIAL_STORAGE_KEY, TUTORIAL_VERSION } from "@/tutorial/tutorial";
import { TermsGate } from "../legal/TermsGate";
import { InteractionProvider } from "../scene/Interaction";
import { TutorialGate } from "./TutorialGate";

function renderPage() {
  render(
    <I18nProvider initialLocale="es">
      <SettingsProvider>
        <InteractionProvider>
          <TermsGate>
            <p>sitting</p>
            <TutorialGate />
          </TermsGate>
        </InteractionProvider>
      </SettingsProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetSettingsStore();
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

const tutorial = () => screen.queryByRole("dialog", { name: es.tutorial.title });

describe("TutorialGate", () => {
  it("never comes before the terms: the visitor is asked for those first", () => {
    renderPage();
    expect(screen.getByRole("dialog", { name: es.terms.title })).toBeTruthy();
    expect(tutorial()).toBeNull();
  });

  it("comes right after the terms are accepted, and the visitor sits down meanwhile", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: es.terms.accept }));
    expect(tutorial()).not.toBeNull();
    expect(screen.getByText("sitting")).toBeTruthy();
  });

  it("is remembered once finished, and does not come back", () => {
    localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
    renderPage();
    expect(tutorial()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: es.tutorial.skip }));
    expect(tutorial()).toBeNull();
    expect(localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBe(TUTORIAL_VERSION);
    cleanup();
    renderPage();
    expect(tutorial()).toBeNull();
  });

  it("counts a skip as having seen it, and a finish too", () => {
    localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
    renderPage();
    for (let i = 0; i < 7; i++)
      fireEvent.click(screen.getByRole("button", { name: es.tutorial.next }));
    fireEvent.click(screen.getByRole("button", { name: es.tutorial.finish }));
    expect(tutorial()).toBeNull();
    expect(localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBe(TUTORIAL_VERSION);
  });

  it("does not show to someone who has already seen it", () => {
    localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, TUTORIAL_VERSION);
    renderPage();
    expect(tutorial()).toBeNull();
    expect(screen.getByText("sitting")).toBeTruthy();
  });

  it("shows again to someone who saw an older one", () => {
    localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "0");
    renderPage();
    expect(tutorial()).not.toBeNull();
  });
});
