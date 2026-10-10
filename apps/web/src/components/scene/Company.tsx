"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useServices } from "@/data/DataProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { format, plural } from "@/i18n/format";
import { Announcements } from "@/fire/announcements";
import { aloneLine, otherFiresDescription, shouldSayAlone } from "@/fire/aloneLine";
import type { FogataScene } from "@/scene/createScene";
import { useInteraction } from "./Interaction";

/** After sitting down, how long before the gentle line about being alone: the animal has arrived and settled. */
const ALONE_DELAY_MS = 3500;

/**
 * Everything the visitor hears about company: how many other fires burn (the scene's description), the one line
 * when they are alone, and a polite word when someone sits down or leaves. It draws nothing.
 */
export function Company({ scene }: { scene: FogataScene }) {
  const { t, locale } = useI18n();
  const { presence, distantFires } = useServices();
  const { say, announce } = useInteraction();
  const descriptionId = useId();
  const [others, setOthers] = useState(() => distantFires.fires().length);
  const copy = useRef({ t, locale });
  const speak = useRef({ say, announce });
  useEffect(() => {
    copy.current = { t, locale };
    speak.current = { say, announce };
  });

  useEffect(() => {
    scene.describeBy(descriptionId);
    return () => scene.describeBy(undefined);
  }, [scene, descriptionId]);

  useEffect(() => {
    return distantFires.subscribe((fires) => setOthers(fires.length));
  }, [distantFires]);

  useEffect(() => {
    const announcements = new Announcements({
      now: () => Date.now(),
      later: (callback, ms) => {
        const timer = window.setTimeout(callback, ms);
        return () => window.clearTimeout(timer);
      },
      say: (text) => speak.current.announce(text),
      line: (kind) => copy.current.t.company[kind],
      summary: (people) =>
        format(plural(copy.current.locale, copy.current.t.company.summary, people), {
          count: people,
        }),
      people: () => presence.people().length,
    });
    let aloneTimer: number | undefined;
    let aloneSaid = false;
    const stop = presence.subscribe((event) => {
      // Those already by the fire when the visitor sat down are not news.
      if (event.type === "changed" || (event.type === "joined" && event.already)) return;
      const isSelf = event.type === "joined" && event.person.id === presence.self?.id;
      if (isSelf) {
        // Once per visit, and only if nobody has sat down beside them by then.
        aloneTimer = window.setTimeout(() => {
          const state = { people: presence.people().length, alreadySaid: aloneSaid };
          if (!shouldSayAlone(state)) return;
          aloneSaid = true;
          const line = aloneLine(
            copy.current.locale,
            copy.current.t.company,
            distantFires.fires().length,
          );
          if (line) speak.current.say(line);
        }, ALONE_DELAY_MS);
        return;
      }
      announcements.notify(event.type);
    });
    return () => {
      stop();
      announcements.dispose();
      window.clearTimeout(aloneTimer);
    };
  }, [presence, distantFires]);

  return (
    <p id={descriptionId} className="sr-only">
      {otherFiresDescription(locale, t.company, others)}
    </p>
  );
}
