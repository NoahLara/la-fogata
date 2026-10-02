"use client";

import { useEffect, useRef, useState } from "react";
import { createLocalServices, type LocalServices } from "@/data";
import { DataProvider } from "@/data/DataProvider";
import { es } from "@/i18n/es";
import type { FogataScene as Scene } from "@/scene/createScene";
import { readDevFlags } from "@/scene/devFlags";
import { GestureBar } from "../gestures/GestureBar";
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
          label: es.scene.ariaLabel,
          youLabel: es.scene.you,
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
        created.setPetitionStars(mine.map((petition) => petition.id));
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

  return (
    <>
      <div ref={hostRef} className="absolute inset-0" />
      {mounted && (
        <DataProvider services={mounted.services}>
          <GestureBar scene={mounted.scene} />
          {demo && <DemoControls local={mounted.services} scene={mounted.scene} />}
        </DataProvider>
      )}
    </>
  );
}
