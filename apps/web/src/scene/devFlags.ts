/** Query parameters for looking at the scene during development. They do nothing in a production build. */
export interface DevFlags {
  /** `?animal=<species>`: put this species in every seat. */
  animal?: string;
  /** `?shuffle`: randomize who sits where. */
  shuffle: boolean;
}

/**
 * Reads the development flags from a URL's query string. In production it always returns nothing set, whatever
 * the URL says, so these can never change what a visitor sees. Kept free of PixiJS so any code can import it.
 */
export function readDevFlags(search: string, production: boolean): DevFlags {
  if (production) return { shuffle: false };
  const params = new URLSearchParams(search);
  const animal = params.get("animal");
  return { shuffle: params.has("shuffle"), ...(animal ? { animal } : {}) };
}
