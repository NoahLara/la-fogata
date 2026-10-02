"use client";

import { useEffect, useState } from "react";
import { keyboardInset } from "./keyboard";

/** The on-screen keyboard's height and what is left of the window above it, for sheets fixed to the bottom. */
export function useVisualViewport(): { inset: number; height: number | undefined } {
  const [state, setState] = useState<{ inset: number; height: number | undefined }>({
    inset: 0,
    height: undefined,
  });

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setState({
        inset: keyboardInset(window.innerHeight, viewport.height, viewport.offsetTop),
        height: Math.round(viewport.height),
      });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
