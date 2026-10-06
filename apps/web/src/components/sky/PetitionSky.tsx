"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { hasRiskSignals } from "@/burden/risk";
import { useServices } from "@/data/DataProvider";
import { skyLimit } from "@/data/sky";
import type { Petition } from "@/data/types";
import { createAnnounceLimiter } from "@/design/announceLimiter";
import { nearestStar } from "@/design/hitTarget";
import { nextStarIndex, orderStars, starAfterRemoval } from "@/design/rovingFocus";
import { useI18n } from "@/i18n/I18nProvider";
import type { FogataScene, SkyViewState } from "@/scene/createScene";
import { screenX, wrapSigned } from "@/scene/panorama";
import { HelpScreen } from "../help/HelpScreen";
import { useInteraction } from "../scene/Interaction";
import { starName } from "./cardState";
import { OtherStarCard, type AccompanyOutcome } from "./OtherStarCard";
import { skyCounts, groupName } from "./skySummary";
import { SkyChevrons } from "./SkyChevrons";
import { StarCard } from "./StarCard";
import { useSound } from "@/sound/SoundProvider";
import { useEdgeHover } from "./useEdgeHover";
import { useSkyDrag } from "./useSkyDrag";

/** The size of the touch target over each star, in pixels. */
const TARGET = 44;
/** The longest stretch of a petition a screen reader hears as the star's name. */
const NAME_LENGTH = 60;
/** How long the star takes to start twinkling and the shooting star to cross, so the gestures wait for both. */
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
 * Every star of a petition as a real button over the scene: one invisible 44 px target per star, the visitor's own and
 * other people's (where targets overlap, the nearest star wins). The sky is a single tab stop (arrow keys move
 * between all the stars, left to right), and Enter or a tap opens the star's card. The buttons follow the
 * sky as it turns, moved through refs rather than state, and one that takes keyboard focus turns the sky until it
 * is in view. Your stars are known by the constellation's lines alone; the group's name says how many there are.
 * Dragging the sky strip turns it. Without dragging (WCAG 2.5.7), two arrows appear when the mouse is near the sky's
 * edges or one has keyboard focus (they stay in the tab order), and a tap on empty sky in the outer tenth of
 * either side turns it a step.
 */
export function PetitionSky({ scene }: { scene: FogataScene }) {
  const { t, locale } = useI18n();
  const { petitions, prayers, presence } = useServices();
  const sound = useSound();
  const { busy, hold, say, announce, reportDialog } = useInteraction();
  const [mine, setMine] = useState<readonly Petition[]>([]);
  // Other people's petitions that have a star in the sky (never one the visitor reported).
  const [others, setOthers] = useState<readonly Petition[]>([]);
  // Where the stars are in the panorama, which doesn't change as the sky turns.
  const [spots, setSpots] = useState<ReadonlyMap<string, { x: number; y: number }>>(new Map());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragBottom, setDragBottom] = useState(0);
  const [activeId, setActiveId] = useState<string>();
  const [openId, setOpenId] = useState<string>();
  const [openSpot, setOpenSpot] = useState({ x: 0, y: 0 });
  /** What the open card shows if its star is gone (the visitor just reported it): the card says thanks and then closes. */
  const [openSnapshot, setOpenSnapshot] = useState<Petition>();
  /** Where focus goes when the card of a reported star closes. */
  const focusAfterReport = useRef<string | undefined>(undefined);
  /** How far the sky was turned when the card opened. */
  const openedAt = useRef<number | undefined>(undefined);
  const [help, setHelp] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  // A star's card or help screen is open: the fire doesn't speak over it.
  useEffect(() => {
    reportDialog("sky", help ? "help" : openId ? "dialog" : "none");
  }, [help, openId, reportDialog]);
  useEffect(() => () => reportDialog("sky", "none"), [reportDialog]);
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

  // Other people's petitions, as many as the width of the sky holds, kept up to date. They are loaded once: a star that
  // has just been accompanied must not drop out of the sky because it now has more company.
  useEffect(() => {
    let alive = true;
    const { panorama, viewport } = scene.sky.state();
    void petitions.sky(skyLimit(panorama, viewport)).then((list) => {
      if (alive) setOthers(list.filter((petition) => !petition.mine));
    });
    const stop = petitions.subscribe((event) => {
      if (event.type === "removed" || event.type === "hidden") {
        setOthers((list) => list.filter((petition) => petition.id !== event.id));
      } else if (event.type === "changed" || event.type === "answered") {
        const { petition } = event;
        setOthers((list) => list.map((entry) => (entry.id === petition.id ? petition : entry)));
      } else if (event.type === "added" && !event.petition.mine) {
        const { petition } = event;
        setOthers((list) =>
          list.some((entry) => entry.id === petition.id) ? list : [...list, petition],
        );
      }
    });
    return () => {
      alive = false;
      stop();
    };
  }, [petitions, scene]);
  useEffect(() => {
    scene.setOtherStars(
      others.map((petition) => ({ id: petition.id, answered: petition.answered !== undefined })),
    );
  }, [scene, others]);

  // Someone is with the visitor's star: it pulses softly, and a polite announcement says so (no more than one every 10 s).
  const latest = useRef({ announce, text: t.sky.announceAccompanied });
  useEffect(() => {
    latest.current = { announce, text: t.sky.announceAccompanied };
  });
  useEffect(() => {
    const limiter = createAnnounceLimiter();
    return petitions.subscribe((event) => {
      if (event.type !== "accompanied") return;
      scene.pulseStar(event.petition.id);
      if (limiter.take()) latest.current.announce(latest.current.text);
    });
  }, [petitions, scene]);

  // Where the stars are, and how big the scene is, whenever the scene is laid out again.
  useEffect(() => {
    const update = () => {
      setSpots(scene.sky.anchors());
      setDragBottom(scene.sky.dragBottom());
    };
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
        [...mine, ...others].flatMap((petition) => {
          const spot = spots.get(petition.id);
          return spot ? [{ petition, id: petition.id, ...spot }] : [];
        }),
      ),
    [mine, others, spots],
  );
  // The one tab stop: the star last used, or else the first.
  const tabStop = stars.find((star) => star.id === activeId)?.id ?? stars[0]?.id;

  // The buttons follow the sky as it turns: set through refs, so turning never re-renders anything.
  const starsRef = useRef(stars);
  // A star turned away from the screen is left where it is until it comes back, so a sky of many stars stays cheap.
  const turnedAway = useRef(new Set<string>());
  const place = useCallback((state: SkyViewState) => {
    for (const star of starsRef.current) {
      const button = buttons.current.get(star.id);
      if (!button) continue;
      const x = screenX(star.x, state.offset, state.panorama, state.viewport);
      const away = x < -TARGET || x > state.viewport + TARGET;
      if (away && turnedAway.current.has(star.id)) continue;
      if (away) turnedAway.current.add(star.id);
      else turnedAway.current.delete(star.id);
      button.style.transform = `translate3d(${x - TARGET / 2}px, ${star.y - TARGET / 2}px, 0)`;
    }
  }, []);
  useLayoutEffect(() => {
    starsRef.current = stars;
    turnedAway.current.clear();
    place(scene.sky.state());
  }, [stars, scene, place]);
  useEffect(
    () =>
      scene.sky.onView((state) => {
        place(state);
        // A card stays beside its star where it opened: if the sky is turned (by hand, or by an arrow) it closes.
        const opened = openedAt.current;
        if (
          opened !== undefined &&
          Math.abs(wrapSigned(state.offset - opened, state.panorama)) > 1
        ) {
          openedAt.current = undefined;
          setOpenId(undefined);
        }
      }),
    [scene, place],
  );

  // The sky stops turning by itself while a star's card is open, so the card (and what is read on it) stays put.
  const cardOpen = openId !== undefined;
  useEffect(() => (cardOpen ? scene.sky.pauseAutoTurn() : undefined), [scene, cardOpen]);

  const drag = useSkyDrag(scene, () => setOpenId(undefined));
  const edge = useEdgeHover(dragBottom);

  const focusStar = useCallback((id: string) => {
    setActiveId(id);
    window.requestAnimationFrame(() =>
      overlayRef.current
        ?.querySelector<HTMLElement>(`[data-star-id="${CSS.escape(id)}"]`)
        // The sky turns by itself to bring it into view, so the browser must not scroll to it as well.
        ?.focus({ preventScroll: true }),
    );
  }, []);

  const openCard = (star: Star) => {
    // The card stays beside the star where it is now.
    setOpenSpot(scene.petitionSpots().get(star.id) ?? { x: star.x, y: star.y });
    openedAt.current = scene.sky.state().offset;
    setOpenSnapshot(star.petition);
    setOpenId(star.id);
  };
  const toggleCard = (star: Star) => {
    if (openId === star.id) {
      openedAt.current = undefined;
      setOpenId(undefined);
      return;
    }
    openCard(star);
  };

  const closeCard = (refocus: boolean) => {
    const id = openId;
    openedAt.current = undefined;
    setOpenId(undefined);
    if (!refocus || !id) return;
    // A reported star is gone: focus goes to the one after it.
    focusStar(stars.some((star) => star.id === id) ? id : (focusAfterReport.current ?? id));
  };

  // The fish: the visitor is with this star. The light and the pulse are the scene's.
  const accompany = async (petition: Petition): Promise<AccompanyOutcome> => {
    const result = await prayers.pray(petition.id);
    if (result.status === "prayed") {
      sound.play("ichthys");
      const self = presence.self?.id;
      if (self) scene.sendLight(self, petition.id);
      else scene.pulseStar(petition.id);
      return "done";
    }
    if (result.status === "already-prayed") return "done";
    return result.status === "rate-limited" ? "limited" : "failed";
  };

  // The flag: reported, saved, and the star is hidden for the visitor from now on.
  const report = async (petition: Petition): Promise<boolean> => {
    const index = stars.findIndex((star) => star.id === petition.id);
    const next = starAfterRemoval(
      stars.filter((star) => star.id !== petition.id),
      index,
    );
    const result = await petitions.report(petition.id);
    if (result.status !== "reported") return false;
    focusAfterReport.current = next?.id;
    return true;
  };

  // A tap lands on the nearest star when two touch targets overlap.
  const retarget = (event: React.MouseEvent) => {
    // A click from the keyboard has no position: it belongs to the star that has focus.
    if (event.detail === 0 || !(event.target instanceof Element)) return;
    const hit = event.target.closest("[data-star-id]")?.getAttribute("data-star-id");
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!hit || !rect) return;
    const state = scene.sky.state();
    const nearest = nearestStar(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      stars.map((star) => ({
        id: star.id,
        x: screenX(star.x, state.offset, state.panorama, state.viewport),
        y: star.y,
      })),
      TARGET / 2,
    );
    if (!nearest || nearest === hit) return;
    event.stopPropagation();
    event.preventDefault();
    const star = stars.find((entry) => entry.id === nearest);
    if (star) toggleCard(star);
  };

  const answer = async (petition: Petition, line: string): Promise<string | undefined> => {
    // Signs of risk: the line is dropped, the star keeps waiting, and the help screen opens.
    if (hasRiskSignals(line)) {
      setOpenId(undefined);
      setHelp(true);
      return undefined;
    }
    const result = await petitions.answer(petition.id, line);
    if (result.status === "not-yours") return t.sky.notYours;
    if (result.status === "not-found") return t.sky.notFound;
    if (result.status === "note-required") return t.sky.noteRequired;
    if (result.status !== "answered") return t.sky.failed;
    scene.answerPetition(petition.id);
    say(t.sky.announceAnswered);
    setOpenId(undefined);
    focusStar(petition.id);
    // The star starts to twinkle and a shooting star crosses; the gestures wait for it (nothing moves with reduced motion).
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const release = hold();
      timers.current.add(window.setTimeout(release, ANSWER_ANIMATION_MS));
    }
    return undefined;
  };

  const giveBack = async (petition: Petition): Promise<string | undefined> => {
    const result = await petitions.remove(petition.id);
    if (result.status === "not-yours") return t.sky.notYours;
    if (result.status === "not-found") return t.sky.notFound;
    // Only a petition that was really removed goes back to the fire.
    if (result.status !== "removed") return t.sky.failed;
    const index = stars.findIndex((star) => star.id === petition.id);
    const next = starAfterRemoval(
      stars.filter((star) => star.id !== petition.id),
      index,
    );
    setOpenId(undefined);
    const release = hold();
    scene.returnPetition(petition.id, () => {
      release();
      say(t.sky.announceReturned);
      if (next) focusStar(next.id);
      else
        window.requestAnimationFrame(() =>
          document.querySelector<HTMLElement>('[data-gesture="petition"]')?.focus(),
        );
    });
    return undefined;
  };

  const open = stars.find((star) => star.id === openId);
  const cardPetition = open?.petition ?? (openId ? openSnapshot : undefined);

  return (
    <div
      ref={overlayRef}
      // While a card is open the whole overlay rises above the gesture bar and every other control, so nothing
      // is ever drawn over the star's card.
      className={`pointer-events-none absolute inset-0 overflow-clip ${cardOpen ? "z-40" : "z-[5]"}`}
      {...drag}
      onPointerMove={(event) => {
        drag.onPointerMove(event);
        edge.onPointerMove(event);
      }}
      onPointerLeave={edge.onPointerLeave}
    >
      {/* The strip of sky a drag may start in: above the fire and the characters. */}
      <div
        data-sky-drag
        data-sky-surface
        aria-hidden="true"
        style={{ height: dragBottom }}
        className="pointer-events-auto absolute inset-x-0 top-0 cursor-grab touch-none active:cursor-grabbing"
      />
      <SkyChevrons scene={scene} bottom={dragBottom} near={edge.near} />
      {stars.length > 0 && (
        <div
          role="group"
          aria-label={
            mine.length > 0
              ? `${t.sky.groupAll}. ${groupName(locale, t.sky, skyCounts(mine))}`
              : t.sky.groupAll
          }
          onClickCapture={retarget}
        >
          {stars.map((star, index) => {
            const { petition } = star;
            const name = starName(t.sky, petition, shorten);
            return (
              <button
                key={star.id}
                ref={(node) => {
                  if (node) buttons.current.set(star.id, node);
                  else buttons.current.delete(star.id);
                }}
                type="button"
                data-star-id={star.id}
                data-sky-drag
                aria-label={name}
                aria-haspopup="dialog"
                aria-expanded={openId === star.id}
                tabIndex={star.id === tabStop ? 0 : -1}
                onFocus={(event) => {
                  setActiveId(star.id);
                  // Reached by the keyboard: turn the sky so the star is in view.
                  if (event.currentTarget.matches(":focus-visible"))
                    scene.sky.bringIntoView(star.id);
                }}
                onClick={() => toggleCard(star)}
                onKeyDown={(event) => {
                  const to = nextStarIndex(event.key, index, stars.length);
                  if (to === undefined) return;
                  event.preventDefault();
                  const target = stars[to];
                  if (target) focusStar(target.id);
                }}
                style={{ width: TARGET, height: TARGET }}
                className="pointer-events-auto absolute left-0 top-0 cursor-pointer touch-none rounded-full bg-transparent focus-visible:shadow-focus focus-visible:outline-none"
              />
            );
          })}
        </div>
      )}
      {openId &&
        size.width > 0 &&
        cardPetition &&
        (cardPetition.mine ? (
          <StarCard
            // A fresh card for each star.
            key={openId}
            petition={cardPetition}
            star={openSpot}
            scene={size}
            busy={busy}
            onClose={closeCard}
            onAnswer={(line) => answer(cardPetition, line)}
            onReturn={() => giveBack(cardPetition)}
          />
        ) : (
          <OtherStarCard
            key={openId}
            petition={cardPetition}
            star={openSpot}
            scene={size}
            onClose={closeCard}
            onAccompany={() => accompany(cardPetition)}
            onReport={() => report(cardPetition)}
          />
        ))}
      {help && (
        <div className="pointer-events-auto">
          <HelpScreen kind="petition" onClose={() => setHelp(false)} />
        </div>
      )}
    </div>
  );
}
