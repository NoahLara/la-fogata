import { describe, expect, it } from "vitest";
import { createRandom } from "@/scene/random";
import { MemoryFire } from "./memoryFire";
import { TestDistantFires, TestPetitions, TestPresence } from "./testing";
import { MemoryKeyStore } from "./keyStore";
import { PETITION_ANSWER_MAX_LENGTH, PETITION_MAX_LENGTH, PRAYERS_PER_SESSION } from "./limits";
import type { PresenceEvent } from "./types";

function presence(seatCount = 7) {
  return new TestPresence({ seatCount, rand: createRandom(1) });
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
    const service = new TestPresence({
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
    const fire = new MemoryFire({ presence: people });
    return { people, fire };
  }

  it("does nothing for someone who is not seated", async () => {
    const { fire } = await setup();
    expect(await fire.throwWood()).toEqual({ status: "not-seated" });
  });

  it("lets the visitor throw as often as they like and tells the room", async () => {
    const { people, fire } = await setup();
    const me = await people.join();
    const seen: string[] = [];
    fire.subscribe((event) => {
      if (event.type === "wood") seen.push(event.by);
    });
    expect(await fire.throwWood()).toEqual({ status: "thrown" });
    expect(await fire.throwWood()).toEqual({ status: "thrown" });
    expect(await fire.throwWood()).toEqual({ status: "thrown" });
    expect(seen).toEqual([me?.id, me?.id, me?.id]);
  });
});

/** Plain, varied text of exactly this many characters. */
function prose(length: number): string {
  const sentences = [
    "Pido por mi familia y por quienes hoy no tienen quien los escuche.",
    "Quiero dormir en paz, sin miedo al mañana ni a lo que no puedo cambiar.",
    "Que mi hermano encuentre trabajo y que mi madre se recupere pronto.",
    "Gracias por esta noche tranquila, por el fuego y por la compañía.",
    "Necesito fuerzas para perdonar y ganas de empezar de nuevo.",
    "Que cada persona que llega cansada encuentre calor y descanso aquí.",
  ];
  let text = "";
  for (let i = 0; text.length < length; i++) text += `${sentences[i % sentences.length]} `;
  return text.slice(0, length);
}

function petitions(
  overrides: {
    now?: () => number;
    prayersPerSession?: number;
    keys?: MemoryKeyStore;
  } = {},
) {
  let id = 0;
  let clock = 1_000_000;
  const service = new TestPetitions({
    now: overrides.now ?? (() => clock),
    rand: createRandom(7),
    keys: overrides.keys ?? new MemoryKeyStore(),
    newId: () => `p${id++}`,
    newKey: () => "secret",
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
    expect((await service.create(prose(PETITION_MAX_LENGTH))).status).toBe("created");
  });

  it("does not take insults, swearing or nothing readable, and says why", async () => {
    const { service } = petitions();
    expect(await service.create("eres un hijo de puta")).toEqual({
      status: "rejected",
      reason: "offensive",
    });
    expect(await service.create("h i j o  d e  p u t a")).toEqual({
      status: "rejected",
      reason: "offensive",
    });
    expect(await service.create("123456789")).toEqual({ status: "rejected", reason: "no-words" });
    expect(await service.create("!!!!!!!!")).toEqual({ status: "rejected", reason: "no-words" });
    expect(await service.create("asdfasdfasdf")).toEqual({
      status: "rejected",
      reason: "gibberish",
    });
    // None of them used up the day's petition.
    expect((await service.create("Por mi mamá, que está enferma")).status).toBe("created");
  });

  it("shows the help screen, not a refusal, to someone at risk whose words are rough", async () => {
    const { service } = petitions();
    expect((await service.create("quiero morir, todo es una mierda")).status).toBe("risk");
  });

  it("has no limit on how many a person may leave, in a day or in all", async () => {
    const { service } = petitions();
    for (let n = 1; n <= 40; n++) {
      expect((await service.create(`petición ${n}`)).status).toBe("created");
    }
    expect(await service.mine()).toHaveLength(40);
  });

  it("accepts two characters and rejects one", async () => {
    const { service } = petitions();
    expect((await service.create("a")).status).toBe("empty");
    expect((await service.create("Fe")).status).toBe("created");
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

  it("never saves an answer with signs of risk", async () => {
    const { service } = petitions();
    const created = await service.create("por mi familia");
    if (created.status !== "created") throw new Error("expected a created petition");
    expect((await service.answer(created.petition.id, "quiero quitarme la vida")).status).toBe(
      "risk",
    );
    expect((await service.mine())[0]?.answered).toBeFalsy();
  });

  it("dates a petition with the day it was written and, later, the day it was answered", async () => {
    const { service } = petitions();
    const created = await service.create("una carta larga");
    if (created.status !== "created") throw new Error("expected a created petition");
    expect(created.petition.createdOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const answered = await service.answer(created.petition.id, "así fue");
    if (answered.status !== "answered") throw new Error("expected an answered petition");
    expect(answered.petition.answered?.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Only the day is given to read: nothing else about when, and nothing about who.
    expect(Object.keys(answered.petition).sort()).toEqual(
      ["answered", "createdAt", "createdOn", "id", "mine", "prayed", "prayers", "text"].sort(),
    );
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
    expect(
      (await service.answer(created.petition.id, "a".repeat(PETITION_ANSWER_MAX_LENGTH + 1)))
        .status,
    ).toBe("too-long");
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

  it("lets the author leave another straight after returning one to the fire", async () => {
    const { service } = petitions();
    const created = await service.create("uno");
    if (created.status !== "created") throw new Error("not created");
    await service.remove(created.petition.id);
    expect((await service.create("dos")).status).toBe("created");
  });

  it("can remove its own petition however long ago it was written", async () => {
    const { service, advance } = petitions();
    const created = await service.create("uno");
    if (created.status !== "created") throw new Error("not created");
    advance(5 * 365 * 24 * 60 * 60 * 1000);
    expect((await service.remove(created.petition.id)).status).toBe("removed");
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

describe("MemoryPetitions: no expiry", () => {
  const YEAR = 365 * 24 * 60 * 60 * 1000;

  it("keeps every petition in the sky, and answered ones too, however much time goes by", async () => {
    const { service, advance } = petitions();
    const first = await service.create("una");
    const other = service.seedOther("ajena");
    if (first.status !== "created") throw new Error("not created");
    advance(40 * 24 * 60 * 60 * 1000);
    await service.answer(first.petition.id, "Se dio");
    advance(3 * YEAR);
    expect((await service.sky()).map((petition) => petition.text).sort()).toEqual(["ajena", "una"]);
    expect((await service.mine()).map((petition) => petition.text)).toEqual(["una"]);
    expect((await service.pray(other.id)).status).toBe("prayed");
  });

  it("lets the author answer a petition long after it was written", async () => {
    const { service, advance } = petitions();
    const created = await service.create("uno");
    if (created.status !== "created") throw new Error("not created");
    advance(2 * YEAR);
    expect((await service.answer(created.petition.id, "Se dio")).status).toBe("answered");
  });

  it("lets someone else report an old petition", async () => {
    const { service, advance } = petitions();
    const other = service.seedOther("ajena");
    advance(2 * YEAR);
    expect((await service.report(other.id)).status).toBe("reported");
  });
});

describe("MemoryPresence animals", () => {
  const withOwl = () =>
    new TestPresence({
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
      const service = new TestPresence({
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
    expect(new TestDistantFires().fires()).toEqual([]);
  });

  it("lists the campfires it is told about and tells listeners", () => {
    const service = new TestDistantFires();
    const seen: number[] = [];
    const stop = service.subscribe((fires) => seen.push(fires.length));
    service.light(3);
    service.light(5);
    service.putOutLast();
    stop();
    service.light(2);
    expect(seen).toEqual([1, 2, 1]);
    expect(service.fires().map((fire) => fire.people)).toEqual([3, 2]);
    expect(new Set(service.fires().map((fire) => fire.id)).size).toBe(2);
    service.setFires([]);
    expect(service.fires()).toEqual([]);
  });
});

describe("MemoryPetitions: one counter for waiting and answered stars", () => {
  it("lets the visitor be with a waiting star and an answered one, once each", async () => {
    const { service } = petitions();
    const waiting = service.seedOther("espera", { prayers: 1 });
    const answered = service.seedOther("respondida", { prayers: 4, answered: "pasó así" });
    expect(await service.pray(waiting.id)).toEqual({ status: "prayed", prayers: 2 });
    expect(await service.pray(answered.id)).toEqual({ status: "prayed", prayers: 5 });
    expect(await service.pray(answered.id)).toEqual({ status: "already-prayed", prayers: 5 });
  });

  it("has nobody be with their own star", async () => {
    const { service } = petitions();
    const made = await service.create("Paz");
    if (made.status !== "created") throw new Error("not created");
    expect((await service.pray(made.petition.id)).status).toBe("own");
  });
});

describe("MemoryPetitions: reporting", () => {
  it("hides the reported star from the sky, saves the report and says so", async () => {
    const { service } = petitions();
    const other = service.seedOther("ajena");
    const keep = service.seedOther("otra");
    const events: string[] = [];
    service.subscribe((event) => events.push(event.type));
    expect(await service.report(other.id)).toEqual({ status: "reported" });
    expect((await service.sky()).map((p) => p.id)).toEqual([keep.id]);
    expect(service.reportedIds()).toEqual([other.id]);
    expect(events).toEqual(["hidden"]);
  });

  it("stops being with a reported star, and can't report what isn't there", async () => {
    const { service } = petitions();
    const other = service.seedOther("ajena");
    await service.report(other.id);
    expect((await service.pray(other.id)).status).toBe("not-found");
    expect((await service.report("nope")).status).toBe("not-found");
  });

  it("never lets the visitor report their own star", async () => {
    const { service } = petitions();
    const made = await service.create("Paz");
    if (made.status !== "created") throw new Error("not created");
    expect(await service.report(made.petition.id)).toEqual({ status: "own" });
    expect((await service.mine()).map((p) => p.id)).toEqual([made.petition.id]);
  });
});

describe("MemoryPetitions: someone is with the visitor's star", () => {
  it("counts the company and tells listeners, for the visitor's own star only", async () => {
    const { service } = petitions();
    const made = await service.create("Paz");
    if (made.status !== "created") throw new Error("not created");
    const other = service.seedOther("ajena");
    const events: { type: string; prayers?: number }[] = [];
    service.subscribe((event) => {
      events.push({
        type: event.type,
        ...("petition" in event ? { prayers: event.petition.prayers } : {}),
      });
    });
    expect(service.simulateAccompany(made.petition.id)).toBe(true);
    expect(service.simulateAccompany(other.id)).toBe(false);
    expect(events).toEqual([{ type: "accompanied", prayers: 1 }]);
  });
});

describe("MemoryPetitions: a sky as wide as the panorama", () => {
  it("shows as many petitions as the limit says, fewest prayers first", async () => {
    const { service } = petitions();
    for (let i = 0; i < 10; i++) service.seedOther(`p${i}`, { prayers: 10 - i });
    const sky = await service.sky(4);
    expect(sky).toHaveLength(4);
    expect(sky.map((p) => p.prayers)).toEqual([1, 2, 3, 4]);
  });
});
