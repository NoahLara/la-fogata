"use client";

import { useEffect, useRef, useState } from "react";
import { createLocalServices, type LocalServices } from "@/data";
import { DataProvider } from "@/data/DataProvider";
import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene as Scene } from "@/scene/createScene";
import { readDevFlags } from "@/scene/devFlags";
import { GestureBar } from "../gestures/GestureBar";
import { PetitionSky } from "../sky/PetitionSky";
import { InteractionProvider } from "./Interaction";
import { DemoControls } from "./DemoControls";

/** Room at the bottom of the scene for the gesture bar. */
const BAR_HEIGHT = 72;

/** The font families the theme defines (set by next/font), as the browser resolved them. */
function readFonts() {
  const style = getComputedStyle(document.documentElement);
  return {
    ui: style.getPropertyValue("--font-ui").trim(),
  };
}

async function loadFont(family: string): Promise<void> {
  try {
    await document.fonts.load(`16px ${family}`, "Aa tú");
  } catch {
    // Unavailable: the fallback in the stack is drawn instead.
  }
}

interface Mounted {
  scene: Scene;
  services: LocalServices;
}

/** Mounts the PixiJS scene and connects it to the services. Pixi is imported inside the effect so it never loads on the server. */
export function FogataScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState<Mounted>();
  const [demo, setDemo] = useState(false);
  const { t } = useI18n();
  // The scene is built once, in the language of that first render; `setLabels` below follows later changes.
  const labels = useRef({ label: t.scene.ariaLabel, you: t.scene.you });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let scene: Scene | undefined;
    let stop: (() => void) | undefined;

    // ?animal=<species> and ?shuffle are for looking at the scene in development; in production they do nothing.
    const flags = readDevFlags(window.location.search, process.env.NODE_ENV === "production");

    const fonts = readFonts();

    // Text drawn in the scene is rasterized once, so its fonts must be ready first.
    Promise.all([import("@/scene/createScene"), loadFont(fonts.ui)])
      .then(([{ createScene }]) =>
        createScene(host, {
          fonts,
          label: labels.current.label,
          youLabel: labels.current.you,
          insets: { top: 0, bottom: BAR_HEIGHT },
          shuffle: flags.shuffle,
          animal: flags.animal,
        }),
      )
      .then(async (created) => {
        // Strict Mode (and fast unmounts) can dispose us while Pixi is still initializing.
        if (disposed) {
          created.destroy();
          return;
        }
        scene = created;
        const services = createLocalServices({
          seatCount: created.seatCount,
          initial: created.members().map(({ id, species, seat }) => ({ id, species, seat })),
          // Only with ?demo (never in production), so the ritual can be watched over and over.
          unlimitedPetitions: flags.demo,
        });
        // Your own sky: your petitions that are still alive are already stars.
        const mine = await services.petitions.mine();
        if (disposed) {
          created.destroy();
          return;
        }
        created.setPetitionStars(
          mine.map((petition) => ({ id: petition.id, answered: petition.answered !== undefined })),
        );
        // The scene follows who the service says is there.
        const unsubscribers = [
          services.presence.subscribe((event) => {
            if (event.type === "joined") created.addMember(event.person, { animate: true });
            else created.removeMember(event.id, { animate: true });
          }),
          // Everyone sees a log thrown; the service has already enforced the cooldown.
          services.fire.subscribe((event) => created.throwWood(event.by, { ignoreCooldown: true })),
        ];
        stop = () => unsubscribers.forEach((unsubscribe) => unsubscribe());
        setDemo(flags.demo);
        setMounted({ scene: created, services });
        const me = await services.presence.join();
        if (me && !disposed) created.setSelf(me.id);
      })
      .catch((error: unknown) => console.error("Could not start the campfire scene", error));

    return () => {
      disposed = true;
      stop?.();
      scene?.destroy();
      setMounted(undefined);
    };
  }, []);

  useEffect(() => {
    mounted?.scene.setLabels({ label: t.scene.ariaLabel, you: t.scene.you });
  }, [mounted, t]);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0" />
      {mounted && (
        <DataProvider services={mounted.services}>
          <InteractionProvider>
            <PetitionSky scene={mounted.scene} />
            <GestureBar scene={mounted.scene} />
            {demo && <DemoControls local={mounted.services} scene={mounted.scene} />}
          </InteractionProvider>
        </DataProvider>
      )}
    </>
  );
}
