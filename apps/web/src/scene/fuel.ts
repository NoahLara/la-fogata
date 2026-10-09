import { addLog, burn, FUEL } from "@fogata/shared";
import { clamp } from "./math";

// The server keeps the fuel, so what a log is worth and how it burns are shared with it.
export { addLog, burn };

/** How strong the fire is, and what makes it stronger. */
export const FIRE = {
  /** With nobody there and no wood: embers and a small flame, never out. */
  min: 0.2,
  /** Each person sitting there adds a little. */
  perMember: 0.03,
  /** Wood is what makes a big fire. This is as big as it ever gets. */
  max: 1.45,
  /** What one log adds to the fuel, and the most fuel there can be. */
  logFuel: FUEL.logFuel,
  maxFuel: FUEL.maxFuel,
  /** Fuel burns down on its own: after this many seconds, about a third of it is left (a fire left alone is back to its small self in about two minutes). */
  burnSeconds: FUEL.burnSeconds,
  /** The surge a log makes when it lands, which dies away in a second or two. */
  flarePerLog: 0.25,
  /** A burden's paper makes a smaller surge than a log, and adds no fuel. */
  flarePerBurden: 0.12,
} as const;

/** The strength the fire settles at for this many people sitting there and this much fuel. */
export function fireIntensityFor(seatedCount: number, fuel: number): number {
  return clamp(FIRE.min + FIRE.perMember * seatedCount + fuel, FIRE.min, FIRE.max);
}

/**
 * The fuel once a log has landed. One that comes with the campfire's `serverFuel` (somebody else's) sets the fire
 * to that value, burnt down for the `flight` seconds the log was in the air; one without it (the visitor's own,
 * drawn at once) simply adds a log to what there is.
 */
export function fuelAfterLanding(
  fuel: number,
  serverFuel: number | undefined,
  flight: number,
): number {
  return serverFuel === undefined ? addLog(fuel) : burn(serverFuel, flight);
}
