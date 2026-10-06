"use client";

import { useEffect, useRef } from "react";
import { useServices } from "@/data/DataProvider";
import { useSettings } from "@/preferences/SettingsProvider";
import type { FogataScene } from "@/scene/createScene";

/**
 * Sits the visitor down by the fire as soon as the page is ready, as their saved character (a free one if it is
 * taken here, or if they have chosen none). There is no welcome card: the character, the language and the sound
 * are all in the settings. It draws nothing.
 */
export function SitDown({ scene }: { scene: FogataScene }) {
  const { presence } = useServices();
  const { animal, ready } = useSettings();
  const seated = useRef(false);

  useEffect(() => {
    if (!ready || seated.current) return;
    seated.current = true;
    void presence.join(animal === "random" ? undefined : animal).then((me) => {
      if (me) scene.setSelf(me.id);
    });
  }, [ready, animal, presence, scene]);

  return null;
}
