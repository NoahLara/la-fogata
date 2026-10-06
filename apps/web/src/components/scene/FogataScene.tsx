"use client";

import { useEffect, useRef, useState } from "react";
import { createLocalServices, type LocalServices } from "@/data";
import { DataProvider } from "@/data/DataProvider";
import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene as Scene } from "@/scene/createScene";
import { seedDemoPetitions, type DemoLoader } from "@/data/demoSeed";
import { skyLimit } from "@/data/sky";
import { readDevFlags } from "@/scene/devFlags";
import { GestureBar } from "../gestures/GestureBar";
import { SettingsButton } from "../settings/SettingsButton";
import { SitDown } from "./SitDown";
import { SoundProvider } from "@/sound/SoundProvider";
import { PetitionSky } from "../sky/PetitionSky";
import { InteractionProvider } from "./Interaction";
import { Company } from "./Company";
import { LoadingFire } from "./LoadingFire";
import { DemoControls } from "./DemoControls";
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
  const [demo, setDemo] = useState(false);
  const [clean, setClean] = useState(false);
  const [failed, setFailed] = useState(false);
  const { t, locale } = useI18n();
  // The language the sample petitions of ?demo are written in: the one the page started in.
  const localeRef = useRef(locale);
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
        // Only with ?demo, and never in a production build, which drops the dynamic import (and the sample texts with
        // it) because the condition is a build-time constant. Every star of someone else is a real petition.
        const loadDemo: DemoLoader | undefined =
          process.env.NODE_ENV === "production" ? undefined : () => import("@/demo/otherPetitions");
        if (flags.demo) {
          const { panorama, viewport } = created.sky.state();
          await seedDemoPetitions(services.petitions, {
            count: skyLimit(panorama, viewport),
            locale: localeRef.current,
            load: loadDemo,
          });
        }
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
            if (event.type === "joined") created.addMember(event.person, { animate: true });
            else if (event.type === "changed")
              created.replaceMember(event.person, { animate: true });
            else created.removeMember(event.id, { animate: true });
          }),
          // Real campfires burning far off; none unless a service lists them (or ?demo makes some).
          services.distantFires.subscribe((fires) => created.setDistantFires(fires)),
          // Everyone sees a log thrown; the service has already enforced the cooldown.
          services.fire.subscribe((event) => created.throwWood(event.by, { ignoreCooldown: true })),
        ];
        created.setDistantFires(services.distantFires.fires());
        stop = () => unsubscribers.forEach((unsubscribe) => unsubscribe());
        setDemo(flags.demo);
        setClean(flags.clean);
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
              <WordFromFire scene={mounted.scene} unlimited={demo} />
              <Company scene={mounted.scene} />
              <PetitionSky scene={mounted.scene} />
              {!clean && <GestureBar scene={mounted.scene} />}
              <SettingsButton />
              <SitDown scene={mounted.scene} />
              {demo && !clean && <DemoControls local={mounted.services} scene={mounted.scene} />}
            </SoundProvider>
          </InteractionProvider>
        </DataProvider>
      )}
    </>
  );
}
