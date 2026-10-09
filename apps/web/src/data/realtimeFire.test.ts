import { describe, expect, it } from "vitest";
import { FUEL } from "@fogata/shared";
import { FakeCampfires, later } from "./fakeCampfires";
import { RealtimeChannel, type ChannelTiming } from "./realtimeChannel";
import { RealtimeFire } from "./realtimeFire";
import { RealtimePresence } from "./realtimePresence";
import type { FireEvent } from "./types";

const FAST: ChannelTiming = {
  maxFires: 5,
  connectTimeoutMs: 80,
  rejoinBaseMs: 10,
  rejoinCapMs: 30,
};

function visitor(campfires: FakeCampfires) {
  const channel = new RealtimeChannel(campfires.connect, FAST);
  const presence = new RealtimePresence({ channel, seatCount: 7, rand: Math.random });
  const fire = new RealtimeFire({ channel, presence });
  const seen: FireEvent[] = [];
  fire.subscribe((event) => seen.push(event));
  return { presence, fire, seen };
}

describe("RealtimeFire", () => {
  it("shows the visitor's own log at once, before the campfire has said anything", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    await a.presence.join();
    a.seen.length = 0;
    expect(await a.fire.throwWood()).toEqual({ status: "thrown" });
    expect(a.seen).toEqual([{ type: "wood", by: a.presence.self?.id }]);
  });

  it("does not play the visitor's own log twice when the campfire echoes it", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    await a.presence.join();
    a.seen.length = 0;
    await a.fire.throwWood();
    await later();
    expect(a.seen.filter((event) => event.type === "wood")).toHaveLength(1);
  });

  it("shows the others a log with the fire's fuel", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.presence.join();
    await b.presence.join();
    b.seen.length = 0;
    await a.fire.throwWood();
    await later();
    expect(b.seen).toEqual([{ type: "wood", by: a.presence.self?.id, fuel: FUEL.logFuel }]);
  });

  it("keeps one fuel for the whole campfire, whoever throws", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.presence.join();
    await b.presence.join();
    a.seen.length = 0;
    b.seen.length = 0;
    await a.fire.throwWood();
    await later();
    await b.fire.throwWood();
    await later();
    const fromA = a.seen.find((event) => event.type === "wood" && event.fuel !== undefined);
    expect(fromA && fromA.type === "wood" && fromA.fuel).toBeCloseTo(2 * FUEL.logFuel, 2);
  });

  it("tells a newcomer how much fuel the fire has", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    await a.presence.join();
    for (let i = 0; i < 3; i++) await a.fire.throwWood();
    await later();
    const late = visitor(campfires);
    await late.presence.join();
    const sync = late.seen.find((event) => event.type === "fuel");
    expect(sync && sync.type === "fuel" && sync.fuel).toBeCloseTo(3 * FUEL.logFuel, 2);
  });

  it("gives a fresh campfire no fuel", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    await a.presence.join();
    expect(a.seen).toContainEqual({ type: "fuel", fuel: 0 });
  });

  it("does nothing for someone who is not seated", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    expect(await a.fire.throwWood()).toEqual({ status: "not-seated" });
    expect(a.seen).toEqual([]);
  });

  it("still shows the visitor's log when the server cannot be reached", async () => {
    const campfires = new FakeCampfires();
    campfires.unreachable = true;
    const a = visitor(campfires);
    await a.presence.join();
    expect(await a.fire.throwWood()).toEqual({ status: "thrown" });
    expect(a.seen).toEqual([{ type: "wood", by: a.presence.self?.id }]);
  });

  it("does not pass a log from someone who is not at this campfire", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.presence.join();
    await b.presence.join();
    b.seen.length = 0;
    b.presence.leave();
    await later();
    await a.fire.throwWood();
    await later();
    expect(b.seen).toEqual([]);
  });
});
