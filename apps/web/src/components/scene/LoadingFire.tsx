"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

/** How long the loading screen takes to fade once the scene is ready. */
const FADE_MS = 600;

/**
 * What is on screen while the scene is being built: a single flame, swaying, with a couple of embers rising.
 * No words (a screen reader still gets one). It is the first thing painted, and fades away when the scene is
 * ready. With reduced motion the flame stands still and it goes at once. Drawn with the theme's tokens.
 */
export function LoadingFire({ ready }: { ready: boolean }) {
  const { t } = useI18n();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (gone) return null;

  return (
    <div
      data-leaving={ready ? "" : undefined}
      className="loading-fire absolute inset-0 z-20 flex items-center justify-center bg-night"
    >
      <svg
        viewBox="0 0 60 80"
        width="60"
        height="80"
        aria-hidden="true"
        className="overflow-visible"
      >
        <ellipse cx="30" cy="76" rx="20" ry="3.5" className="fill-ember/20" />
        <path
          d="M30 74 C12 64 14 40 26 22 C27 34 33 36 36 26 C46 42 50 62 30 74 Z"
          className="loading-flame fill-ember"
        />
        <path
          d="M30 74 C19 67 21 52 30 41 C32 50 37 52 39 47 C44 58 42 68 30 74 Z"
          className="loading-flame fill-ember-soft"
          style={{ animationDelay: "-0.4s" }}
        />
        <path
          d="M30 74 C24 70 25 62 30 56 C35 62 36 70 30 74 Z"
          className="loading-flame fill-gold"
          style={{ animationDelay: "-0.7s" }}
        />
        <circle cx="22" cy="16" r="1.6" className="loading-ember fill-gold" />
        <circle
          cx="38"
          cy="12"
          r="1.3"
          className="loading-ember fill-ember-soft"
          style={{ animationDelay: "-1.2s" }}
        />
      </svg>
      <p role="status" className="sr-only">
        {t.loading.lighting}
      </p>
    </div>
  );
}
