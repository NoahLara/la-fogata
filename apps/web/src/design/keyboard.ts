/**
 * How much of the bottom of the window the on-screen keyboard covers, in pixels. On phones the keyboard shrinks
 * the visual viewport but not the layout one, so a sheet fixed to the bottom has to be lifted by this much.
 */
export function keyboardInset(
  windowHeight: number,
  viewportHeight: number,
  viewportTop: number,
): number {
  return Math.max(0, Math.round(windowHeight - viewportHeight - viewportTop));
}
