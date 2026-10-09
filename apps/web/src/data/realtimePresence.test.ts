import { describe, expect, it } from "vitest";
import { RealtimeChannel, type ChannelTiming } from "./realtimeChannel";
import { RealtimePresence } from "./realtimePresence";
import { FakeCampfires, later } from "./fakeCampfires";
import type { PresenceEvent } from "./types";

const FAST: ChannelTiming = {
  maxFires: 5,
  connectTimeoutMs: 80,
  rejoinBaseMs: 10,
  rejoinCapMs: 30,
};

function visitor(campfires: FakeCampfires) {
  return new RealtimePresence({
    channel: new RealtimeChannel(campfires.connect, FAST),
    seatCount: 7,
    rand: Math.random,
  });
}

describe("RealtimePresence", () => {
  it("shows each visitor the other, and flags those who were already there", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.join("fox");
    const seen: PresenceEvent[] = [];
    b.subscribe((event) => seen.push(event));
    await b.join("cat");
    await later();
    expect(a.people()).toHaveLength(2);
    expect(b.people()).toHaveLength(2);
    const joined = seen.filter((event) => event.type === "joined");
    expect(joined.find((event) => event.person.id === b.self?.id)?.already).toBe(false);
    expect(joined.find((event) => event.person.id === a.self?.id)?.already).toBe(true);
  });

  it("gives another animal when the preferred one is taken", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.join("fox");
    expect((await b.join("fox"))?.species).not.toBe("fox");
  });

  it("sends the ninth visitor to another campfire", async () => {
    const campfires = new FakeCampfires();
    const people = Array.from({ length: 8 }, () => visitor(campfires));
    for (const person of people) await person.join();
    await later();
    expect(people[0]?.people()).toHaveLength(7);
    expect(people[7]?.people()).toHaveLength(1);
  });

  it("changes animal, refuses a taken one, and tells the others", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.join("fox");
    await b.join("cat");
    expect((await b.changeSpecies("fox")).status).toBe("taken");
    expect((await b.changeSpecies("cat")).status).toBe("unchanged");
    expect((await b.changeSpecies("owl")).status).toBe("changed");
    await later();
    expect(
      a
        .people()
        .map((person) => person.species)
        .sort(),
    ).toEqual(["fox", "owl"]);
  });

  it("empties the view on a drop and fills it again when it sits down", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.join("fox");
    await b.join("cat");
    await later();
    campfires.drop("fogata-1", campfires.connectionIds("fogata-1")[0]!);
    await later(5);
    expect(a.self).toBeUndefined();
    expect(a.people()).toHaveLength(0);
    expect(b.people()).toHaveLength(1);
    await later(80);
    expect(a.self?.species).toBe("fox");
    expect(a.people()).toHaveLength(2);
    expect(b.people()).toHaveLength(2);
  });

  it("frees the seat on leave and does not come back", async () => {
    const campfires = new FakeCampfires();
    const a = visitor(campfires);
    const b = visitor(campfires);
    await a.join();
    await b.join();
    a.leave();
    await later(80);
    expect(a.self).toBeUndefined();
    expect(b.people()).toHaveLength(1);
  });

  it("sits alone in the browser when the server cannot be reached", async () => {
    const campfires = new FakeCampfires();
    campfires.unreachable = true;
    const a = visitor(campfires);
    const me = await a.join("owl");
    expect(me?.species).toBe("owl");
    expect(a.people()).toHaveLength(1);
    expect((await a.changeSpecies("bear")).status).toBe("changed");
  });
});
