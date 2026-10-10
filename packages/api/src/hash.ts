/** What a hash of a person's key is used for: the same key gives a different hash for each, so none can be joined to another. */
export type KeyPurpose = "owner" | "prayer" | "report";

/**
 * A hash of the secret key a browser keeps, for one purpose. The key is 128 random bits, so the hash cannot be turned
 * back into it; and a hash made for one purpose says nothing about the same person's hash for another.
 */
export async function hashKey(key: string, purpose: KeyPurpose): Promise<string> {
  const bytes = new TextEncoder().encode(`fogata:${purpose}:${key}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
