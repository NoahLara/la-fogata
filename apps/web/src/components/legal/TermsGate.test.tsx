// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TERMS_STORAGE_KEY, TERMS_VERSION } from "@/legal/terms";
import { resetSettingsStore, SettingsProvider } from "@/preferences/SettingsProvider";
import { TermsGate } from "./TermsGate";

function renderGate() {
  render(
    <I18nProvider initialLocale="es">
      <SettingsProvider>
        <TermsGate>
          <p>sitting</p>
        </TermsGate>
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

describe("TermsGate", () => {
  it("asks the first time, keeps the visitor from sitting down, and remembers the answer", () => {
    renderGate();
    expect(screen.getByRole("dialog", { name: es.terms.title })).toBeTruthy();
    expect(screen.queryByText("sitting")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: es.terms.accept }));
    expect(screen.getByText("sitting")).toBeTruthy();
    expect(localStorage.getItem(TERMS_STORAGE_KEY)).toBe(TERMS_VERSION);
  });

  it("does not ask again once they have agreed", () => {
    localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
    renderGate();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("sitting")).toBeTruthy();
  });

  it("says plainly that it is not professional help and links to a helpline", () => {
    renderGate();
    expect(screen.getByText(es.common.notProfessionalHelp)).toBeTruthy();
    expect(screen.getByRole("link", { name: es.help.link }).getAttribute("href")).toContain(
      "findahelpline.com",
    );
  });
});
