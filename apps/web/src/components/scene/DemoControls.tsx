"use client";

import { useEffect, useState } from "react";
import { es } from "@/i18n/es";
import { pickArrival, pickLeaver, pickThrower } from "@/scene/demo";
import type { FogataScene } from "@/scene/createScene";
import type { Species } from "@/scene/characters/species";

let nextId = 1;

const BUTTON =
  "rounded-full bg-[#2a1d14]/90 px-4 py-2 text-sm text-[#ffd9a0] ring-1 ring-[#ff9650]/50 hover:bg-[#3a281b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd9a0]";

/** Development-only buttons (behind ?demo) to make people arrive at and leave the fire. */
export function DemoControls({ scene }: { scene: FogataScene }) {
  const arrive = () => {
    const members = scene.members();
    const arrival = pickArrival(
      Math.random,
      scene.seatCount,
      new Set(members.map((member) => member.seat)),
      new Set<Species>(members.map((member) => member.species)),
    );
    if (arrival) scene.addMember({ id: `demo-${nextId++}`, ...arrival }, { animate: true });
  };

  const [notice, setNotice] = useState<string>();
  // The notice goes away by itself.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const throwWood = () => {
    const choice = pickThrower(Math.random, scene.members(), (id) => scene.woodCooldown(id));
    if (!choice) return;
    if ("id" in choice) scene.throwWood(choice.id);
    else setNotice(es.demo.nobodyReady.replace("{seconds}", String(Math.ceil(choice.wait))));
  };

  const leave = () => {
    const id = pickLeaver(Math.random, scene.members());
    if (id) scene.removeMember(id, { animate: true });
  };

  return (
    <div
      role="group"
      aria-label={es.demo.groupLabel}
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-3"
    >
      <button type="button" onClick={arrive} className={BUTTON}>
        {es.demo.arrives}
      </button>
      <button type="button" onClick={leave} className={BUTTON}>
        {es.demo.leaves}
      </button>
      <button type="button" onClick={throwWood} className={BUTTON}>
        {es.demo.throws}
      </button>
      <p
        aria-live="polite"
        className="absolute bottom-full left-1/2 mb-2 w-max max-w-[80vw] -translate-x-1/2 text-center text-sm text-[#ffd9a0]"
      >
        {notice}
      </p>
    </div>
  );
}
