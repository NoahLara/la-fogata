import { describe, expect, it } from "vitest";
import { createRandom } from "@/scene/random";
import { MemoryDistantFires } from "./memoryDistantFires";
import { MemoryFire } from "./memoryFire";
import { MemoryPetitions } from "./memoryPetitions";
import { MemoryPresence } from "./memoryPresence";
import { MemoryKeyStore } from "./keyStore";
import { DAY, PETITION_MAX_LENGTH, petitionAvailableAt, PRAYERS_PER_SESSION } from "./limits";
import type { PresenceEvent } from "./types";

function presence(seatCount = 7) {
  return new MemoryPresence({ seatCount, rand: createRandom(1) });
}

describe("MemoryPresence", () => {
  it("sits the visitor at a free seat and tells listeners", async () => {
    const service = presence();
    const events: PresenceEvent[] = [];
    service.subscribe((event) => events.push(event));
    const me = await service.join();
    expect(me).toBeDefined();
    expect(service.self).toEqual(me);
    expect(events).toEqual([{ type: "joined", person: me }]);
  });

  it("joining twice does not seat them twice", async () => {
    const service = presence();
    await service.join();
    await service.join();
    expect(service.people()).toHaveLength(1);
  });

  it("never gives two people the same seat, and gives free animals first", async () => {
    const service = presence();
    await service.join();
    for (let i = 0; i < 6; i++) service.addPeer();
    const people = service.people();
    expect(new Set(people.map((person) => person.seat)).size).toBe(7);
    expect(new Set(people.map((person) => person.species)).size).toBe(7);
    expect(service.addPeer()).toBeUndefined();
  });

  it("has no room for the visitor when every seat is taken", async () => {
    const service = new MemoryPresence({
      seatCount: 1,
      rand: createRandom(1),
      initial: [{ id: "a", species: "fox", seat: 0 }],
    });
    expect(await service.join()).toBeUndefined();
    expect(service.self).toBeUndefined();
  });

  it("frees the seat when the visitor leaves, and can't send the visitor away as a peer", async () => {
    const service = presence();
    const me = await service.join();
    service.removePeer(me?.id ?? "");
    expect(service.people()).toHaveLength(1);
    service.leave();
    expect(service.people()).toHaveLength(0);
    expect(service.self).toBeUndefined();
  });

  it("stops telling a listener that unsubscribed", async () => {
    const service = presence();
    const events: PresenceEvent[] = [];
    const stop = service.subscribe((event) => events.push(event));
    stop();
    await service.join();
    expect(events).toEqual([]);
  });
});

describe("MemoryFire", () => {
  async function setup() {
    const people = presence();
    let now = 0;
    const fire = new MemoryFire({ presence: people, now: () => now });
    return { people, fire, advance: (seconds: number) => (now += seconds) };
  }

  it("does nothing for someone who is not seated", async () => {
    const { fire } = await setup();
    expect(await fire.throwWood()).toEqual({ status: "not-seated" });
  });

  it("lets the visitor throw once a minute and tells the room", async () => {
    const { people, fire, advance } = await setup();
    const me = await people.join();
    const seen: string[] = [];
    fire.subscribe((event) => seen.push(event.by));
    expect(await fire.throwWood()).toEqual({ status: "thrown" });
    advance(20);
    expect(await fire.throwWood()).toEqual({ status: "cooling", secondsLeft: 40 });
    expect(fire.woodCooldown()).toBe(40);
    advance(40);
    expect(await fire.throwWood()).toEqual({ status: "thrown" });
    expect(seen).toEqual([me?.id, me?.id]);
  });
});

function petitions(
  overrides: {
    now?: () => number;
    prayersPerSession?: number;
    petitionsPerDay?: number;
    keys?: MemoryKeyStore;
  } = {},
) {
  let id = 0;
  let clock = 1_000_000;
  const service = new MemoryPetitions({
    now: overrides.now ?? (() => clock),
    rand: createRandom(7),
    keys: overrides.keys ?? new MemoryKeyStore(),
    newId: () => `p${id++}`,
    newKey: () => "secret",
    ...(overrides.petitionsPerDay ? { petitionsPerDay: overrides.petitionsPerDay } : {}),
    ...(overrides.prayersPerSession ? { prayersPerSession: overrides.prayersPerSession } : {}),
  });
  return { service, advance: (ms: number) => (clock += ms) };
}

describe("MemoryPetitions: writing", () => {
  it("creates a petition that is the visitor's, without exposing the key", async () => {
    const { service } = petitions();
    const result = await service.create("  Por mi mamá  ");
    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.petition).toMatchObject({ text: "Por mi mamá", prayers: 0, mine: true });
    expect(JSON.stringify(result.petition)).not.toContain("secret");
  });

  it("rejects empty and too long petitions", async () => {
    const { service } = petitions();
    expect((await service.create("   ")).status).toBe("empty");
    expect((await service.create("a".repeat(PETITION_MAX_LENGTH + 1))).status).toBe("too-long");
    expect((await service.create("a".repeat(PETITION_MAX_LENGTH))).status).toBe("created");
  });

  it("allows one a day", async () => {
    const { service, advance } = petitions();
    await service.create("uno");
    expect((await service.create("dos")).status).toBe("daily-limit");
    advance(DAY + 1);
    expect((await service.create("dos")).status).toBe("created");
  });

  it("accepts two characters and rejects one", async () => {
    const { service } = petitions();
    expect((await service.create("a")).status).toBe("empty");
    expect((await service.create("Fe")).status).toBe("created");
  });

  it("says when the daily limit has been reached", async () => {
    const { service, advance } = petitions();
    expect(await service.dailyLimitReached()).toBe(false);
    await service.create("uno");
    expect(await service.dailyLimitReached()).toBe(true);
    advance(DAY + 1);
    expect(await service.dailyLimitReached()).toBe(false);
  });

  it("has no daily limit when development lifts it", async () => {
    const { service } = petitions({ petitionsPerDay: Infinity });
    for (const text of ["uno", "dos", "tres"]) {
      expect((await service.create(text)).status).toBe("created");
    }
    expect(await service.dailyLimitReached()).toBe(false);
  });

  it("tells the visitor's petitions from others' by the key kept in the browser", async () => {
    const keys = new MemoryKeyStore();
    const { service } = petitions({ keys });
    const other = service.seedOther("de otra persona");
    const created = await service.create("mía");
    expect(keys.get()).toBe("secret");
    const mine = await service.mine();
    expect(mine.map((petition) => petition.text)).toEqual(["mía"]);
    expect(other.mine).toBe(false);
    // Without the key, nothing is theirs.
    const stranger = petitions({ keys: new MemoryKeyStore() }).service;
    expect(await stranger.mine()).toEqual([]);
    expect(created.status).toBe("created");
  });

  it("never publishes a petition with signs of risk", async () => {
    const { service } = petitions();
    expect((await service.create("quiero quitarme la vida")).status).toBe("risk");
    expect(await service.sky()).toHaveLength(0);
    // A rejected petition does not use up the day.
    expect((await service.create("por mi familia")).status).toBe("created");
  });

  it("lists the visitor's own petitions only", async () => {
    const { service } = petitions();
    service.seedOther("de otra persona");
    await service.create("mía");
    expect((await service.mine()).map((petition) => petition.text)).toEqual(["mía"]);
    expect(await service.sky()).toHaveLength(2);
  });

  it("tells listeners about new petitions", async () => {
    const { service } = petitions();
    const types: string[] = [];
    service.subscribe((event) => types.push(event.type));
    await service.create("hola");
    expect(types).toEqual(["added"]);
  });
});

describe("MemoryPetitions: answering", () => {
  it("lets the author mark it answered, with an optional line, and tells everyone", async () => {
    const { service } = petitions();
    const created = await service.create("sanar");
    if (created.status !== "created") throw new Error("not created");
    const types: string[] = [];
    service.subscribe((event) => types.push(event.type));
    const result = await service.answer(created.petition.id, "  Ya estoy mejor  ");
    expect(result.status).toBe("answered");
    if (result.status === "answered") expect(result.petition.answered?.note).toBe("Ya estoy mejor");
    expect(types).toEqual(["answered"]);
    expect((await service.answer(created.petition.id, "otra")).status).toBe("already-answered");
  });

  it("needs a line that says how it happened", async () => {
    const { service } = petitions();
    const created = await service.create("sanar");
    if (created.status !== "created") throw new Error("not created");
    const events: string[] = [];
    service.subscribe((event) => events.push(event.type));
    expect((await service.answer(created.petition.id, "")).status).toBe("note-required");
    expect((await service.answer(created.petition.id, "   ")).status).toBe("note-required");
    expect((await service.answer(created.petition.id, "a".repeat(141))).status).toBe("too-long");
    expect(events).toEqual([]);
    expect((await service.mine())[0]?.answered).toBeUndefined();
  });

  it("is only for the author", async () => {
    const { service } = petitions();
    const other = service.seedOther("ajena");
    expect((await service.answer(other.id, "x")).status).toBe("not-yours");
    expect((await service.answer("nope", "x")).status).toBe("not-found");
  });
});

describe("MemoryPetitions: returning to the fire", () => {
  it("lets the author remove it, tells everyone and drops it from the sky", async () => {
    const { service } = petitions();
    const created = await service.create("sanar");
    if (created.status !== "created") throw new Error("not created");
    const events: string[] = [];
    service.subscribe((event) =>
      events.push(event.type === "removed" ? `removed ${event.id}` : event.type),
    );
    expect(await service.remove(created.petition.id)).toEqual({ status: "removed" });
    expect(events).toEqual([`removed ${created.petition.id}`]);
    expect(await service.mine()).toEqual([]);
    expect(await service.sky()).toEqual([]);
    expect((await service.remove(created.petition.id)).status).toBe("not-found");
  });

  it("is only for the author, and leaves other people's petitions alone", async () => {
    const { service } = petitions();
    const other = service.seedOther("ajena");
    expect((await service.remove(other.id)).status).toBe("not-yours");
    expect((await service.remove("nope")).status).toBe("not-found");
    expect(await service.sky()).toHaveLength(1);
  });

  it("keeps the day's petition used", async () => {
    const { service, advance } = petitions();
    const created = await service.create("uno");
    if (created.status !== "created") throw new Error("not created");
    await service.remove(created.petition.id);
    expect(await service.dailyLimitReached()).toBe(true);
    expect((await service.create("dos")).status).toBe("daily-limit");
    advance(DAY + 1);
    expect((await service.create("dos")).status).toBe("created");
  });

  it("can't remove an answered petition that has expired", async () => {
    const { service, advance } = petitions();
    const created = await service.create("uno");
    if (created.status !== "created") throw new Error("not created");
    advance(31 * DAY);
    expect((await service.remove(created.petition.id)).status).toBe("not-found");
  });
});

describe("MemoryPetitions: prayers", () => {
  it("counts a prayer once per person per petition", async () => {
    const { service } = petitions();
    const other = service.seedOther("ajena", { prayers: 2 });
    expect(await service.pray(other.id)).toEqual({ status: "prayed", prayers: 3 });
    expect(await service.pray(other.id)).toEqual({ status: "already-prayed", prayers: 3 });
    const [seen] = await service.sky();
    expect(seen).toMatchObject({ prayers: 3, prayed: true });
  });

  it("limits prayer taps per session", async () => {
    const { service } = petitions({ prayersPerSession: 2 });
    const ids = [1, 2, 3].map((n) => service.seedOther(`p${n}`).id);
    expect((await service.pray(ids[0] ?? "")).status).toBe("prayed");
    expect((await service.pray(ids[1] ?? "")).status).toBe("prayed");
    expect((await service.pray(ids[2] ?? "")).status).toBe("rate-limited");
    expect(PRAYERS_PER_SESSION).toBeGreaterThan(2);
  });

  it("cannot pray for what does not exist", async () => {
    const { service } = petitions();
    expect((await service.pray("nope")).status).toBe("not-found");
  });
});

describe("MemoryPetitions: expiry", () => {
  it("drops a petition after 30 days, but keeps an answered one 30 more", async () => {
    const { service, advance } = petitions();
    const first = await service.create("una");
    const old = service.seedOther("vieja");
    if (first.status !== "created") throw new Error("not created");
    advance(20 * DAY);
    await service.answer(first.petition.id, "Se dio");
    // 45 days after it was written, but only 25 after it was answered.
    advance(25 * DAY);
    const texts = (await service.sky()).map((petition) => petition.text);
    expect(texts).toEqual(["una"]);
    expect((await service.pray(old.id)).status).toBe("not-found");
    advance(6 * DAY);
    expect(await service.sky()).toHaveLength(0);
  });
});

describe("petitionAvailableAt", () => {
  const now = 10 * DAY;

  it("is now when nothing was left in the last day", () => {
    expect(petitionAvailableAt([], now)).toBe(now);
    expect(petitionAvailableAt([now - DAY - 1], now)).toBe(now);
  });

  it("is a day after the one left", () => {
    expect(petitionAvailableAt([now - 1000], now)).toBe(now - 1000 + DAY);
  });

  it("never waits when there is no limit", () => {
    expect(petitionAvailableAt([now - 1, now - 2, now - 3], now, Infinity)).toBe(now);
  });

  it("waits for the right one to age out when more are allowed", () => {
    expect(petitionAvailableAt([now - 3000, now - 1000], now, 2)).toBe(now - 3000 + DAY);
  });
});

describe("MemoryPresence animals", () => {
  const withOwl = () =>
    new MemoryPresence({
      seatCount: 7,
      rand: createRandom(5),
      initial: [{ id: "other", species: "owl", seat: 0 }],
    });

  it("gives the preferred animal when it is free", async () => {
    for (const species of ["fox", "cat", "bear"] as const) {
      expect((await withOwl().join(species))?.species).toBe(species);
    }
  });

  it("gives a free animal when the preferred one is taken here", async () => {
    const me = await withOwl().join("owl");
    expect(me).toBeDefined();
    expect(me?.species).not.toBe("owl");
  });

  it("gives a free animal when there is no preference (a first visit)", async () => {
    for (let seed = 1; seed <= 20; seed++) {
      const service = new MemoryPresence({
        seatCount: 7,
        rand: createRandom(seed),
        initial: [{ id: "other", species: "owl", seat: 0 }],
      });
      expect((await service.join())?.species).not.toBe("owl");
    }
  });

  it("swaps the visitor's animal in the same seat and tells listeners", async () => {
    const service = withOwl();
    const me = await service.join("fox");
    const events: PresenceEvent[] = [];
    service.subscribe((event) => events.push(event));
    const result = await service.changeSpecies("rabbit");
    expect(result).toEqual({ status: "changed", person: { ...me, species: "rabbit" } });
    expect(events).toEqual([{ type: "changed", person: { ...me, species: "rabbit" } }]);
    expect(service.people().filter((person) => person.species === "rabbit")).toHaveLength(1);
    expect(service.people().some((person) => person.species === "fox")).toBe(false);
  });

  it("refuses an animal somebody else has, and the same animal again", async () => {
    const service = withOwl();
    await service.join("fox");
    const events: PresenceEvent[] = [];
    service.subscribe((event) => events.push(event));
    expect(await service.changeSpecies("owl")).toEqual({ status: "taken" });
    expect(await service.changeSpecies("fox")).toEqual({ status: "unchanged" });
    expect(events).toEqual([]);
  });

  it("cannot swap before sitting down", async () => {
    expect(await withOwl().changeSpecies("cat")).toEqual({ status: "not-seated" });
  });
});

describe("MemoryDistantFires", () => {
  it("starts with no other campfires: nothing is made up", () => {
    expect(new MemoryDistantFires(createRandom(1)).fires()).toEqual([]);
  });

  it("lists demo campfires and tells listeners, and the last one goes out first", () => {
    const service = new MemoryDistantFires(createRandom(1));
    const seen: number[] = [];
    const stop = service.subscribe((fires) => seen.push(fires.length));
    service.addDemo();
    service.addDemo();
    service.removeDemo();
    stop();
    service.addDemo();
    expect(seen).toEqual([1, 2, 1]);
    expect(service.fires()).toHaveLength(2);
    expect(service.fires().every((fire) => fire.people >= 1 && fire.people <= 7)).toBe(true);
    expect(new Set(service.fires().map((fire) => fire.id)).size).toBe(2);
  });
});
