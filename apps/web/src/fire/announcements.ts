import { ANNOUNCE_GAP_MS } from "@/design/announceLimiter";
/** Seconds between two announcements to a screen reader about people coming and going. */
export const ANNOUNCE_WINDOW_MS = ANNOUNCE_GAP_MS;

interface Options {
  now: () => number;
  /** Starts a timer, returning a way to cancel it; `window.setTimeout` in the page. */
  later: (callback: () => void, ms: number) => () => void;
  say: (text: string) => void;
  /** The line for someone sitting down, or leaving. */
  line: (kind: "joined" | "left") => string;
  /** The one line that stands for every change in a window: how many are by the fire now. */
  summary: (people: number) => string;
  /** How many people are by the fire now. */
  people: () => number;
  windowMs?: number;
}

/**
 * Says who comes and goes, politely: at most one announcement every ten seconds. A change that comes inside the
 * window is not lost: when the window ends, one summary says how many are by the fire now.
 */
export class Announcements {
  private lastAt: number | undefined;
  private held = 0;
  private cancel: (() => void) | undefined;

  constructor(private readonly options: Options) {}

  private get windowMs(): number {
    return this.options.windowMs ?? ANNOUNCE_WINDOW_MS;
  }

  notify(kind: "joined" | "left"): void {
    const now = this.options.now();
    if (this.lastAt === undefined || now - this.lastAt >= this.windowMs) {
      this.said(now, this.options.line(kind));
      return;
    }
    this.held++;
    if (!this.cancel) {
      this.cancel = this.options.later(() => this.flush(), this.lastAt + this.windowMs - now);
    }
  }

  dispose(): void {
    this.cancel?.();
    this.cancel = undefined;
    this.held = 0;
  }

  private flush(): void {
    this.cancel = undefined;
    if (this.held === 0) return;
    this.held = 0;
    this.said(this.options.now(), this.options.summary(this.options.people()));
  }

  private said(now: number, text: string): void {
    this.lastAt = now;
    this.options.say(text);
  }
}
