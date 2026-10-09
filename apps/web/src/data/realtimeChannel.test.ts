import { describe, expect, it } from "vitest";
import { RealtimeChannel, type ChannelEvent, type ChannelTiming } from "./realtimeChannel";
import { FakeCampfires, later } from "./fakeCampfires";

const FAST: ChannelTiming = {
  maxFires: 5,
  connectTimeoutMs: 80,
  rejoinBaseMs: 10,
  rejoinCapMs: 30,
};

function setup(timing: ChannelTiming = FAST) {
  const campfires = new FakeCampfires();
  const channel = new RealtimeChannel(campfires.connect, timing);
  const events: ChannelEvent[] = [];
  channel.subscribe((event) => events.push(event));
  return { campfires, channel, events };
}

describe("RealtimeChannel", () => {
  it("sits at the first campfire and lets listeners know before the caller does", async () => {
    const { channel, events } = setup();
    let seenWhenResolved = 0;
    const outcome = await channel.join("fox").then((value) => {
      seenWhenResolved = events.length;
      return value;
    });
    expect(outcome).toBe("seated");
    expect(seenWhenResolved).toBe(1);
    expect(events[0]?.type).toBe("welcome");
    expect(channel.connected).toBe(true);
  });

  it("moves on to the next campfire when one is full", async () => {
    const { campfires, channel } = setup();
    campfires.fill("fogata-1", 7);
    expect(await channel.join()).toBe("seated");
    expect(campfires.people("fogata-1")).toHaveLength(7);
    expect(campfires.people("fogata-2")).toHaveLength(1);
  });

  it("says full when every campfire is", async () => {
    const { campfires, channel } = setup({ ...FAST, maxFires: 2 });
    campfires.fill("fogata-1", 7);
    campfires.fill("fogata-2", 7);
    expect(await channel.join()).toBe("full");
    expect(channel.connected).toBe(false);
  });

  it("reports an unreachable server, whether it refuses or says nothing", async () => {
    const refusing = setup();
    refusing.campfires.unreachable = true;
    expect(await refusing.channel.join()).toBe("unreachable");

    const silent = new RealtimeChannel(() => new Promise(() => {}), FAST);
    expect(await silent.join()).toBe("unreachable");
  });

  it("opens one connection for two requests at once", async () => {
    const { campfires, channel } = setup();
    const [a, b] = await Promise.all([channel.join(), channel.join()]);
    expect([a, b]).toEqual(["seated", "seated"]);
    expect(campfires.people("fogata-1")).toHaveLength(1);
  });

  it("sits down again after a drop, as the same animal", async () => {
    const { campfires, channel, events } = setup();
    channel.rejoinWith(() => "owl");
    await channel.join("owl");
    const [first] = campfires.connectionIds("fogata-1");
    campfires.drop("fogata-1", first!);
    await later(5);
    expect(events.some((event) => event.type === "dropped")).toBe(true);
    expect(channel.connected).toBe(false);
    await later(60);
    expect(channel.connected).toBe(true);
    expect(events.filter((event) => event.type === "welcome")).toHaveLength(2);
    expect(campfires.people("fogata-1").map((person) => person.species)).toEqual(["owl"]);
  });

  it("keeps trying while the server is out of reach, and sits down when it is back", async () => {
    const { campfires, channel } = setup();
    await channel.join();
    campfires.unreachable = true;
    campfires.drop("fogata-1", campfires.connectionIds("fogata-1")[0]!);
    await later(120);
    expect(channel.connected).toBe(false);
    campfires.unreachable = false;
    await later(120);
    expect(channel.connected).toBe(true);
  });

  it("does not sit down again after the visitor leaves, even if closing reports at once", async () => {
    const { campfires, channel, events } = setup();
    await channel.join();
    channel.leave();
    await later(80);
    expect(channel.connected).toBe(false);
    expect(events.some((event) => event.type === "dropped")).toBe(false);
    expect(campfires.people("fogata-1")).toHaveLength(0);
  });

  it("does not leave a seat taken when the visitor leaves while sitting down again", async () => {
    const { campfires, channel } = setup();
    await channel.join();
    campfires.drop("fogata-1", campfires.connectionIds("fogata-1")[0]!);
    await later(12); // the rejoin is under way
    channel.leave();
    await later(100);
    expect(channel.connected).toBe(false);
    expect(campfires.people("fogata-1")).toHaveLength(0);
  });

  it("sends what it is told, and nothing when it is not seated", async () => {
    const { campfires, channel } = setup();
    channel.send({ type: "ping" });
    expect(campfires.received).toHaveLength(0);
    await channel.join();
    channel.send({ type: "ping" });
    expect(campfires.received.map((line) => JSON.parse(line.data).type)).toEqual(["join", "ping"]);
  });
});
