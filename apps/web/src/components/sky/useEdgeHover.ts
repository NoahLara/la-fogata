import { useRef, useState, type PointerEvent } from "react";

/** The mouse counts as near an edge of the sky within this share of the width. */
const EDGE = 0.12;

/**
 * Whether the mouse is near the left or right edge of the sky strip: the arrows that turn the sky appear then (and on
 * keyboard focus). Only a mouse counts: a finger turns the sky by tapping the outer tenth, or by dragging.
 */
export function useEdgeHover(skyBottom: number) {
  const [near, setNear] = useState(false);
  const current = useRef(false);
  const set = (value: boolean) => {
    if (current.current === value) return;
    current.current = value;
    setNear(value);
  };
  return {
    near,
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== "mouse") return;
      const box = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      set(y <= skyBottom && (x <= box.width * EDGE || x >= box.width * (1 - EDGE)));
    },
    onPointerLeave() {
      set(false);
    },
  };
}
