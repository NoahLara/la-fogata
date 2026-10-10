export interface RealtimeTarget {
  /** `host:port` of the realtime server. */
  host: string;
  protocol: "ws" | "wss";
}

const REALTIME_PORT = 8787;

/** Where the server's petitions answer over plain http(s): the same host the campfires are reached at. */
export function apiBase({ host, protocol }: RealtimeTarget): string {
  return `${protocol === "wss" ? "https" : "http"}://${host}`;
}

/**
 * Where the browser finds the realtime server. By default it is the machine that served the page, on the
 * server's port, so a phone that opened `http://192.168.1.20:3000` talks to `192.168.1.20:8787`.
 * `NEXT_PUBLIC_REALTIME_HOST` (`host:port`) overrides it; `NEXT_PUBLIC_REALTIME=off` keeps the visitor alone
 * in the browser.
 */
export function realtimeTarget(
  location: Pick<Location, "hostname" | "protocol">,
): RealtimeTarget | undefined {
  if (process.env.NEXT_PUBLIC_REALTIME === "off") return undefined;
  const host = process.env.NEXT_PUBLIC_REALTIME_HOST || `${location.hostname}:${REALTIME_PORT}`;
  return { host, protocol: location.protocol === "https:" ? "wss" : "ws" };
}
