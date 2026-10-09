import { describe, expect, it } from "vitest";
import { FakeCampfires, later } from "./fakeCampfires";
import { RealtimeChannel, type ChannelTiming } from "./realtimeChannel";
import { RealtimePresence } from "./realtimePresence";
import { RealtimeRituals } from "./realtimeRituals";
import type { RitualEvent } from "./types";

const FAST: ChannelTiming = {
  maxFires: 5,
  connectTimeoutMs: 80,
  rejoinBaseMs: 10,
  rejoinCapMs: 30,
};

function visitor(campfires: FakeCampfires) {
  const channel = new RealtimeChannel(campfires.connect, FAST);
  const presence = new RealtimePresence({ channel, seatCount: 7, rand: Math.random });
  const rituals = new RealtimeRituals(channel);
  const seen: RitualEvent[] = [];
  rituals.subscribe((event) => seen.push(event));
  return { presence, rituals, seen };
}

describe("RealtimeRituals", () => {
  it("shows the others who hands a burden over, and the kind, nothing else", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.presence.join();
    await b.presence.join();
    a.rituals.announce("burden");
    await later();
    expect(b.seen).toEqual([{ type: "ritual", kind: "burden", by: a.presence.self?.id }]);
  });

  it("tells them about a petition the same way", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.presence.join();
    await b.presence.join();
    b.rituals.announce("petition");
    await later();
    expect(a.seen).toEqual([{ type: "ritual", kind: "petition", by: b.presence.self?.id }]);
  });

  it("does not show the visitor their own ritual again", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.presence.join();
    await b.presence.join();
    a.rituals.announce("burden");
    await later();
    expect(a.seen).toEqual([]);
  });

  it("sends only the kind: no text can be part of what travels", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    await a.presence.join();
    a.rituals.announce("burden");
    a.rituals.announce("petition");
    const sent = campfires.received
      .map((line) => JSON.parse(line.data))
      .filter((event) => event.type === "ritual");
    expect(sent).toEqual([
      { type: "ritual", kind: "burden" },
      { type: "ritual", kind: "petition" },
    ]);
  });

  it("only reaches the people at the same campfire", async () => {
    const campfires = new FakeCampfires();
    campfires.fill("fogata-1", 6);
    const a = visitor(campfires);
    const b = visitor(campfires); // the campfire is full for the second: another one
    await a.presence.join();
    await b.presence.join();
    a.rituals.announce("burden");
    await later();
    expect(b.seen).toEqual([]);
  });

  it("says nothing when the visitor is not at a campfire", async () => {
    const campfires = new FakeCampfires();
    campfires.unreachable = true;
    const a = visitor(campfires);
    await a.presence.join();
    a.rituals.announce("burden");
    expect(campfires.received).toEqual([]);
  });

  it("does not pass on a ritual from somebody who never sat down", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    await a.presence.join();
    const stranger = new RealtimeChannel(campfires.connect, FAST);
    stranger.send({ type: "ritual", kind: "burden" });
    await later();
    expect(a.seen).toEqual([]);
  });
});
