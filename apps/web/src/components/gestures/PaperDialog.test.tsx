// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PaperDialog, type PaperCopy, type PaperRules } from "./PaperDialog";

const COPY: PaperCopy = {
  title: "Hand it over",
  helper: "Nobody will see it",
  placeholder: "Write here",
  fieldLabel: "Your burden",
  submit: "Throw it in",
  cancel: "Cancel",
};

const RULES: PaperRules = {
  limit: (text) => text,
  canSubmit: (text) => text.trim().length >= 3,
  counter: () => "",
  announce: () => "",
};

const WRITTEN = "something heavy";

describe("PaperDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // No folding in a test: with reduced motion the sheet fades and the scene takes the note.
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function setup(onSubmit = vi.fn(() => true)) {
    const onLaunch = vi.fn(() => true);
    const onAbort = vi.fn();
    const onClose = vi.fn();
    render(
      <I18nProvider initialLocale="es">
        <PaperDialog
          copy={COPY}
          rules={RULES}
          onSubmit={onSubmit}
          getTarget={() => ({ x: 10, y: 10, height: 40 })}
          onLaunch={onLaunch}
          onAbort={onAbort}
          onClose={onClose}
        />
      </I18nProvider>,
    );
    return { onSubmit, onLaunch, onAbort, onClose };
  }

  const field = () => screen.getByLabelText(COPY.fieldLabel) as HTMLTextAreaElement;

  it("keeps the submit button off until there is something to hand over", () => {
    setup();
    const submit = screen.getByRole("button", { name: COPY.submit }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(field(), { target: { value: WRITTEN } });
    expect(submit.disabled).toBe(false);
  });

  it("hands the text over once and then clears it from the page", async () => {
    const { onSubmit, onLaunch } = setup();
    fireEvent.change(field(), { target: { value: WRITTEN } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: COPY.submit }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(WRITTEN);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain(WRITTEN);
    expect(field().value).toBe("");
  });

  it("does nothing when the text cannot be handed over", async () => {
    const { onLaunch, onAbort } = setup(vi.fn(() => false));
    fireEvent.change(field(), { target: { value: WRITTEN } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: COPY.submit }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(onLaunch).not.toHaveBeenCalled();
    expect(onAbort).not.toHaveBeenCalled();
    expect(field().value).toBe(WRITTEN);
  });
});
