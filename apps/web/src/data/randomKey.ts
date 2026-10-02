/**
 * A secret key for the visitor: 128 random bits as hex. `crypto.randomUUID` only exists on secure origins (https or
 * localhost), so it is not used: opening the page from a phone on the local network is plain http, and
 * `getRandomValues` works there too.
 */
export function randomKey(crypto: Pick<Crypto, "getRandomValues"> = globalThis.crypto): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
