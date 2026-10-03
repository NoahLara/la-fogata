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
import { Entrance } from "./Entrance";
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
  it("has a gear named Ajustes and three groups", () => {
    setup(() => <SettingsButton />);
    openSettings();
    const panel = screen.getByRole("dialog", { name: es.settings.title });
    for (const legend of [
      es.settings.character.legend,
      es.settings.language.legend,
      es.settings.textSize.legend,
    ]) {
      expect(within(panel).getByRole("group", { name: legend })).toBeDefined();
    }
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

describe("the entrance", () => {
  it("welcomes a first visit with the card and a random free character", async () => {
    const { scene, setSelf } = fakeScene();
    const services = setup(() => <Entrance scene={scene} skipIntro={false} />);
    const card = screen.getByRole("dialog", { name: es.entrance.title });
    expect(within(card).getByText(es.entrance.tagline)).toBeDefined();
    expect(services.presence.self).toBeUndefined();
    const button = within(card).getByRole("button", { name: es.entrance.enter });
    expect(document.activeElement).toBe(button);
    await act(async () => fireEvent.click(button));
    expect(services.presence.self).toBeDefined();
    expect(services.presence.self?.species).not.toBe("owl");
    expect(setSelf).toHaveBeenCalledWith(services.presence.self?.id);
  });

  it("cannot be closed with Escape", () => {
    const { scene } = fakeScene();
    setup(() => <Entrance scene={scene} skipIntro={false} />);
    const card = screen.getByRole("dialog", { name: es.entrance.title });
    const cancel = new Event("cancel", { cancelable: true });
    card.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
  });

  it("lets someone pick a character before sitting, and keeps it", async () => {
    const { scene } = fakeScene();
    const services = setup(() => <Entrance scene={scene} skipIntro={false} />);
    fireEvent.click(screen.getByRole("button", { name: es.entrance.chooseCharacter }));
    expect(screen.getByRole("dialog", { name: es.entrance.pickerTitle })).toBeDefined();
    fireEvent.click(radio(es.species.fox));
    fireEvent.click(screen.getByRole("button", { name: es.entrance.pickerDone }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: es.entrance.enter })));
    expect(services.presence.self?.species).toBe("fox");
  });

  it("switches language before entering", () => {
    const { scene } = fakeScene();
    setup(() => <Entrance scene={scene} skipIntro={false} />);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText(en.entrance.tagline)).toBeDefined();
    document.cookie = "lang=; Max-Age=0; Path=/";
  });

  it("shows the card only once: a returning visitor sits down at once, with their character", async () => {
    localStorage.setItem(STORAGE_KEYS.visited, "1");
    localStorage.setItem(STORAGE_KEYS.animal, "capybara");
    const { scene, setSelf } = fakeScene();
    const services = setup(() => <Entrance scene={scene} skipIntro={false} />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(services.presence.self?.species).toBe("capybara");
    expect(setSelf).toHaveBeenCalledWith(services.presence.self?.id);
  });

  it("falls back to a free character when the returning visitor's is taken here", async () => {
    localStorage.setItem(STORAGE_KEYS.visited, "1");
    localStorage.setItem(STORAGE_KEYS.animal, "owl");
    const { scene } = fakeScene();
    const services = setup(() => <Entrance scene={scene} skipIntro={false} />);
    await act(async () => {});
    expect(services.presence.self?.species).not.toBe("owl");
    // Their preference is untouched, for a fire where the owl is free.
    expect(localStorage.getItem(STORAGE_KEYS.animal)).toBe("owl");
  });

  it("sits a returning visitor with no choice down as a random free character", async () => {
    localStorage.setItem(STORAGE_KEYS.visited, "1");
    const { scene } = fakeScene();
    const services = setup(() => <Entrance scene={scene} skipIntro={false} />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(services.presence.self).toBeDefined();
  });

  it("remembers the first visit once the card has faded, so the next one has no card", async () => {
    vi.useFakeTimers();
    const { scene } = fakeScene();
    setup(() => <Entrance scene={scene} skipIntro={false} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: es.entrance.enter })));
    // Still fading: the card is there and the visit isn't marked yet.
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(localStorage.getItem(STORAGE_KEYS.visited)).toBeNull();
    await act(async () => void (await vi.advanceTimersByTimeAsync(600)));
    expect(localStorage.getItem(STORAGE_KEYS.visited)).toBe("1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("fades the card away after sitting down", async () => {
    vi.useFakeTimers();
    const { scene } = fakeScene();
    setup(() => <Entrance scene={scene} skipIntro={false} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: es.entrance.enter })));
    await act(async () => void (await vi.advanceTimersByTimeAsync(600)));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows no card with skipIntro, and sits them down", async () => {
    const { scene, setSelf } = fakeScene();
    const services = setup(() => <Entrance scene={scene} skipIntro />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(services.presence.self).toBeDefined();
    expect(setSelf).toHaveBeenCalled();
  });
});
