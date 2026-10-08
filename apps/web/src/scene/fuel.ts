import { clamp } from "./math";

/** How strong the fire is, and what makes it stronger. */
export const FIRE = {
  /** With nobody there and no wood: embers and a small flame, never out. */
  min: 0.2,
  /** Each person sitting there adds a little. */
  perMember: 0.03,
  /** Wood is what makes a big fire. This is as big as it ever gets. */
  max: 1.45,
  /** What one log adds to the fuel, and the most fuel there can be. */
  logFuel: 0.18,
  maxFuel: 1,
  /** Fuel burns down on its own: after this many seconds, about a third of it is left (a fire left alone is back to its small self in about two minutes). */
  burnSeconds: 45,
  /** The surge a log makes when it lands, which dies away in a second or two. */
  flarePerLog: 0.25,
  /** A burden's paper makes a smaller surge than a log, and adds no fuel. */
  flarePerBurden: 0.12,
} as const;

/** The strength the fire settles at for this many people sitting there and this much fuel. */
export function fireIntensityFor(seatedCount: number, fuel: number): number {
  return clamp(FIRE.min + FIRE.perMember * seatedCount + fuel, FIRE.min, FIRE.max);
}

/** The fuel after one more log lands. There is a limit to how much the fire can hold. */
export function addLog(fuel: number): number {
  return Math.min(FIRE.maxFuel, fuel + FIRE.logFuel);
}

/** The fuel after `dt` seconds of burning. */
export function burn(fuel: number, dt: number): number {
  const left = fuel * Math.exp(-dt / FIRE.burnSeconds);
  return left < 1e-4 ? 0 : left;
}
