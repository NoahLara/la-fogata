import { useRef, type MouseEvent, type PointerEvent } from "react";
import type { FogataScene } from "@/scene/createScene";
import { dragIntent } from "@/scene/skyView";

type Press =
  | { id: number; x: number; y: number; phase: "pressed" | "ignored"; touch: boolean }
  | { id: number; x: number; y: number; phase: "turning"; lastX: number; touch: boolean };

/** A tap on empty sky this close to a side (a share of the width) turns the sky a step, for those who don't drag. */
const TAP_EDGE = 0.1;
/** How far one such step turns it, in screens. */
const TAP_STEP = 0.5;

/**
 * Turning the sky by dragging it, with a mouse or a finger. A press starts on the sky strip or on one of your stars
 * (anything marked `data-sky-drag`), never on the fire, the characters or the gesture bar. Under about 6 px of
 * movement it is a tap and the star opens as usual; past that it turns the sky and the click that would follow is
 * swallowed. `onTurnStart` is called once when a drag begins.
 */
export function useSkyDrag(scene: FogataScene, onTurnStart: () => void) {
  const press = useRef<Press | undefined>(undefined);
  const swallowClick = useRef(false);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!(event.target instanceof Element) || !event.target.closest("[data-sky-drag]")) return;
    swallowClick.current = false;
    press.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      phase: "pressed",
      touch: event.pointerType === "touch",
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    const time = event.timeStamp / 1000;
    if (current.phase === "turning") {
      scene.sky.drag(event.clientX - current.lastX, time);
      current.lastX = event.clientX;
      return;
    }
    if (current.phase === "ignored") return;
    const intent = dragIntent(event.clientX - current.x, event.clientY - current.y);
    if (intent === "tap") return;
    // Whatever it turns into, it is no longer a tap.
    swallowClick.current = true;
    if (intent !== "turn") {
      press.current = { ...current, phase: "ignored" };
      return;
    }
    scene.sky.beginDrag(time);
    // Only now, so a tap on a star is still an ordinary click.
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = { ...current, phase: "turning", lastX: event.clientX };
    onTurnStart();
  };

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    press.current = undefined;
    if (current.phase === "turning") scene.sky.endDrag(event.timeStamp / 1000);
    // A touch that never moved, on empty sky in the outer tenth at either side: one step that way (WCAG 2.5.7).
    if (
      current.phase === "pressed" &&
      current.touch &&
      event.type === "pointerup" &&
      event.target instanceof Element &&
      event.target.closest("[data-sky-surface]")
    ) {
      const box = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const step = TAP_STEP * scene.sky.state().viewport;
      // Like the arrows: a tap on the left moves the stars to the left, a tap on the right to the right.
      if (x <= TAP_EDGE) scene.sky.turnBy(step);
      else if (x >= 1 - TAP_EDGE) scene.sky.turnBy(-step);
    }
    // The click that follows a drag comes right after this; one that comes later is a real one.
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 0);
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onClickCapture,
  };
}
