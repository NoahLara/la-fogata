"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasRiskSignals } from "@/burden/risk";
import { useServices } from "@/data/DataProvider";
import type { Petition } from "@/data/types";
import { nextStarIndex, orderStars, starAfterRemoval } from "@/design/rovingFocus";
import { es } from "@/i18n/es";
import type { FogataScene } from "@/scene/createScene";
import { HelpScreen } from "../help/HelpScreen";
import { useInteraction } from "../scene/Interaction";
import { StarCard } from "./StarCard";

/** The size of the touch target over each star, in pixels. */
const TARGET = 44;
/** The longest stretch of a petition a screen reader hears as the star's name. */
const NAME_LENGTH = 60;
/** How long the star takes to turn golden and the shooting star to cross, so the gestures wait for both. */
const ANSWER_ANIMATION_MS = 1400;

const shorten = (text: string) => {
  const letters = Array.from(text);
  return letters.length <= NAME_LENGTH ? text : `${letters.slice(0, NAME_LENGTH).join("")}…`;
};

interface Star {
  petition: Petition;
  id: string;
  x: number;
  y: number;
}

/**
 * The visitor's own stars as real buttons over the scene: one invisible 44 px target per star. The sky is a single
 * tab stop (arrow keys move between stars), and Enter or a tap opens the star's card.
 */
export function PetitionSky({ scene }: { scene: FogataScene }) {
  const { petitions } = useServices();
  const { busy, hold, say } = useInteraction();
  const [mine, setMine] = useState<readonly Petition[]>([]);
  const [spots, setSpots] = useState<ReadonlyMap<string, { x: number; y: number }>>(new Map());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeId, setActiveId] = useState<string>();
  const [openId, setOpenId] = useState<string>();
  const [help, setHelp] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timers = useRef(new Set<number>());

  // The visitor's petitions, kept up to date as they are made, answered and returned.
  useEffect(() => {
    let alive = true;
    const load = () =>
      petitions.mine().then((list) => {
        if (alive) setMine(list);
      });
    void load();
    const stop = petitions.subscribe((event) => {
      if (event.type === "removed") setMine((list) => list.filter((p) => p.id !== event.id));
      else void load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, [petitions]);

  // Where the stars are, and how big the scene is, whenever the scene is laid out again.
  useEffect(() => {
    const update = () => setSpots(scene.petitionSpots());
    update();
    return scene.onLayout(update);
  }, [scene]);
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const measure = () => setSize({ width: overlay.clientWidth, height: overlay.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(overlay);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const stars = useMemo<Star[]>(
    () =>
      orderStars(
        mine.flatMap((petition) => {
          const spot = spots.get(petition.id);
          return spot ? [{ petition, id: petition.id, ...spot }] : [];
        }),
      ),
    [mine, spots],
  );
  // The one tab stop: the star last used, or else the first.
  const tabStop = stars.find((star) => star.id === activeId)?.id ?? stars[0]?.id;

  const focusStar = useCallback((id: string) => {
    setActiveId(id);
    window.requestAnimationFrame(() =>
      overlayRef.current?.querySelector<HTMLElement>(`[data-star-id="${CSS.escape(id)}"]`)?.focus(),
    );
  }, []);

  const closeCard = (refocus: boolean) => {
    const id = openId;
    setOpenId(undefined);
    if (refocus && id) focusStar(id);
  };

  const answer = async (petition: Petition, line: string): Promise<string | undefined> => {
    // Signs of risk: the line is dropped, the star keeps waiting, and the help screen opens.
    if (hasRiskSignals(line)) {
      setOpenId(undefined);
      setHelp(true);
      return undefined;
    }
    const result = await petitions.answer(petition.id, line);
    if (result.status === "not-yours") return es.sky.notYours;
    if (result.status === "not-found") return es.sky.notFound;
    if (result.status === "note-required") return es.sky.noteRequired;
    if (result.status !== "answered") return es.sky.failed;
    scene.answerPetition(petition.id);
    say(es.sky.announceAnswered);
    setOpenId(undefined);
    focusStar(petition.id);
    // The star turns golden and a shooting star crosses; the gestures wait for it (nothing moves with reduced motion).
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const release = hold();
      timers.current.add(window.setTimeout(release, ANSWER_ANIMATION_MS));
    }
    return undefined;
  };

  const giveBack = async (petition: Petition): Promise<string | undefined> => {
    const result = await petitions.remove(petition.id);
    if (result.status === "not-yours") return es.sky.notYours;
    if (result.status === "not-found") return es.sky.notFound;
    // Only a petition that was really removed goes back to the fire.
    if (result.status !== "removed") return es.sky.failed;
    const index = stars.findIndex((star) => star.id === petition.id);
    const next = starAfterRemoval(
      stars.filter((star) => star.id !== petition.id),
      index,
    );
    setOpenId(undefined);
    const release = hold();
    scene.returnPetition(petition.id, () => {
      release();
      say(es.sky.announceReturned);
      if (next) focusStar(next.id);
      else
        window.requestAnimationFrame(() =>
          document.querySelector<HTMLElement>('[data-gesture="petition"]')?.focus(),
        );
    });
    return undefined;
  };

  const open = stars.find((star) => star.id === openId);

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-[5]">
      {stars.length > 0 && (
        <div role="group" aria-label={es.sky.groupLabel}>
          {stars.map((star, index) => {
            const { petition } = star;
            const name = (petition.answered ? es.sky.starAnswered : es.sky.star).replace(
              "{text}",
              shorten(petition.text),
            );
            return (
              <button
                key={star.id}
                type="button"
                data-star-id={star.id}
                aria-label={name}
                aria-haspopup="dialog"
                aria-expanded={openId === star.id}
                tabIndex={star.id === tabStop ? 0 : -1}
                onFocus={() => setActiveId(star.id)}
                onClick={() => setOpenId(openId === star.id ? undefined : star.id)}
                onKeyDown={(event) => {
                  const to = nextStarIndex(event.key, index, stars.length);
                  if (to === undefined) return;
                  event.preventDefault();
                  const target = stars[to];
                  if (target) focusStar(target.id);
                }}
                style={{
                  left: star.x - TARGET / 2,
                  top: star.y - TARGET / 2,
                  width: TARGET,
                  height: TARGET,
                }}
                className="pointer-events-auto absolute cursor-pointer rounded-full bg-transparent focus-visible:shadow-focus focus-visible:outline-none"
              />
            );
          })}
        </div>
      )}
      {open && size.width > 0 && (
        <StarCard
          // A fresh card for each star.
          key={open.id}
          petition={open.petition}
          star={open}
          scene={size}
          busy={busy}
          onClose={closeCard}
          onAnswer={(line) => answer(open.petition, line)}
          onReturn={() => giveBack(open.petition)}
        />
      )}
      {help && (
        <div className="pointer-events-auto">
          <HelpScreen kind="petition" onClose={() => setHelp(false)} />
        </div>
      )}
    </div>
  );
}
