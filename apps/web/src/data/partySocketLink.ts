import type { Connect } from "./realtimeChannel";
import type { RealtimeTarget } from "./realtimeTarget";

/** The browser's way to reach a campfire: a PartySocket, loaded on first use because drawing the scene does not need it. */
export function partySocketLink({ host, protocol }: RealtimeTarget): Connect {
  return async (room, handlers) => {
    const { PartySocket } = await import("partysocket");
    // It does not reconnect by itself: the channel decides when to sit down again.
    const socket = new PartySocket({ host, protocol, party: "campfire", room, maxRetries: 0 });
    socket.addEventListener("open", () => handlers.open());
    socket.addEventListener("error", () => handlers.error());
    socket.addEventListener("message", (message) => handlers.message(message.data));
    socket.addEventListener("close", () => handlers.close());
    return { send: (data) => socket.send(data), close: () => socket.close() };
  };
}
