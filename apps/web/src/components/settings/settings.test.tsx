// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalServices, type LocalServices } from "@/data";
import { DataProvider } from "@/data/DataProvider";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import { STORAGE_KEYS } from "@/preferences/preferences";
import { resetSettingsStore, SettingsProvider } from "@/preferences/SettingsProvider";
import type { FogataScene } from "@/scene/createScene";
import { InteractionProvider } from "../scene/Interaction";
import { SitDown } from "../scene/SitDown";
import { SettingsButton } from "./SettingsButton";

function fakeScene() {
  const setSelf = vi.fn();
  return { scene: { setSelf } as unknown as FogataScene, setSelf };
}

function setup(ui: (services: LocalServices) => ReactNode) {
  // An owl already sits at this campfire.
  const services = createLocalServices({
    seatCount: 7,
    initial: [{ id: "other", species: "owl", seat: 0 }],
    keys: { get: () => "key", set: () => {} },
  });
  render(
    <I18nProvider initialLocale="es">
      <SettingsProvider>
        <DataProvider services={services}>
          <InteractionProvider>{ui(services)}</InteractionProvider>
        </DataProvider>
      </SettingsProvider>
    </I18nProvider>,
  );
  return services;
}

beforeEach(() => {
  localStorage.clear();
  resetSettingsStore();
  document.documentElement.removeAttribute("data-text-size");
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

const openSettings = () => fireEvent.click(screen.getByRole("button", { name: es.settings.open }));
/** The settings panel's own live note (the page has another status line for announcements). */
const note = () => within(screen.getByRole("dialog")).getByRole("status");
const radio = (name: string) => screen.getByRole("radio", { name });

describe("the settings panel", () => {
  it("has a gear named Ajustes and its groups", () => {
    setup(() => <SettingsButton />);
    openSettings();
    const panel = screen.getByRole("dialog", { name: es.settings.title });
    expect(within(panel).getByRole("group", { name: es.settings.character.legend })).toBeDefined();
    for (const legend of [es.settings.language.legend, es.settings.textSize.legend]) {
      expect(within(panel).getByRole("radiogroup", { name: legend })).toBeDefined();
    }
    expect(within(panel).getByRole("switch", { name: es.settings.sound.legend })).toBeDefined();
    // The 7 characters plus "Al azar".
    expect(within(panel).getAllByRole("radio")).toHaveLength(8 + 2 + 3);
  });

  it("saves the character and swaps it in the same seat when it is free", async () => {
    const services = setup(() => <SettingsButton />);
    await act(async () => void (await services.presence.join("fox")));
    const seat = services.presence.self?.seat;
    openSettings();
    await act(async () => fireEvent.click(radio(es.species.cat)));
    expect(services.presence.self).toMatchObject({ species: "cat", seat });
    expect(localStorage.getItem(STORAGE_KEYS.animal)).toBe("cat");
    expect(note().textContent).toBe("");
  });

  it("saves the choice and shows a gentle note when that character is already here", async () => {
    const services = setup(() => <SettingsButton />);
    await act(async () => void (await services.presence.join("fox")));
    openSettings();
    await act(async () => fireEvent.click(radio(es.species.owl)));
    expect(note().textContent).toBe(es.settings.characterTaken);
    expect(services.presence.self?.species).toBe("fox");
    expect(localStorage.getItem(STORAGE_KEYS.animal)).toBe("owl");
    // Choosing another one clears the note.
    await act(async () => fireEvent.click(radio(es.species.bear)));
    expect(note().textContent).toBe("");
  });

  it("changes the language, which lives in the lang cookie", () => {
    setup(() => <SettingsButton />);
    openSettings();
    fireEvent.click(radio("English"));
    expect(screen.getByRole("dialog", { name: en.settings.title })).toBeDefined();
    expect(document.cookie).toContain("lang=en");
    document.cookie = "lang=; Max-Age=0; Path=/";
  });

  it("scales the text: each size marks the page and is remembered", () => {
    setup(() => <SettingsButton />);
    openSettings();
    // Pequeña is the default.
    expect((radio(es.settings.textSize.small) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(radio(es.settings.textSize.large));
    expect(document.documentElement.getAttribute("data-text-size")).toBe("large");
    expect(localStorage.getItem(STORAGE_KEYS.textSize)).toBe("large");
    fireEvent.click(radio(es.settings.textSize.normal));
    expect(document.documentElement.getAttribute("data-text-size")).toBe("normal");
    fireEvent.click(radio(es.settings.textSize.small));
    expect(document.documentElement.getAttribute("data-text-size")).toBe("small");
    expect(localStorage.getItem(STORAGE_KEYS.textSize)).toBe("small");
  });

  it("starts with the saved choices", () => {
    localStorage.setItem(STORAGE_KEYS.animal, "rabbit");
    localStorage.setItem(STORAGE_KEYS.textSize, "large");
    setup(() => <SettingsButton />);
    openSettings();
    expect((radio(es.species.rabbit) as HTMLInputElement).checked).toBe(true);
    expect((radio(es.settings.textSize.large) as HTMLInputElement).checked).toBe(true);
  });
});

describe("sitting down", () => {
  it("sits the visitor down at once, with no card, as a random free character", async () => {
    const { scene, setSelf } = fakeScene();
    const services = setup(() => <SitDown scene={scene} />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(services.presence.self).toBeDefined();
    expect(services.presence.self?.species).not.toBe("owl");
    expect(setSelf).toHaveBeenCalledWith(services.presence.self?.id);
  });

  it("sits down as the saved character", async () => {
    localStorage.setItem(STORAGE_KEYS.animal, "capybara");
    const { scene } = fakeScene();
    const services = setup(() => <SitDown scene={scene} />);
    await act(async () => {});
    expect(services.presence.self?.species).toBe("capybara");
  });

  it("falls back to a free character when the saved one is taken here, keeping the choice", async () => {
    localStorage.setItem(STORAGE_KEYS.animal, "owl");
    const { scene } = fakeScene();
    const services = setup(() => <SitDown scene={scene} />);
    await act(async () => {});
    expect(services.presence.self?.species).not.toBe("owl");
    // Their preference is untouched, for a fire where the owl is free.
    expect(localStorage.getItem(STORAGE_KEYS.animal)).toBe("owl");
  });

  it("sits down only once, however many times the settings change", async () => {
    const { scene } = fakeScene();
    const services = setup(() => (
      <>
        <SitDown scene={scene} />
        <SettingsButton />
      </>
    ));
    await act(async () => {});
    const id = services.presence.self?.id;
    openSettings();
    await act(async () => fireEvent.click(radio(es.settings.textSize.large)));
    expect(services.presence.people().filter((person) => person.id === id)).toHaveLength(1);
    expect(services.presence.people()).toHaveLength(2);
  });
});

describe("the crackle volume", () => {
  it("is a slider that starts at 75 and saves", () => {
    setup(() => <SettingsButton />);
    openSettings();
    const slider = screen.getByRole("slider", {
      name: es.settings.crackle.legend,
    }) as HTMLInputElement;
    expect(slider.value).toBe("75");
    expect(slider.disabled).toBe(false);
    fireEvent.change(slider, { target: { value: "40" } });
    expect(localStorage.getItem(STORAGE_KEYS.crackle)).toBe("40");
  });

  it("is disabled while the sound is off", () => {
    localStorage.setItem(STORAGE_KEYS.sound, "0");
    setup(() => <SettingsButton />);
    openSettings();
    const slider = screen.getByRole("slider", { name: es.settings.crackle.legend });
    // The fieldset is what is disabled; the slider inside is disabled with it.
    expect(slider.matches(":disabled")).toBe(true);
  });

  it("has a separate slider for the music, starts at 25", () => {
    setup(() => <SettingsButton />);
    openSettings();
    const music = screen.getByRole("slider", {
      name: es.settings.music.legend,
    }) as HTMLInputElement;
    expect(music.value).toBe("25");
    fireEvent.change(music, { target: { value: "20" } });
    expect(localStorage.getItem(STORAGE_KEYS.music)).toBe("20");
    expect(localStorage.getItem(STORAGE_KEYS.crackle)).toBeNull();
  });
});

describe("the tutorial, from the settings", () => {
  it("can be opened again from the settings, and closes back to them", () => {
    setup(() => <SettingsButton />);
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: es.tutorial.open }));
    expect(screen.getByRole("dialog", { name: es.tutorial.title })).toBeDefined();
    expect(screen.getByRole("heading", { name: es.tutorial.steps.forest.title })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: es.tutorial.skip }));
    expect(screen.queryByRole("dialog", { name: es.tutorial.title })).toBeNull();
    expect(screen.getByRole("dialog", { name: es.settings.title })).toBeDefined();
  });

  it("is beside the terms, in the language the visitor chose", () => {
    setup(() => <SettingsButton />);
    openSettings();
    expect(screen.getByRole("button", { name: es.terms.open })).toBeDefined();
    expect(screen.getByRole("button", { name: es.tutorial.open })).toBeDefined();
    fireEvent.click(radio("English"));
    expect(screen.getByRole("button", { name: en.tutorial.open })).toBeDefined();
  });
});
