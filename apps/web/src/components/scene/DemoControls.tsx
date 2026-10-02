"use client";

import { es } from "@/i18n/es";
import { pickArrival, pickLeaver } from "@/scene/demo";
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
    </div>
  );
}
