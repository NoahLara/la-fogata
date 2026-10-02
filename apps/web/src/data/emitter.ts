import type { Unsubscribe } from "./types";

/** A minimal list of listeners for one kind of event. */
export class Emitter<E> {
  private readonly listeners = new Set<(event: E) => void>();

  subscribe(listener: (event: E) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: E): void {
    for (const listener of [...this.listeners]) listener(event);
  }
}
