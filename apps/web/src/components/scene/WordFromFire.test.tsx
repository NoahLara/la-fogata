// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestServices } from "@/data/testing";
import { DataProvider } from "@/data/DataProvider";
import { TRIGGER_DELAY_MS } from "@/fire/triggerPolicy";
import { contextualWordsFor, type WordTheme } from "@/fire/words";
import { I18nProvider } from "@/i18n/I18nProvider";
import { es } from "@/i18n/es";
import type { FogataScene } from "@/scene/createScene";
import { GestureBar } from "../gestures/GestureBar";
import { InteractionProvider } from "./Interaction";
import { WordFromFire } from "./WordFromFire";

/** Just enough of the scene: rituals that finish when the test says so. */
function fakeScene() {
  const finish: { burden?: () => void; settled?: () => void; petition?: () => void } = {};
  const scene = {
    notePlacement: () => ({ x: 100, y: 100, height: 40 }),
    handOverBurden: (_id: string, request: { onDone: () => void; onSettled?: () => void }) => {
      finish.burden = request.onDone;
      finish.settled = request.onSettled;
      return { status: "burning" as const };
    },
    offerPetition: (_id: string, request: { onDone: () => void }) => {
      finish.petition = request.onDone;
      return { status: "burning" as const };
    },
    setPetitionStars: () => {},
    petitionSpots: () => new Map<string, { x: number; y: number }>(),
    dimPetitionStars: () => {},
    fireBounds: () => ({ x: 100, y: 200, width: 90, height: 105 }),
    wordBottom: () => 120,
    touchFire: () => {},
    onLayout: () => () => {},
  };
  return { scene: scene as unknown as FogataScene, finish };
}

const wordsOf = (theme: WordTheme) =>
  contextualWordsFor("es")
    .filter((word) => word.theme === theme)
    .map((word) => word.text.es);

describe("the fire answers a burden and a petition", () => {
  let services: ReturnType<typeof createTestServices>;
  let finish: ReturnType<typeof fakeScene>["finish"];

  beforeEach(async () => {
    vi.useFakeTimers();
    // No fold animation or walking in a test: the reduced-motion path hands the note over after a fade.
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
    services = createTestServices({ seatCount: 7, keys: { get: () => "key", set: () => {} } });
    await services.presence.join();
    const fake = fakeScene();
    finish = fake.finish;
    render(
      <I18nProvider initialLocale="es">
        <DataProvider services={services}>
          <InteractionProvider>
            <WordFromFire scene={fake.scene} />
            <GestureBar scene={fake.scene} />
          </InteractionProvider>
        </DataProvider>
      </I18nProvider>,
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  /** Opens a gesture's sheet, writes something and hands it over, then lets the ritual run to its end. */
  async function writeAndSubmit(gesture: "burden" | "petition", submit: string) {
    const button = document.querySelector<HTMLElement>(`[data-gesture="${gesture}"]`);
    if (!button) throw new Error("no gesture button");
    fireEvent.click(button);
    await advance(0);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "quiero paz" } });
    fireEvent.click(screen.getByRole("button", { name: submit }));
    await advance(2000);
  }

  const shown = () => screen.queryByTestId("fire-word")?.textContent;

  it("speaks a rest word about 1.5 s after the shooting star of a burden has gone, not before", async () => {
    await writeAndSubmit("burden", es.burden.submit);
    expect(finish.burden).toBeDefined();
    expect(shown()).toBeUndefined();
    // The note has burned and the gestures are free: the light is still on its way, and so is the shooting star.
    act(() => finish.burden?.());
    await advance(TRIGGER_DELAY_MS * 4);
    expect(shown()).toBeUndefined();
    // The shooting star has crossed and gone: now the word follows, after its pause.
    act(() => finish.settled?.());
    await advance(TRIGGER_DELAY_MS - 100);
    expect(shown()).toBeUndefined();
    await advance(300);
    expect(wordsOf("rest")).toContain(shown());
  });

  it("stays quiet for a burden that showed signs of risk, even when its shooting star has gone", async () => {
    const button = document.querySelector<HTMLElement>('[data-gesture="burden"]');
    if (!button) throw new Error("no gesture button");
    fireEvent.click(button);
    await advance(0);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "quiero morir" } });
    fireEvent.click(screen.getByRole("button", { name: es.burden.submit }));
    await advance(2000);
    act(() => finish.burden?.());
    act(() => finish.settled?.());
    await advance(TRIGGER_DELAY_MS * 3);
    expect(shown()).toBeUndefined();
  });

  it("speaks an asking word about 1.5 s after a petition has become a star", async () => {
    await writeAndSubmit("petition", es.petition.submit);
    expect(finish.petition).toBeDefined();
    act(() => finish.petition?.());
    await advance(TRIGGER_DELAY_MS + 300);
    expect(wordsOf("asking")).toContain(shown());
  });

  it("speaks a presence word when the visitor is left alone, but not Rev 3:20", async () => {
    const other = services.presence.addPeer();
    if (!other) throw new Error("no seat");
    services.presence.removePeer(other.id);
    await advance(TRIGGER_DELAY_MS + 300);
    const presence = wordsOf("presence");
    expect(presence).toContain(shown());
    expect(shown()).not.toMatch(/puerta/);
  });
});
