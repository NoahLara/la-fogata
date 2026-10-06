// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalServices } from "@/data";
import { DataProvider } from "@/data/DataProvider";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import { STORAGE_KEYS } from "@/preferences/preferences";
import { resetSettingsStore, SettingsProvider } from "@/preferences/SettingsProvider";
import type { FogataScene } from "@/scene/createScene";
import { InteractionProvider } from "@/components/scene/Interaction";
import { SitDown } from "@/components/scene/SitDown";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { FakeAudio, FakeContext } from "./fakeAudio";
import { SoundProvider } from "./SoundProvider";
import type { SoundEvent } from "./soundEvents";

let created: FakeContext[] = [];

function setup(ui: React.ReactNode = <SettingsButton />) {
  const heard: ((event: SoundEvent) => void)[] = [];
  const scene = {
    setSelf: vi.fn(),
    onSound: (listener: (event: SoundEvent) => void) => {
      heard.push(listener);
      return () => {};
    },
  } as unknown as FogataScene;
  const services = createLocalServices({
    seatCount: 7,
    initial: [],
    keys: { get: () => "key", set: () => {} },
  });
  render(
    <I18nProvider initialLocale="es">
      <SettingsProvider>
        <DataProvider services={services}>
          <InteractionProvider>
            <SoundProvider scene={scene}>
              {ui}
              <SitDown scene={scene} />
              <button type="button">escena</button>
            </SoundProvider>
          </InteractionProvider>
        </DataProvider>
      </SettingsProvider>
    </I18nProvider>,
  );
  return { heard };
}

beforeEach(() => {
  created = [];
  FakeContext.blocked = false;
  localStorage.clear();
  resetSettingsStore();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        const ctx = new FakeContext();
        created.push(ctx);
        return ctx;
      }
    },
  );
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the sound in the page", () => {
  it("tries to start as soon as the page is ready, with no press at all", async () => {
    setup();
    await act(async () => {});
    expect(created).toHaveLength(1);
    expect(created[0]!.state).toBe("running");
  });

  it("when the browser holds it back, the first press, tap or key starts it, once", async () => {
    FakeContext.blocked = true;
    setup();
    await act(async () => {});
    const ctx = created[0]!;
    expect(ctx.state).toBe("suspended");
    // A finger going down is not what browsers count; nothing is tried.
    const tries = ctx.resume.mock.calls.length;
    fireEvent.pointerDown(screen.getByText("escena"));
    expect(ctx.resume.mock.calls.length).toBe(tries);
    // Lifting it is. The browser lets it start now.
    FakeContext.blocked = false;
    await act(async () => void fireEvent.pointerUp(screen.getByText("escena")));
    expect(ctx.state).toBe("running");
    expect(created).toHaveLength(1);
    // It is running: later presses don't ask again.
    const after = ctx.resume.mock.calls.length;
    await act(async () => void fireEvent.keyDown(document.body, { key: "ArrowRight" }));
    expect(ctx.resume.mock.calls.length).toBe(after);
  });

  it("a key is a gesture too", async () => {
    FakeContext.blocked = true;
    setup();
    await act(async () => {});
    FakeContext.blocked = false;
    await act(async () => void fireEvent.keyDown(document.body, { key: "ArrowRight" }));
    expect(created[0]!.state).toBe("running");
  });

  it("never plays if the first thing someone does is turn the sound off", async () => {
    FakeContext.blocked = true;
    setup();
    await act(async () => {});
    const ctx = created[0]!;
    const gear = screen.getByRole("button", { name: es.settings.open });
    fireEvent.pointerUp(gear);
    fireEvent.click(gear);
    const panel = screen.getByRole("dialog", { name: es.settings.title });
    fireEvent.pointerUp(panel);
    const tries = ctx.resume.mock.calls.length;
    FakeContext.blocked = false;
    await act(async () =>
      fireEvent.click(screen.getByRole("switch", { name: es.settings.sound.legend })),
    );
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBe("0");
    // Presses in the settings don't start it, and with sound off, neither do later ones.
    expect(ctx.resume.mock.calls.length).toBe(tries);
    fireEvent.pointerUp(screen.getByText("escena"));
    fireEvent.keyDown(document.body, { key: "a" });
    expect(ctx.resume.mock.calls.length).toBe(tries);
    expect(ctx.state).toBe("suspended");
  });

  it("starts nothing when sound was saved as off", async () => {
    localStorage.setItem(STORAGE_KEYS.sound, "0");
    setup();
    await act(async () => {});
    fireEvent.pointerUp(screen.getByText("escena"));
    expect(created).toHaveLength(0);
  });

  it("turning sound on in the settings is itself a gesture", async () => {
    localStorage.setItem(STORAGE_KEYS.sound, "0");
    setup();
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: es.settings.open }));
    await act(async () =>
      fireEvent.click(screen.getByRole("switch", { name: es.settings.sound.legend })),
    );
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBe("1");
    expect(created).toHaveLength(1);
  });
});
