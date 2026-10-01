"use client";

import { useEffect, useRef } from "react";
import { es } from "@/i18n/es";

/** Mounts the PixiJS scene. Pixi is imported inside the effect so it never loads on the server. */
export function FogataScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let scene: { destroy(): void } | undefined;

    // Dev only: ?art=drawn shows the shapes drawn in code instead of the illustrations, for comparing the two.
    const art =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("art") === "drawn"
        ? "drawn"
        : "sprites";

    // Dev only: ?shuffle randomizes who sits where, to check every animal in every seat.
    const shuffle =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).has("shuffle");

    // Dev only: ?animal=panda puts that species in every seat, to see it in front, back and side at once.
    const animal =
      process.env.NODE_ENV !== "production"
        ? (new URLSearchParams(window.location.search).get("animal") ?? undefined)
        : undefined;

    import("@/scene/createScene")
      .then(({ createScene }) =>
        createScene(host, { label: es.scene.ariaLabel, art, shuffle, animal }),
      )
      .then((created) => {
        // Strict Mode (and fast unmounts) can dispose us while Pixi is still initializing.
        if (disposed) created.destroy();
        else scene = created;
      })
      .catch((error: unknown) => console.error("Could not start the campfire scene", error));

    return () => {
      disposed = true;
      scene?.destroy();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
