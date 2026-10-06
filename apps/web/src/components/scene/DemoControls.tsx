"use client";

import { pick } from "@/scene/random";
import type { LocalServices } from "@/data";
import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene } from "@/scene/createScene";

const BUTTON =
  "min-h-11 rounded-full px-4 text-sm btn-wood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Development-only buttons (behind ?demo) to make other people arrive at and leave the fire. */
export function DemoControls({ local, scene }: { local: LocalServices; scene: FogataScene }) {
  const { t } = useI18n();
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

  // Someone else is with one of the visitor's stars: it pulses and a polite word is said.
  const accompany = async () => {
    const mine = await local.petitions.mine();
    const star = mine[0];
    if (star) local.petitions.simulateAccompany(star.id);
  };

  return (
    <div
      role="group"
      aria-label={t.demo.groupLabel}
      className="absolute bottom-20 left-1/2 z-10 flex w-[min(94vw,44rem)] -translate-x-1/2 flex-wrap justify-center gap-3"
    >
      <button type="button" onClick={() => local.presence.addPeer()} className={BUTTON}>
        {t.demo.arrives}
      </button>
      <button type="button" onClick={leave} className={BUTTON}>
        {t.demo.leaves}
      </button>
      <button type="button" onClick={burden} className={BUTTON}>
        {t.demo.burden}
      </button>
      <button type="button" onClick={() => void accompany()} className={BUTTON}>
        {t.demo.someoneAccompanies}
      </button>
      <button type="button" onClick={() => local.distantFires.addDemo()} className={BUTTON}>
        {t.demo.farFireAdd}
      </button>
      <button type="button" onClick={() => local.distantFires.removeDemo()} className={BUTTON}>
        {t.demo.farFireRemove}
      </button>
    </div>
  );
}
