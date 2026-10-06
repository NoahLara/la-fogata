/** Where the visitor's secret key is kept: it is what proves a petition is theirs, since there are no accounts. */
export interface KeyStore {
  get(): string | undefined;
  set(key: string): void;
}

export class MemoryKeyStore implements KeyStore {
  private key: string | undefined;

  get() {
    return this.key;
  }

  set(key: string) {
    this.key = key;
  }
}

const STORAGE_KEY = "fogata.ownerKey";
const KEY_SHAPE = /^[0-9a-f]{32}$/;

/** Keeps the key in the browser's localStorage. Storage can be blocked, so it falls back to memory for the visit. */
export class BrowserKeyStore implements KeyStore {
  private fallback: string | undefined;

  get() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored !== null && KEY_SHAPE.test(stored) ? stored : this.fallback;
    } catch {
      return this.fallback;
    }
  }

  set(key: string) {
    this.fallback = key;
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Blocked: the key lasts as long as this page does.
    }
  }
}
