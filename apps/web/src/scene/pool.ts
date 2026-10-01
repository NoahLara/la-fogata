export interface Pool<T> {
  /** A released item if there is one, otherwise a new one. `isNew` tells which. */
  acquire(): { item: T; isNew: boolean };
  /** Hands an item back for reuse. Releasing the same item twice would hand it out twice. */
  release(item: T): void;
}

/** Reuses items that come and go constantly, so they are not allocated and destroyed every time. */
export function createPool<T>(create: () => T): Pool<T> {
  const free: T[] = [];
  return {
    acquire() {
      const item = free.pop();
      return item === undefined ? { item: create(), isNew: true } : { item, isNew: false };
    },
    release(item) {
      free.push(item);
    },
  };
}
