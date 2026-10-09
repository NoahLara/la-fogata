"use client";

import { useEffect, useRef, useState } from "react";
import { createLocalServices, type LocalServices } from "@/data";
import { DataProvider } from "@/data/DataProvider";
import { realtimeTarget } from "@/data/realtimeTarget";
import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene as Scene } from "@/scene/createScene";
import { GestureBar } from "../gestures/GestureBar";
import { SettingsButton } from "../settings/SettingsButton";
import { TermsGate } from "../legal/TermsGate";
import { SitDown } from "./SitDown";
import { SoundProvider } from "@/sound/SoundProvider";
import { PetitionSky } from "../sky/PetitionSky";
import { InteractionProvider } from "./Interaction";
import { Company } from "./Company";
import { LoadingFire } from "./LoadingFire";
import { WordFromFire } from "./WordFromFire";

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
  const [failed, setFailed] = useState(false);
  const { t } = useI18n();
  // The scene is built once, in the language of that first render; `setLabels` below follows later changes.
  const labels = useRef({ label: t.scene.ariaLabel, you: t.scene.you });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let scene: Scene | undefined;
    let stop: (() => void) | undefined;

    const fonts = readFonts();

    // Text drawn in the scene is rasterized once, so its fonts must be ready first.
    Promise.all([import("@/scene/createScene"), loadFont(fonts.ui)])
      .then(([{ createScene }]) =>
        createScene(host, {
          fonts,
          label: labels.current.label,
          youLabel: labels.current.you,
          insets: { top: 0, bottom: BAR_HEIGHT },
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
          realtime: realtimeTarget(window.location),
        });
        // Your own sky: your petitions that are still alive are already stars.
        const mine = await services.petitions.mine();
        if (disposed) {
          created.destroy();
          return;
        }
        // In the order they were made: the constellation joins them that way (the service lists the newest first).
        const oldestFirst = [...mine].sort((a, b) => a.createdAt - b.createdAt);
        created.setPetitionStars(
          oldestFirst.map((petition) => ({
            id: petition.id,
            answered: petition.answered !== undefined,
          })),
        );
        // The scene follows who the service says is there.
        const unsubscribers = [
          services.presence.subscribe((event) => {
            if (event.type === "joined")
              created.addMember(event.person, { animate: !event.already });
            else if (event.type === "changed")
              created.replaceMember(event.person, { animate: true });
            else created.removeMember(event.id, { animate: true });
          }),
          // Real campfires burning far off; none unless a service lists them.
          services.distantFires.subscribe((fires) => created.setDistantFires(fires)),
          // Everyone sees a log thrown.
          services.fire.subscribe((event) => created.throwWood(event.by)),
        ];
        created.setDistantFires(services.distantFires.fires());
        stop = () => {
          unsubscribers.forEach((unsubscribe) => unsubscribe());
          // Closes the socket, if there is one: the seat is free for the next person.
          services.presence.leave();
        };
        // The visitor sits down once the scene is up (`SitDown`).
        setMounted({ scene: created, services });
      })
      .catch((error: unknown) => {
        console.error("Could not start the campfire scene", error);
        if (!disposed) setFailed(true);
      });

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
      <h1 className="sr-only">{t.meta.title}</h1>
      <div ref={hostRef} className="absolute inset-0" />
      <LoadingFire ready={mounted !== undefined || failed} />
      {failed && (
        <p
          role="alert"
          className="absolute inset-0 z-30 flex items-center justify-center bg-night px-8 text-center text-lg text-gold"
        >
          {t.scene.startFailed}
        </p>
      )}
      {mounted && (
        <DataProvider services={mounted.services}>
          <InteractionProvider>
            <SoundProvider scene={mounted.scene}>
              <WordFromFire scene={mounted.scene} />
              <Company scene={mounted.scene} />
              <PetitionSky scene={mounted.scene} />
              <GestureBar scene={mounted.scene} />
              <SettingsButton />
              <TermsGate>
                <SitDown scene={mounted.scene} />
              </TermsGate>
            </SoundProvider>
          </InteractionProvider>
        </DataProvider>
      )}
    </>
  );
}
