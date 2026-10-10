// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalServices, type LocalServices } from "@/data";
import { DataProvider } from "@/data/DataProvider";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import type { FogataScene } from "@/scene/createScene";
import { resetSettingsStore, SettingsProvider } from "@/preferences/SettingsProvider";
import { InteractionProvider } from "../scene/Interaction";
import { GestureBar } from "./GestureBar";

async function setup(scenes: { burning?: boolean } = {}) {
  const services: LocalServices = createLocalServices({
    seatCount: 7,
    keys: { get: () => "key", set: () => {} },
  });
  await services.presence.join();
  const result =
    scenes.burning === false ? { status: "not-seated" as const } : { status: "burning" as const };
  const handOverBurden = vi.fn(() => result);
  const offerPetition = vi.fn(() => result);
  const scene = {
    notePlacement: () => ({ x: 10, y: 10, height: 40 }),
    handOverBurden,
    offerPetition,
    setPetitionStars: vi.fn(),
  } as unknown as FogataScene;
  render(
    <I18nProvider initialLocale="es">
      <SettingsProvider>
        <DataProvider services={services}>
          <InteractionProvider>
            <GestureBar scene={scene} />
          </InteractionProvider>
        </DataProvider>
      </SettingsProvider>
    </I18nProvider>,
  );
  const announce = vi.spyOn(services.rituals, "announce");
  return { services, handOverBurden, offerPetition, announce };
}

beforeEach(() => {
  localStorage.clear();
  resetSettingsStore();
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
afterEach(cleanup);

const write = (placeholder: string, text: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: text } });

describe("what the sheets will not take", () => {
  it("a petition with an insult stays on the sheet, with a gentle word, and is never made", async () => {
    const { services, offerPetition } = await setup();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.gestures.petition.aria }));
    });
    write(es.petition.placeholder, "h i j o   d e   p u t t a");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.petition.submit }));
    });
    expect(screen.getByText(es.moderation.offensive)).toBeTruthy();
    expect(offerPetition).not.toHaveBeenCalled();
    expect(await services.petitions.mine()).toHaveLength(0);
    // The writing is still there to be changed.
    expect(
      (screen.getByPlaceholderText(es.petition.placeholder) as HTMLTextAreaElement).value,
    ).toContain("p u t t a");

    // Writing again takes the word away.
    write(es.petition.placeholder, "Por mi familia, que esté bien");
    expect(screen.queryByText(es.moderation.offensive)).toBeNull();
  });

  it("a petition that is only numbers or symbols is told to use real words", async () => {
    const { services } = await setup();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.gestures.petition.aria }));
    });
    for (const text of ["1234567890", "!!!!!!!!!!", "asdfghjkl"]) {
      write(es.petition.placeholder, text);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: es.petition.submit }));
      });
      expect(screen.getByText(es.moderation.unreadable)).toBeTruthy();
    }
    expect(await services.petitions.mine()).toHaveLength(0);
  });

  it("a burden with an insult is not handed over, and nothing starts", async () => {
    const { handOverBurden } = await setup();
    fireEvent.click(screen.getByRole("button", { name: es.gestures.burden.aria }));
    write(es.burden.placeholder, "c o m a n   m i e r d a");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.burden.submit }));
    });
    expect(screen.getByText(es.moderation.offensive)).toBeTruthy();
    expect(handOverBurden).not.toHaveBeenCalled();
  });

  it("someone at risk is never turned away for rough words: the burden goes on and help follows", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: es.gestures.burden.aria }));
    write(es.burden.placeholder, "quiero morir, todo es una mierda");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.burden.submit }));
    });
    expect(screen.queryByText(es.moderation.offensive)).toBeNull();
  });

  it("an honest petition is made", async () => {
    const { services } = await setup();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.gestures.petition.aria }));
    });
    write(es.petition.placeholder, "Por mi mamá, que está enferma");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.petition.submit }));
    });
    expect(screen.queryByText(es.moderation.offensive)).toBeNull();
    expect(await services.petitions.mine()).toHaveLength(1);
  });
});

describe("what the others at the fire are told", () => {
  it("a burden handed over is announced as a burden, with nothing about what it said", async () => {
    const { announce, handOverBurden } = await setup();
    fireEvent.click(screen.getByRole("button", { name: es.gestures.burden.aria }));
    write(es.burden.placeholder, "Estoy cansado de cargar con todo esto");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.burden.submit }));
    });
    await vi.waitFor(() => expect(handOverBurden).toHaveBeenCalled());
    expect(announce.mock.calls).toEqual([["burden"]]);
  });

  it("a petition handed over is announced as a petition", async () => {
    const { announce, offerPetition } = await setup();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.gestures.petition.aria }));
    });
    write(es.petition.placeholder, "Por mi mamá, que está enferma");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.petition.submit }));
    });
    await vi.waitFor(() => expect(offerPetition).toHaveBeenCalled());
    expect(announce.mock.calls).toEqual([["petition"]]);
  });

  it("nothing is announced when the scene cannot start the ritual", async () => {
    const { announce, handOverBurden } = await setup({ burning: false });
    fireEvent.click(screen.getByRole("button", { name: es.gestures.burden.aria }));
    write(es.burden.placeholder, "Estoy cansado de cargar con todo esto");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.burden.submit }));
    });
    await vi.waitFor(() => expect(handOverBurden).toHaveBeenCalled());
    expect(announce).not.toHaveBeenCalled();
  });
});

describe("when the server cannot keep a petition", () => {
  it("keeps the sheet as it was, with what was written, says it was not kept, and starts no ritual", async () => {
    const { services, offerPetition, announce } = await setup();
    vi.spyOn(services.petitions, "create").mockResolvedValue({ status: "unavailable" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.gestures.petition.aria }));
    });
    write(es.petition.placeholder, "Por mi mamá, que está enferma");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.petition.submit }));
    });
    expect(screen.getByText(es.petition.unavailable)).toBeTruthy();
    expect(
      (screen.getByPlaceholderText(es.petition.placeholder) as HTMLTextAreaElement).value,
    ).toBe("Por mi mamá, que está enferma");
    expect(offerPetition).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it("lets it be tried again, and goes on with the ritual once it is kept", async () => {
    const { services, offerPetition } = await setup();
    const create = vi.spyOn(services.petitions, "create");
    create.mockResolvedValueOnce({ status: "unavailable" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.gestures.petition.aria }));
    });
    write(es.petition.placeholder, "Por mi mamá, que está enferma");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.petition.submit }));
    });
    expect(screen.getByText(es.petition.unavailable)).toBeTruthy();
    create.mockRestore();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: es.petition.submit }));
    });
    await vi.waitFor(() => expect(offerPetition).toHaveBeenCalled());
  });
});
