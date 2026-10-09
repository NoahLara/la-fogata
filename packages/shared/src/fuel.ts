/** What a log is worth and how fast fuel burns: the server keeps the fire's fuel, every browser draws it. */
export const FUEL = {
  /** What one log adds to the fuel, and the most fuel there can be. */
  logFuel: 0.18,
  maxFuel: 1,
  /** Fuel burns down on its own: after this many seconds, about a third of it is left (a fire left alone is back to its small self in about two minutes). */
  burnSeconds: 45,
} as const;

/** The fuel after one more log lands. There is a limit to how much the fire can hold. */
export function addLog(fuel: number): number {
  return Math.min(FUEL.maxFuel, fuel + FUEL.logFuel);
}

/** The fuel after `dt` seconds of burning. */
export function burn(fuel: number, dt: number): number {
  const left = fuel * Math.exp(-dt / FUEL.burnSeconds);
  return left < 1e-4 ? 0 : left;
}

/**
 * The fire of one campfire as the server keeps it: the fuel it had when the last log landed, burning down since.
 * Pure logic with an injected clock; the Durable Object holds one in memory.
 */
export class Fire {
  private fuel = 0;
  private since: number;

  constructor(private readonly clock: () => number = Date.now) {
    this.since = clock();
  }

  /** The fuel now. */
  level(): number {
    return burn(this.fuel, (this.clock() - this.since) / 1000);
  }

  /** A log lands. Returns the fuel after it. */
  throwLog(): number {
    this.fuel = addLog(this.level());
    this.since = this.clock();
    return this.fuel;
  }
}
