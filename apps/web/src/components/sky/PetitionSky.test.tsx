// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataProvider } from "@/data/DataProvider";
import { createTestServices } from "@/data/testing";
import { I18nProvider } from "@/i18n/I18nProvider";
import type { FogataScene } from "@/scene/createScene";
import { InteractionProvider } from "../scene/Interaction";
import { PetitionSky } from "./PetitionSky";

type Stars = readonly { id: string; answered: boolean }[];

/** Just enough of the scene for the sky's stars: it notes which stars of other people it is told to draw. */
function fakeScene() {
  const drawn: Stars[] = [];
  const scene = {
    sky: {
      state: () => ({ offset: 0, panorama: 1000, viewport: 1000 }),
      onView: () => () => {},
      anchors: () => new Map<string, { x: number; y: number }>(),
      dragBottom: () => 100,
      pauseAutoTurn: () => {},
      bringIntoView: () => {},
    },
    setOtherStars: (stars: Stars) => drawn.push(stars),
    onLayout: () => () => {},
    pulseStar: () => {},
    sendLight: () => {},
    returnPetition: () => {},
    answerPetition: () => {},
  };
  return { scene: scene as unknown as FogataScene, drawn };
}

const REFRESH = 180_000;

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has none: the sky only needs one that never fires.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function mount() {
  const services = createTestServices({ seatCount: 7, keys: { get: () => "key", set: () => {} } });
  const fake = fakeScene();
  render(
    <I18nProvider initialLocale="es">
      <DataProvider services={services}>
        <InteractionProvider>
          <PetitionSky scene={fake.scene} />
        </InteractionProvider>
      </DataProvider>
    </I18nProvider>,
  );
  await act(async () => {});
  return { services, ...fake };
}

const ids = (stars: Stars | undefined) => (stars ?? []).map((star) => star.id).sort();

describe("the sky of other people's stars", () => {
  it("shows the stars there are when the page opens", async () => {
    const services = createTestServices({
      seatCount: 7,
      keys: { get: () => "key", set: () => {} },
    });
    const first = services.petitions.seedOther("de otra persona");
    const fake = fakeScene();
    render(
      <I18nProvider initialLocale="es">
        <DataProvider services={services}>
          <InteractionProvider>
            <PetitionSky scene={fake.scene} />
          </InteractionProvider>
        </DataProvider>
      </I18nProvider>,
    );
    await act(async () => {});
    expect(ids(fake.drawn.at(-1))).toEqual([first.id]);
  });

  it("is renewed while the page is open: the stars of people who come by appear, and the others stay", async () => {
    const { services, drawn } = await mount();
    const early = services.petitions.seedOther("ya estaba");
    await act(async () => void (await vi.advanceTimersByTimeAsync(REFRESH + 100)));
    expect(ids(drawn.at(-1))).toEqual([early.id]);
    const late = services.petitions.seedOther("llegó después");
    await act(async () => void (await vi.advanceTimersByTimeAsync(REFRESH)));
    expect(ids(drawn.at(-1))).toEqual([early.id, late.id].sort());
  });

  it("does not look while the tab is hidden, and looks again once it can", async () => {
    const { services, drawn } = await mount();
    const star = services.petitions.seedOther("llegó con la pestaña oculta");
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    try {
      await act(async () => void (await vi.advanceTimersByTimeAsync(REFRESH * 2)));
      expect(ids(drawn.at(-1))).toEqual([]);
    } finally {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    }
    await act(async () => void (await vi.advanceTimersByTimeAsync(REFRESH)));
    expect(ids(drawn.at(-1))).toEqual([star.id]);
  });

  it("stops looking when the sky goes away", async () => {
    const services = createTestServices({
      seatCount: 7,
      keys: { get: () => "key", set: () => {} },
    });
    const sky = vi.spyOn(services.petitions, "sky");
    const fake = fakeScene();
    const view = render(
      <I18nProvider initialLocale="es">
        <DataProvider services={services}>
          <InteractionProvider>
            <PetitionSky scene={fake.scene} />
          </InteractionProvider>
        </DataProvider>
      </I18nProvider>,
    );
    await act(async () => {});
    const calls = sky.mock.calls.length;
    view.unmount();
    await vi.advanceTimersByTimeAsync(REFRESH * 3);
    expect(sky.mock.calls.length).toBe(calls);
  });
});
