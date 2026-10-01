const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** Calls `onChange` whenever the user's reduced-motion setting flips. Returns an unsubscribe. */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  const query = window.matchMedia(QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
