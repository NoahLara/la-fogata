"use client";

import { pick } from "@/scene/random";
import type { LocalServices } from "@/data";
import { es } from "@/i18n/es";
import type { FogataScene } from "@/scene/createScene";

const BUTTON =
  "min-h-11 rounded-full bg-bark/90 px-4 text-sm text-gold ring-1 ring-ember/50 hover:bg-ember/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Development-only buttons (behind ?demo) to make other people arrive at and leave the fire. */
export function DemoControls({ local, scene }: { local: LocalServices; scene: FogataScene }) {
  const leave = () => {
    // The visitor stays: only others can be sent away.
    const others = local.presence
      .people()
      .filter((person) => person.id !== local.presence.self?.id);
    if (others.length) local.presence.removePeer(pick(Math.random, others).id);
  };

  // Someone else hands over a burden: the same walk, note and burn as the visitor's, with nothing written.
  const burden = () => {
    const seated = scene.members().filter((member) => member.status === "seated");
    const others = seated.filter((member) => member.id !== local.presence.self?.id);
    if (others.length) scene.handOverBurden(pick(Math.random, others).id, { onDone: () => {} });
  };

  return (
    <div
      role="group"
      aria-label={es.demo.groupLabel}
      className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-3"
    >
      <button type="button" onClick={() => local.presence.addPeer()} className={BUTTON}>
        {es.demo.arrives}
      </button>
      <button type="button" onClick={leave} className={BUTTON}>
        {es.demo.leaves}
      </button>
      <button type="button" onClick={burden} className={BUTTON}>
        {es.demo.burden}
      </button>
    </div>
  );
}
