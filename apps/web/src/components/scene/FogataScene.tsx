"use client";

import { useEffect, useRef, useState } from "react";
import { es } from "@/i18n/es";
import type { FogataScene as Scene } from "@/scene/createScene";
import { readDevFlags } from "@/scene/devFlags";
import { DemoControls } from "./DemoControls";

/** Mounts the PixiJS scene. Pixi is imported inside the effect so it never loads on the server. */
export function FogataScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [demoScene, setDemoScene] = useState<Scene>();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let scene: Scene | undefined;

    // ?animal=<species> and ?shuffle are for looking at the scene in development; in production they do nothing.
    const { animal, shuffle, demo } = readDevFlags(
      window.location.search,
      process.env.NODE_ENV === "production",
    );

    import("@/scene/createScene")
      .then(({ createScene }) => createScene(host, { label: es.scene.ariaLabel, shuffle, animal }))
      .then((created) => {
        // Strict Mode (and fast unmounts) can dispose us while Pixi is still initializing.
        if (disposed) created.destroy();
        else {
          scene = created;
          if (demo) setDemoScene(created);
        }
      })
      .catch((error: unknown) => console.error("Could not start the campfire scene", error));

    return () => {
      disposed = true;
      scene?.destroy();
      setDemoScene(undefined);
    };
  }, []);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0" />
      {demoScene && <DemoControls scene={demoScene} />}
    </>
  );
}
