// @vitest-environment node
import { createApi } from "@fogata/api";
import { createTestDb } from "@fogata/api/testing";
import { OWNER_KEY_HEADER } from "@fogata/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryKeyStore } from "./keyStore";
import { RemotePetitions } from "./remotePetitions";
import type { PetitionEvent } from "./types";

const BASE = Date.parse("2026-10-10T15:00:00Z");

interface Call {
  method: string;
  path: string;
  body: string | undefined;
  key: string | null;
}

/** The campfire's server, in this process: the real API over a real SQLite, reached the way the browser reaches it. */
function server() {
  const api = createApi({
    db: createTestDb(),
    now: () => BASE,
    newId: (() => {
      let n = 0;
      return () => `p${++n}`;
    })(),
    rand: () => 0.5,
  });
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(String(input), init);
    calls.push({
      method: request.method,
      path: new URL(request.url).pathname + new URL(request.url).search,
      body: init?.body === undefined ? undefined : String(init.body),
      key: request.headers.get(OWNER_KEY_HEADER),
    });
    return (await api(request)) ?? new Response("not here", { status: 404 });
  };
  return { fetcher, calls };
}

let counter = 0;
const nextKey = () => (++counter).toString(16).padStart(32, "0");

/** One visitor: their own browser (so their own key) and a way to the server. */
function visitor(srv: ReturnType<typeof server>, options: { key?: string; prayers?: number } = {}) {
  const keys = new MemoryKeyStore();
  if (options.key) keys.set(options.key);
  const service = new RemotePetitions({
    baseUrl: "https://fogata.test",
    keys,
    newKey: nextKey,
    fetch: srv.fetcher,
    now: () => BASE,
    companyPollMs: 0,
    ...(options.prayers ? { prayersPerSession: options.prayers } : {}),
  });
  const events: PetitionEvent[] = [];
  service.subscribe((event) => events.push(event));
  return { service, keys, events };
}

let srv: ReturnType<typeof server>;
beforeEach(() => {
  srv = server();
  counter = 0;
});

describe("leaving a petition", () => {
  it("is kept on the server, comes back as the visitor's own, and is told to the page", async () => {
    const { service, events, keys } = visitor(srv);
    const result = await service.create("  Por mi mamá, que está enferma ");
    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.petition).toMatchObject({
      text: "Por mi mamá, que está enferma",
      createdOn: "2026-10-10",
      prayers: 0,
      mine: true,
      prayed: false,
    });
    expect(events).toEqual([{ type: "added", petition: result.petition }]);
    expect(keys.get()).toMatch(/^[0-9a-f]{32}$/);
    expect(await service.mine()).toEqual([result.petition]);
  });

  it("lasts: the same browser finds its petitions again, which is what a page that is reloaded does", async () => {
    const first = visitor(srv);
    await first.service.create("Una que dure");
    const again = visitor(srv, { key: first.keys.get() as string });
    const [petition] = await again.service.mine();
    expect(petition).toMatchObject({ text: "Una que dure", mine: true });
  });

  it("does not send a text with signs of risk, or one the filter refuses, or one that is empty or too long", async () => {
    const { service } = visitor(srv);
    expect(await service.create("quiero morir, ya no puedo más")).toEqual({ status: "risk" });
    expect(await service.create("c o m a n   m i e r d a")).toEqual({
      status: "rejected",
      reason: "offensive",
    });
    expect(await service.create("   ")).toEqual({ status: "empty" });
    expect(await service.create("x".repeat(2001))).toEqual({ status: "too-long" });
    // Nothing reached the server: not even a key was asked for.
    expect(srv.calls).toEqual([]);
  });

  it("sends nothing but the text, the day and the key in a header", async () => {
    const { service, keys } = visitor(srv);
    await service.create("Por mi familia");
    const [call] = srv.calls;
    expect(call?.method).toBe("POST");
    expect(call?.path).toBe("/api/petitions");
    expect(JSON.parse(call?.body ?? "{}")).toEqual({ text: "Por mi familia", day: "2026-10-10" });
    expect(call?.key).toBe(keys.get());
    expect(call?.path).not.toContain(keys.get() as string);
    expect(call?.body).not.toContain(keys.get() as string);
  });

  it("has no limit of its own on how many", async () => {
    const { service } = visitor(srv);
    for (let n = 1; n <= 5; n++) {
      expect((await service.create(`Petición número ${n} por la paz`)).status).toBe("created");
    }
    expect(await service.mine()).toHaveLength(5);
  });

  it("says it was not kept when the server cannot be reached, and nothing is invented", async () => {
    const { service, events } = visitor(srv);
    const down = new RemotePetitions({
      baseUrl: "https://fogata.test",
      keys: new MemoryKeyStore(),
      newKey: nextKey,
      fetch: async () => {
        throw new TypeError("network down");
      },
      companyPollMs: 0,
    });
    expect(await down.create("Una que no llega")).toEqual({ status: "unavailable" });
    expect(await down.mine()).toEqual([]);
    expect(await down.sky()).toEqual([]);
    expect(await down.answer("p1", "algo")).toEqual({ status: "unavailable" });
    expect(await down.remove("p1")).toEqual({ status: "unavailable" });
    expect(await down.report("p1")).toEqual({ status: "unavailable" });
    expect(await down.pray("p1")).toEqual({ status: "unavailable" });
    expect(events).toEqual([]);
    expect(await service.sky()).toEqual([]);
  });

  it("treats an answer that is not what was agreed, or an error, as not kept", async () => {
    const odd = (response: () => Response) =>
      new RemotePetitions({
        baseUrl: "https://fogata.test",
        keys: new MemoryKeyStore(),
        newKey: nextKey,
        fetch: async () => response(),
        companyPollMs: 0,
      });
    expect(
      await odd(() => new Response("<html>oops</html>", { status: 200 })).create("Algo en paz"),
    ).toEqual({
      status: "unavailable",
    });
    expect(
      await odd(() => Response.json({ status: "created", petition: { id: 1 } })).create(
        "Algo en paz",
      ),
    ).toEqual({ status: "unavailable" });
    expect(await odd(() => new Response("", { status: 500 })).create("Algo en paz")).toEqual({
      status: "unavailable",
    });
    expect(await odd(() => new Response("", { status: 429 })).create("Algo en paz")).toEqual({
      status: "unavailable",
    });
  });
});

describe("the sky", () => {
  it("is everyone's: what one person leaves, another sees, without knowing whose it is", async () => {
    const ana = visitor(srv);
    const ben = visitor(srv);
    await ana.service.create("De Ana");
    await ben.service.create("De Ben");
    const seenByAna = await ana.service.sky(30);
    expect(seenByAna.map((p) => p.text).sort()).toEqual(["De Ana", "De Ben"]);
    expect(seenByAna.find((p) => p.text === "De Ana")?.mine).toBe(true);
    expect(seenByAna.find((p) => p.text === "De Ben")?.mine).toBe(false);
    expect(JSON.stringify(seenByAna)).not.toMatch(/owner|author|hash/i);
  });

  it("can be read by someone who has never left a petition, who gets no key because of it", async () => {
    const author = visitor(srv);
    await author.service.create("Para quien pase");
    const reader = visitor(srv);
    expect(await reader.service.sky()).toHaveLength(1);
    expect(reader.keys.get()).toBeUndefined();
    expect(srv.calls.at(-1)?.key).toBeNull();
  });

  it("asks for as many stars as the sky holds", async () => {
    const { service } = visitor(srv);
    await service.sky(120);
    await service.sky();
    expect(srv.calls[0]?.path).toBe("/api/sky?limit=120");
    expect(srv.calls[1]?.path).toBe("/api/sky");
  });

  it("asks nothing for 'mine' while the visitor has no petition and so no key", async () => {
    const { service } = visitor(srv);
    expect(await service.mine()).toEqual([]);
    expect(srv.calls).toEqual([]);
  });
});

describe("answering and sending back to the fire", () => {
  async function owned() {
    const owner = visitor(srv);
    const created = await owner.service.create("Por mi mamá");
    if (created.status !== "created") throw new Error("not created");
    owner.events.length = 0;
    return { owner, id: created.petition.id };
  }

  it("is answered by its author, with how it happened, and others see it twinkle", async () => {
    const { owner, id } = await owned();
    const result = await owner.service.answer(id, "  Salió bien de la operación ");
    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    expect(result.petition.answered).toEqual({
      at: BASE,
      on: "2026-10-10",
      note: "Salió bien de la operación",
    });
    expect(owner.events).toEqual([{ type: "answered", petition: result.petition }]);
    const other = visitor(srv);
    expect((await other.service.sky())[0]?.answered?.note).toBe("Salió bien de la operación");
    expect((await owner.service.answer(id, "otra vez")).status).toBe("already-answered");
  });

  it("is not for anyone else, and needs the line, which is checked here before it is sent", async () => {
    const { owner, id } = await owned();
    const stranger = visitor(srv);
    expect((await stranger.service.answer(id, "no es mía")).status).toBe("not-yours");
    const before = srv.calls.length;
    expect(await owner.service.answer(id, "  ")).toEqual({ status: "note-required" });
    expect(await owner.service.answer(id, "ya no quiero vivir")).toEqual({ status: "risk" });
    expect((await owner.service.answer(id, "p u t a   m a d r e")).status).toBe("rejected");
    expect(await owner.service.answer(id, "x".repeat(2001))).toEqual({ status: "too-long" });
    expect(srv.calls.length).toBe(before);
  });

  it("goes back to the fire for good, and is told to the page", async () => {
    const { owner, id } = await owned();
    expect(await owner.service.remove(id)).toEqual({ status: "removed" });
    expect(owner.events).toEqual([{ type: "removed", id }]);
    expect(await owner.service.mine()).toEqual([]);
    expect(await visitor(srv).service.sky()).toEqual([]);
    expect(await owner.service.remove(id)).toEqual({ status: "not-found" });
  });

  it("cannot be sent back by someone else", async () => {
    const { id } = await owned();
    expect(await visitor(srv).service.remove(id)).toEqual({ status: "not-yours" });
  });
});

describe("being with a petition", () => {
  async function waiting() {
    const author = visitor(srv);
    const created = await author.service.create("Por mi familia");
    if (created.status !== "created") throw new Error("not created");
    return { author, id: created.petition.id };
  }

  it("counts once per person, and the page is told the new count", async () => {
    const { id } = await waiting();
    const ben = visitor(srv);
    await ben.service.sky();
    ben.events.length = 0;
    expect(await ben.service.pray(id)).toEqual({ status: "prayed", prayers: 1 });
    expect(ben.events).toEqual([
      { type: "changed", petition: expect.objectContaining({ id, prayers: 1, prayed: true }) },
    ]);
    expect(await ben.service.pray(id)).toEqual({ status: "already-prayed", prayers: 1 });
    const cam = visitor(srv);
    expect(await cam.service.pray(id)).toEqual({ status: "prayed", prayers: 2 });
    expect((await ben.service.sky())[0]).toMatchObject({ prayers: 2, prayed: true });
  });

  it("is not for one's own petition, nor for what is not there", async () => {
    const { author, id } = await waiting();
    expect(await author.service.pray(id)).toEqual({ status: "own" });
    expect(await visitor(srv).service.pray("nope")).toEqual({ status: "not-found" });
  });

  it("is limited per session, here, without asking the server again", async () => {
    const { id } = await waiting();
    const second = await visitor(srv).service.create("Otra petición por la paz");
    if (second.status !== "created") throw new Error("not created");
    const ben = visitor(srv, { prayers: 1 });
    expect((await ben.service.pray(id)).status).toBe("prayed");
    const before = srv.calls.length;
    expect(await ben.service.pray(second.petition.id)).toEqual({ status: "rate-limited" });
    expect(srv.calls.length).toBe(before);
  });

  it("is told, when the server says to go slower, as being limited", async () => {
    const slow = new RemotePetitions({
      baseUrl: "https://fogata.test",
      keys: new MemoryKeyStore(),
      newKey: nextKey,
      fetch: async () => new Response(JSON.stringify({ error: "slow-down" }), { status: 429 }),
      companyPollMs: 0,
    });
    expect(await slow.pray("p1")).toEqual({ status: "rate-limited" });
  });
});

describe("reports", () => {
  it("hides the star from the one who reported it, and nobody else", async () => {
    const author = visitor(srv);
    const created = await author.service.create("Algo que no debería estar");
    if (created.status !== "created") throw new Error("not created");
    const ben = visitor(srv);
    expect(await ben.service.report(created.petition.id)).toEqual({ status: "reported" });
    expect(ben.events).toEqual([{ type: "hidden", id: created.petition.id }]);
    expect(await ben.service.sky()).toEqual([]);
    expect(await visitor(srv).service.sky()).toHaveLength(1);
    expect(await author.service.report(created.petition.id)).toEqual({ status: "own" });
    expect(await ben.service.report("nope")).toEqual({ status: "not-found" });
  });
});

describe("company on the visitor's own petitions", () => {
  it("is noticed when someone is with one, once, and never the first time it is seen", async () => {
    const author = visitor(srv);
    const created = await author.service.create("Por mi familia");
    if (created.status !== "created") throw new Error("not created");
    author.events.length = 0;
    await author.service.checkCompany();
    expect(author.events).toEqual([]);

    await visitor(srv).service.pray(created.petition.id);
    await author.service.checkCompany();
    expect(author.events).toEqual([
      {
        type: "accompanied",
        petition: expect.objectContaining({ id: created.petition.id, prayers: 1 }),
      },
    ]);
    await author.service.checkCompany();
    expect(author.events).toHaveLength(1);

    await visitor(srv).service.pray(created.petition.id);
    await author.service.checkCompany();
    expect(author.events).toHaveLength(2);
  });

  it("is looked for on a timer while someone is listening, and not at all once stopped", async () => {
    vi.useFakeTimers();
    try {
      const keys = new MemoryKeyStore();
      keys.set(nextKey());
      const service = new RemotePetitions({
        baseUrl: "https://fogata.test",
        keys,
        newKey: nextKey,
        fetch: srv.fetcher,
        companyPollMs: 1000,
      });
      expect(srv.calls).toEqual([]);
      service.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(3100);
      expect(srv.calls.filter((call) => call.path === "/api/mine").length).toBe(3);
      service.dispose();
      await vi.advanceTimersByTimeAsync(5000);
      expect(srv.calls.filter((call) => call.path === "/api/mine").length).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
