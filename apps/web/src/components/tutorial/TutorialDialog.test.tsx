// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/messages";
import type { Locale } from "@/i18n/locale";
import { TUTORIAL_STEPS } from "@/tutorial/tutorial";
import { InteractionProvider } from "../scene/Interaction";
import { TutorialDialog } from "./TutorialDialog";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

function open(locale: Locale = "es") {
  const onClose = vi.fn();
  render(
    <I18nProvider initialLocale={locale}>
      <InteractionProvider>
        <TutorialDialog onClose={onClose} />
      </InteractionProvider>
    </I18nProvider>,
  );
  return { onClose };
}

const total = TUTORIAL_STEPS.length;
const stepText = (messages: Messages, index: number) =>
  messages.tutorial.steps[TUTORIAL_STEPS[index] as (typeof TUTORIAL_STEPS)[number]];
const next = (messages: Messages) => screen.getByRole("button", { name: messages.tutorial.next });

describe.each([
  ["es", es],
  ["en", en],
] as const)("the tutorial, in %s", (locale, messages) => {
  it("opens on the first step, named for what it is, with its words and its place", () => {
    open(locale);
    expect(screen.getByRole("dialog", { name: messages.tutorial.title })).toBeTruthy();
    expect(screen.getByRole("heading", { name: stepText(messages, 0).title })).toBeTruthy();
    expect(screen.getByText(stepText(messages, 0).body)).toBeTruthy();
    expect(
      screen.getByText(
        messages.tutorial.progress.replace("{current}", "1").replace("{total}", String(total)),
      ),
    ).toBeTruthy();
  });

  it("goes forward and back one step at a time, and says where it is", () => {
    open(locale);
    fireEvent.click(next(messages));
    expect(screen.getByRole("heading", { name: stepText(messages, 1).title })).toBeTruthy();
    expect(screen.getByText(stepText(messages, 1).body)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: messages.tutorial.back }));
    expect(screen.getByRole("heading", { name: stepText(messages, 0).title })).toBeTruthy();
  });

  it("shows every step's title and words in turn, to the last, where it says how to go in", () => {
    const { onClose } = open(locale);
    for (let index = 0; index < total; index++) {
      expect(screen.getByRole("heading", { name: stepText(messages, index).title })).toBeTruthy();
      expect(screen.getByText(stepText(messages, index).body)).toBeTruthy();
      if (index < total - 1) fireEvent.click(next(messages));
    }
    expect(screen.queryByRole("button", { name: messages.tutorial.next })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: messages.tutorial.finish }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can be skipped at any point", () => {
    const { onClose } = open(locale);
    fireEvent.click(next(messages));
    fireEvent.click(screen.getByRole("button", { name: messages.tutorial.skip }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has a dot for each step, which jumps to it and marks the one it is on", () => {
    open(locale);
    const steps = within(screen.getByRole("navigation", { name: messages.tutorial.stepsLabel }));
    const dots = steps.getAllByRole("button");
    expect(dots).toHaveLength(total);
    expect(dots[0]?.getAttribute("aria-current")).toBe("step");
    fireEvent.click(
      steps.getByRole("button", { name: messages.tutorial.goTo.replace("{step}", "5") }),
    );
    expect(screen.getByRole("heading", { name: stepText(messages, 4).title })).toBeTruthy();
    expect(dots[4]?.getAttribute("aria-current")).toBe("step");
    expect(dots[0]?.getAttribute("aria-current")).toBeNull();
  });
});

describe("how the tutorial is moved through", () => {
  it("answers the arrow keys, and stops at the ends", () => {
    open();
    // A key goes to whatever has focus, which is inside the dialog: the main button, to begin with.
    const dialog = next(es);
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: stepText(es, 0).title })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: stepText(es, 2).title })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: stepText(es, 1).title })).toBeTruthy();
    for (let i = 0; i < total + 3; i++) fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: stepText(es, total - 1).title })).toBeTruthy();
  });

  it("answers a swipe sideways, and ignores one that is mostly up or down, or too short", () => {
    open();
    const content = () =>
      screen.getByRole("heading", { name: /./, level: 3 }).closest(".tutorial-step") as HTMLElement;
    const swipe = (from: [number, number], to: [number, number]) => {
      fireEvent.pointerDown(content(), { clientX: from[0], clientY: from[1] });
      fireEvent.pointerUp(content(), { clientX: to[0], clientY: to[1] });
    };
    swipe([200, 100], [80, 105]);
    expect(screen.getByRole("heading", { name: stepText(es, 1).title })).toBeTruthy();
    swipe([200, 100], [190, 100]); // too short
    swipe([200, 100], [60, 260]); // mostly down
    expect(screen.getByRole("heading", { name: stepText(es, 1).title })).toBeTruthy();
    swipe([80, 100], [200, 100]);
    expect(screen.getByRole("heading", { name: stepText(es, 0).title })).toBeTruthy();
  });

  it("cannot go back from the first step: the button is hidden from everyone, not only from sight", () => {
    open();
    const back = screen.getByText(es.tutorial.back).closest("button") as HTMLButtonElement;
    expect(back.hasAttribute("disabled")).toBe(true);
    expect(back.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(next(es));
    const shown = screen.getByRole("button", { name: es.tutorial.back });
    expect(shown.hasAttribute("disabled")).toBe(false);
    expect(shown.getAttribute("aria-hidden")).toBeNull();
  });
});

describe("how the tutorial is read by someone who cannot see it", () => {
  it("announces each step as it changes, without moving the rest of the page", () => {
    open();
    const live = document.querySelector("[aria-live='polite']") as HTMLElement;
    expect(live.getAttribute("aria-atomic")).toBe("true");
    expect(within(live).getByRole("heading", { name: stepText(es, 0).title })).toBeTruthy();
    fireEvent.click(next(es));
    // The same region now holds the next step: that is what is read out.
    expect(document.querySelector("[aria-live='polite']")).toBe(live);
    expect(within(live).getByRole("heading", { name: stepText(es, 1).title })).toBeTruthy();
  });

  it("hides the drawings, which say nothing the words do not", () => {
    open();
    const art = document.querySelector(".tutorial-art svg");
    expect(art?.getAttribute("aria-hidden")).toBe("true");
    expect(art?.querySelector("title, desc")).toBeNull();
  });

  it("starts with the main button ready, so a keyboard only needs Enter", () => {
    open();
    expect(next(es).hasAttribute("data-autofocus")).toBe(true);
  });

  it("has a drawing for every step", () => {
    open();
    for (let index = 0; index < total; index++) {
      expect(document.querySelectorAll(".tutorial-art svg")).toHaveLength(1);
      if (index < total - 1) fireEvent.click(next(es));
    }
  });
});
