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
import { TermsDialog } from "@/components/legal/TermsDialog";
import { TermsGate } from "@/components/legal/TermsGate";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { TutorialDialog } from "@/components/tutorial/TutorialDialog";
import { TutorialGate } from "@/components/tutorial/TutorialGate";
import { FakeAudio, FakeContext } from "./fakeAudio";
import { TERMS_VERSION } from "@/legal/terms";
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

  it("keeps playing when the tab is hidden", async () => {
    setup();
    await act(async () => {});
    const ctx = created[0]!;
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(ctx.suspend).not.toHaveBeenCalled();
    expect(ctx.state).toBe("running");
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

describe("the sound and a first visit", () => {
  /** A press the way a browser sees it: the finger lifting, then the click. */
  const press = (element: Element) => {
    fireEvent.pointerUp(element);
    fireEvent.click(element);
  };

  it("starts when the terms are accepted: that first press is the gesture the browser wants", async () => {
    FakeContext.blocked = true;
    setup(<TermsGate>dentro</TermsGate>);
    await act(async () => {});
    const ctx = created[0]!;
    expect(ctx.state).toBe("suspended");
    // The browser lets it start now that the visitor has pressed something.
    FakeContext.blocked = false;
    await act(async () => void press(screen.getByRole("button", { name: es.terms.accept })));
    expect(ctx.state).toBe("running");
    expect(created).toHaveLength(1);
  });

  it("starts with a key as well: Enter on the accept button", async () => {
    FakeContext.blocked = true;
    setup(<TermsGate>dentro</TermsGate>);
    await act(async () => {});
    FakeContext.blocked = false;
    await act(
      async () =>
        void fireEvent.keyDown(screen.getByRole("button", { name: es.terms.accept }), {
          key: "Enter",
        }),
    );
    expect(created[0]!.state).toBe("running");
  });

  it("starts with a press in the first-visit tutorial, if the terms' press did not", async () => {
    FakeContext.blocked = true;
    setup(<TutorialDialog unlocksSound onClose={() => {}} />);
    await act(async () => {});
    FakeContext.blocked = false;
    await act(async () => void press(screen.getByRole("button", { name: es.tutorial.next })));
    expect(created[0]!.state).toBe("running");
  });

  it("starts with a press in the tutorial that opens by itself on a first visit", async () => {
    localStorage.setItem("fogata:terms", TERMS_VERSION);
    FakeContext.blocked = true;
    setup(
      <TermsGate>
        <TutorialGate />
      </TermsGate>,
    );
    await act(async () => {});
    FakeContext.blocked = false;
    await act(async () => void press(screen.getByRole("button", { name: es.tutorial.next })));
    expect(created[0]!.state).toBe("running");
  });

  it("does not start with a press in the terms read again, or in the tutorial opened from the settings", async () => {
    FakeContext.blocked = true;
    setup(
      <>
        <TermsDialog mode="read" onClose={() => {}} />
        <TutorialDialog onClose={() => {}} />
      </>,
    );
    await act(async () => {});
    const ctx = created[0]!;
    const tries = ctx.resume.mock.calls.length;
    FakeContext.blocked = false;
    await act(async () => {
      for (const dialog of screen.getAllByRole("dialog")) {
        for (const button of dialog.querySelectorAll("button")) press(button);
      }
    });
    expect(ctx.resume.mock.calls.length).toBe(tries);
    expect(ctx.state).toBe("suspended");
  });

  it("still starts with the first press outside a dialog, once the terms are behind", async () => {
    localStorage.setItem("fogata:terms", TERMS_VERSION);
    FakeContext.blocked = true;
    setup(<TermsGate>dentro</TermsGate>);
    await act(async () => {});
    FakeContext.blocked = false;
    await act(async () => void press(screen.getByText("escena")));
    expect(created[0]!.state).toBe("running");
  });
});
