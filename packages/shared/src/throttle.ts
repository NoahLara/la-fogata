export interface ThrottleLimits {
  /** The most one key can do in a burst. */
  burst: number;
  /** How many more it earns each second. */
  perSecond: number;
}

/**
 * A flood guard: each key may do `burst` things at once and then `perSecond` more each second. It is not a
 * cooldown; it only drops absurd bursts. Pure logic with an injected clock.
 */
export class Throttle {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    private readonly limits: ThrottleLimits,
    private readonly clock: () => number = Date.now,
  ) {}

  /** True if `key` may go ahead now (and spends one); false if it must be dropped. */
  allow(key: string): boolean {
    const now = this.clock();
    const bucket = this.buckets.get(key) ?? { tokens: this.limits.burst, at: now };
    const earned = ((now - bucket.at) / 1000) * this.limits.perSecond;
    bucket.tokens = Math.min(this.limits.burst, bucket.tokens + earned);
    bucket.at = now;
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return allowed;
  }

  /** Forgets a key (they left). */
  forget(key: string): void {
    this.buckets.delete(key);
  }
}
