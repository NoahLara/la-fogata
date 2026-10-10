import { beforeEach, describe, expect, it } from "vitest";
import { OWNER_KEY_HEADER, PETITION_MAX_LENGTH } from "@fogata/shared";
import { createApi } from "./handler";
import { hashKey } from "./hash";
import { REPORTS_TO_HIDE } from "./store";
import { createTestDb } from "./testing";
import type { Db } from "./db";

const KEY_A = "a".repeat(32);
const KEY_B = "b".repeat(32);
const KEY_C = "c".repeat(32);
const BASE = Date.parse("2026-10-10T15:00:00Z");

let db: Db;
let clock: number;
let counter: number;
let queries: string[];
let api: (request: Request) => Promise<Response | undefined>;

/** The database with a note of every query that reaches it, to see what is read and when. */
function watched(inner: Db): Db {
  return {
    prepare: (sql) => {
      queries.push(sql);
      return inner.prepare(sql);
    },
    batch: (statements) => inner.batch(statements),
  };
}

beforeEach(() => {
  clock = BASE;
  counter = 0;
  queries = [];
  db = createTestDb();
  api = createApi({
    db: watched(db),
    now: () => clock,
    newId: () => `p${++counter}`,
    rand: () => 0.5,
  });
});

/** What the api answers, read loosely: each test says what it expects of it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any;

interface Call {
  key?: string;
  body?: unknown;
  raw?: string;
}

async function call(method: string, path: string, { key, body, raw }: Call = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers[OWNER_KEY_HEADER] = key;
  const request = new Request(`https://fogata.test${path}`, {
    method,
    headers,
    ...(raw !== undefined
      ? { body: raw }
      : body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
  });
  const response = await api(request);
  if (!response) throw new Error("not an api path");
  return {
    status: response.status,
    headers: response.headers,
    body: (await response.json()) as Body,
  };
}

const DAY = "2026-10-10";

/** More than 2000 characters of a letter written by someone, with nothing repeated. */
const LETTER = [
  "Hoy llegué a la fogata sin saber muy bien qué decir, así que voy a empezar por lo que me pesa.",
  "Hace tres meses mi mamá se enfermó y desde entonces la casa se siente más callada de lo normal.",
  "Mi hermano se fue a trabajar lejos y yo me quedé a cargo de las medicinas, de las citas y de los papeles.",
  "A veces me da miedo no hacerlo bien, olvidar una pastilla o no entender lo que dijo el doctor.",
  "Por las noches me despierto a las tres y me quedo mirando el techo, repasando todo lo que podría salir mal.",
  "Quiero pedir por su salud, por la paciencia que me falta y por la fuerza para sostener a mi familia.",
  "También quiero pedir por mi trabajo, que está a punto de cambiar y no sé si voy a poder con todo a la vez.",
  "Mi jefa ha sido amable, pero los números no cuadran y se habla de recortes en la oficina.",
  "No quiero preocuparme por adelantado, y aun así el pecho se me aprieta cada vez que suena el teléfono.",
  "Pienso en mi abuela, que decía que lo que se entrega con el corazón nunca se pierde, aunque tarde en volver.",
  "Me acuerdo de su cocina, del olor a pan recién hecho y de cómo nos sentaba a todos antes de empezar a comer.",
  "Quisiera que mi mamá volviera a reír así, con la cabeza echada hacia atrás y los ojos casi cerrados.",
  "Pido por los médicos que la atienden, para que tengan claridad y cuidado en cada decisión que tomen.",
  "Pido por las personas que esperan en los pasillos del hospital, que seguro llevan historias parecidas a la mía.",
  "Pido por un amigo que perdió a su padre este mes y todavía no ha podido llorar como necesita.",
  "Pido por la vecina que vive sola y que cada tarde se sienta en la puerta a ver pasar a la gente.",
  "Y pido por mí, para no cerrar el corazón cuando el cansancio me haga creer que ya no hay nada que dar.",
  "Gracias por este lugar donde puedo escribir sin que nadie me juzgue y sin tener que explicar mi nombre.",
  "Gracias por el fuego, por las estrellas y por quienes se sientan en silencio aunque no los conozca.",
  "Si alguien lee esto, que sepa que no está solo y que mañana, con la luz del día, todo pesa un poco menos.",
  "Voy a dejar esta petición aquí y a volver cuando sepa algo, ya sea una buena noticia o simplemente más fuerzas.",
  "Mientras tanto seguiré preparando el café de la mañana, ordenando las medicinas y respirando hondo.",
  "Me han dicho que lo importante es dar el siguiente paso y no el camino completo, y quiero creerlo.",
  "Estoy aprendiendo a pedir ayuda, a aceptar que no puedo con todo y que eso no me hace menos fuerte.",
  "Mi esposo me escucha cada noche, aunque a veces solo me abraza porque tampoco encuentra qué decir.",
  "Mis hijos preguntan por su abuela y yo trato de explicarles con palabras sencillas, sin quitarles la esperanza.",
  "Hoy el más pequeño dibujó un sol enorme y me dijo que era para que ella se pusiera contenta.",
  "Lo pegué en el refrigerador, junto a la lista de horarios, y por un momento la casa se sintió distinta.",
  "Que esta petición suba con el humo y llegue donde tenga que llegar, con paz y sin prisa, como el fuego.",
].join(" ");
const create = (key: string, text: string, day = DAY) =>
  call("POST", "/api/petitions", { key, body: { text, day } });
const sky = (key?: string, query = "") => call("GET", `/api/sky${query}`, key ? { key } : {});
const mine = (key: string) => call("GET", "/api/mine", { key });

describe("leaving a petition", () => {
  it("keeps it and says it is the visitor's own, with no word about an author", async () => {
    const { status, body } = await create(KEY_A, "  Por mi mamá, que está enferma  ");
    expect(status).toBe(200);
    expect(body.status).toBe("created");
    expect(body.petition).toEqual({
      id: "p1",
      text: "Por mi mamá, que está enferma",
      createdAt: BASE,
      createdOn: DAY,
      prayers: 0,
      mine: true,
      prayed: false,
    });
    expect((await mine(KEY_A)).body.petitions).toHaveLength(1);
  });

  it("refuses an empty one, one that is too short, and one that is too long, counting characters as people do", async () => {
    expect((await create(KEY_A, "   ")).body.status).toBe("empty");
    expect((await create(KEY_A, "a")).body.status).toBe("empty");
    expect((await create(KEY_A, "Fe")).body.status).toBe("created");
    // A long, varied letter: the filter takes the same words over and over for noise, so it cannot be a repeated line.
    const exactly = Array.from(LETTER).slice(0, PETITION_MAX_LENGTH).join("");
    expect(Array.from(exactly)).toHaveLength(PETITION_MAX_LENGTH);
    expect((await create(KEY_A, exactly)).body.status).toBe("created");
    const oneMore = Array.from(LETTER)
      .slice(0, PETITION_MAX_LENGTH + 1)
      .join("");
    expect((await create(KEY_A, oneMore)).body.status).toBe("too-long");
    // Characters are counted as people do: an emoji is one, so this is well within the limit.
    expect((await create(KEY_A, "🙏 gracias ".repeat(150))).body.status).not.toBe("too-long");
  });

  it("never keeps a text with signs of risk, and says so without saying more", async () => {
    const { body } = await create(KEY_A, "quiero morir, ya no puedo más");
    expect(body).toEqual({ status: "risk" });
    expect((await mine(KEY_A)).body.petitions).toEqual([]);
    const rows = await db.prepare("SELECT COUNT(*) AS n FROM petitions").first<{ n: number }>();
    expect(rows?.n).toBe(0);
  });

  it("refuses insults and what cannot be read, and never names the word", async () => {
    const insult = await create(KEY_A, "c o m a n   m i e r d a");
    expect(insult.body).toEqual({ status: "rejected", reason: "offensive" });
    const mashing = await create(KEY_A, "asdfghjkl qwertyuiop");
    expect(mashing.body.status).toBe("rejected");
    expect(JSON.stringify([insult.body, mashing.body])).not.toMatch(/mierda/i);
    expect((await mine(KEY_A)).body.petitions).toEqual([]);
  });

  it("needs a key that looks like the browser's, and a request that looks like one", async () => {
    expect((await call("POST", "/api/petitions", { body: { text: "Paz", day: DAY } })).status).toBe(
      401,
    );
    expect((await create("not-a-key", "Paz")).status).toBe(401);
    expect((await call("POST", "/api/petitions", { key: KEY_A, raw: "{nope" })).status).toBe(400);
    expect(
      (await call("POST", "/api/petitions", { key: KEY_A, body: { text: "Paz" } })).status,
    ).toBe(400);
    expect(
      (
        await call("POST", "/api/petitions", {
          key: KEY_A,
          body: { text: "Paz", day: DAY, owner: "x" },
        })
      ).status,
    ).toBe(400);
    expect((await create(KEY_A, "Paz", "10/10/2026")).status).toBe(400);
    expect(
      (await call("POST", "/api/petitions", { key: KEY_A, raw: "x".repeat(50_000) })).status,
    ).toBe(400);
  });

  it("dates it with the visitor's day if it is today or a day away, and with the server's otherwise", async () => {
    expect((await create(KEY_A, "uno", "2026-10-09")).body.petition.createdOn).toBe("2026-10-09");
    expect((await create(KEY_A, "dos", "2026-10-11")).body.petition.createdOn).toBe("2026-10-11");
    expect((await create(KEY_A, "tres", "2020-01-01")).body.petition.createdOn).toBe(DAY);
    expect((await create(KEY_A, "cuatro", "2026-02-30")).body.petition.createdOn).toBe(DAY);
  });
});

describe("there is no limit on how many, only a flood guard", () => {
  it("lets a person leave as many as they like, a few at a time", async () => {
    for (let n = 1; n <= 50; n++) {
      expect((await create(KEY_A, `petición ${n}`)).body.status).toBe("created");
      clock += 20_000;
    }
    expect((await mine(KEY_A)).body.petitions).toHaveLength(50);
  });

  it("slows down a script: more than six in a minute are refused, and the next minute is free", async () => {
    for (let n = 1; n <= 6; n++) expect((await create(KEY_A, `uno ${n}`)).status).toBe(200);
    expect((await create(KEY_A, "siete")).status).toBe(429);
    expect((await create(KEY_A, "siete")).body).toEqual({ error: "slow-down" });
    clock += 61_000;
    expect((await create(KEY_A, "siete")).status).toBe(200);
  });

  it("keeps each person's count apart", async () => {
    for (let n = 1; n <= 6; n++) await create(KEY_A, `uno ${n}`);
    expect((await create(KEY_B, "otra persona")).status).toBe(200);
  });
});

describe("a person's own petitions", () => {
  it("lists them, the newest first, and nobody else's", async () => {
    await create(KEY_A, "primera");
    clock += 1000;
    await create(KEY_A, "segunda");
    await create(KEY_B, "de otra persona");
    const { body } = await mine(KEY_A);
    expect(body.petitions.map((p: { text: string }) => p.text)).toEqual(["segunda", "primera"]);
    expect(body.petitions.every((p: { mine: boolean }) => p.mine)).toBe(true);
  });

  it("needs a key", async () => {
    expect((await call("GET", "/api/mine")).status).toBe(401);
  });
});

describe("the sky", () => {
  it("is everyone's: anyone can read it, with or without a key, and flags the reader's own", async () => {
    await create(KEY_A, "de la persona A");
    await create(KEY_B, "de la persona B");
    const asA = (await sky(KEY_A)).body.petitions as { text: string; mine: boolean }[];
    expect(asA.map((p) => p.text).sort()).toEqual(["de la persona A", "de la persona B"]);
    expect(asA.find((p) => p.text === "de la persona A")?.mine).toBe(true);
    expect(asA.find((p) => p.text === "de la persona B")?.mine).toBe(false);
    const anonymous = (await sky()).body.petitions as { mine: boolean; prayed: boolean }[];
    expect(anonymous).toHaveLength(2);
    expect(anonymous.every((p) => !p.mine && !p.prayed)).toBe(true);
  });

  it("shows the least prayed for first, and as many as asked, never more than the most", async () => {
    for (let n = 0; n < 5; n++) {
      await create(`${n}`.repeat(32), `petición ${n}`);
    }
    await call("POST", "/api/petitions/p1/pray", { key: KEY_B });
    await call("POST", "/api/petitions/p1/pray", { key: KEY_C });
    clock += 61_000;
    const list = (await sky(KEY_A, "?limit=3")).body.petitions as { id: string; prayers: number }[];
    expect(list).toHaveLength(3);
    expect(list.map((p) => p.id)).not.toContain("p1");
    expect((await sky(KEY_A, "?limit=10000")).body.petitions.length).toBeLessThanOrEqual(200);
    expect((await sky(KEY_A, "?limit=abc")).body.petitions).toHaveLength(5);
    expect((await sky(KEY_A, "?limit=0")).body.petitions.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show what the reader reported, or what enough people reported", async () => {
    await create(KEY_A, "una a reportar");
    await create(KEY_A, "otra que se queda");
    await call("POST", "/api/petitions/p1/report", { key: KEY_B });
    const mineSeen = (await sky(KEY_B)).body.petitions as { id: string }[];
    expect(mineSeen.map((p) => p.id)).toEqual(["p2"]);
    expect((await sky(KEY_C)).body.petitions).toHaveLength(2);
  });

  it("never carries a hash, a key or anything about an author", async () => {
    await create(KEY_A, "una petición");
    await call("POST", "/api/petitions/p1/pray", { key: KEY_B });
    const text = JSON.stringify([
      (await sky(KEY_A)).body,
      (await sky(KEY_B)).body,
      (await mine(KEY_A)).body,
    ]);
    for (const purpose of ["owner", "prayer", "report"] as const) {
      expect(text).not.toContain(await hashKey(KEY_A, purpose));
      expect(text).not.toContain(await hashKey(KEY_B, purpose));
    }
    expect(text).not.toContain(KEY_A);
    expect(text).not.toMatch(/owner|author|hash|key/i);
    expect(text).not.toMatch(/[0-9a-f]{40,}/);
  });

  it("is chosen from one reading kept for a minute, and read again after something changes", async () => {
    const reads = () => queries.filter((sql) => sql.includes("WHERE status = 'visible'")).length;
    await create(KEY_A, "primera");
    await sky(KEY_B);
    await sky(KEY_B);
    await sky(KEY_C);
    expect(reads()).toBe(1);
    await create(KEY_A, "segunda");
    expect((await sky(KEY_B)).body.petitions).toHaveLength(2);
    expect(reads()).toBe(2);
    clock += 61_000;
    await sky(KEY_B);
    expect(reads()).toBe(3);
  });

  it("never drops a petition for being old", async () => {
    await create(KEY_A, "antigua");
    clock += 5 * 365 * 24 * 60 * 60 * 1000;
    expect((await sky(KEY_B)).body.petitions).toHaveLength(1);
  });
});

describe("answering", () => {
  beforeEach(async () => {
    await create(KEY_A, "Por mi mamá");
  });
  const answer = (key: string, id: string, note: string, day = DAY) =>
    call("POST", `/api/petitions/${id}/answer`, { key, body: { note, day } });

  it("is for its owner, once, with how it happened and the day", async () => {
    clock += 3 * 24 * 60 * 60 * 1000;
    const { body } = await answer(KEY_A, "p1", "  Salió bien de la operación  ", "2026-10-13");
    expect(body.status).toBe("answered");
    expect(body.petition.answered).toEqual({
      at: clock,
      on: "2026-10-13",
      note: "Salió bien de la operación",
    });
    expect((await mine(KEY_A)).body.petitions[0].answered.note).toBe("Salió bien de la operación");
    expect((await sky(KEY_B)).body.petitions[0].answered).toBeDefined();
    expect((await answer(KEY_A, "p1", "otra vez")).body.status).toBe("already-answered");
  });

  it("is not for anyone else, and not for what is not there", async () => {
    expect((await answer(KEY_B, "p1", "no es mía")).body.status).toBe("not-yours");
    expect((await answer(KEY_A, "nope", "x")).body.status).toBe("not-found");
    expect((await mine(KEY_A)).body.petitions[0].answered).toBeUndefined();
  });

  it("needs how it happened, in a fair length, and the same checks as a petition", async () => {
    expect((await answer(KEY_A, "p1", "   ")).body.status).toBe("note-required");
    expect((await answer(KEY_A, "p1", "x".repeat(2001))).body.status).toBe("too-long");
    expect((await answer(KEY_A, "p1", "ya no quiero vivir")).body.status).toBe("risk");
    expect((await answer(KEY_A, "p1", "p u t a   m a d r e")).body.status).toBe("rejected");
    expect((await mine(KEY_A)).body.petitions[0].answered).toBeUndefined();
  });

  it("needs a key and a body of the right shape", async () => {
    expect(
      (await call("POST", "/api/petitions/p1/answer", { body: { note: "x", day: DAY } })).status,
    ).toBe(401);
    expect(
      (await call("POST", "/api/petitions/p1/answer", { key: KEY_A, body: { note: "x" } })).status,
    ).toBe(400);
  });
});

describe("sending a petition back to the fire", () => {
  beforeEach(async () => {
    await create(KEY_A, "Por mi mamá");
  });

  it("is for its owner, for good, and takes whoever was with it along", async () => {
    await call("POST", "/api/petitions/p1/pray", { key: KEY_B });
    expect((await call("DELETE", "/api/petitions/p1", { key: KEY_B })).body.status).toBe(
      "not-yours",
    );
    expect((await call("DELETE", "/api/petitions/p1", { key: KEY_A })).body.status).toBe("removed");
    expect((await mine(KEY_A)).body.petitions).toEqual([]);
    expect((await sky(KEY_B)).body.petitions).toEqual([]);
    expect((await call("DELETE", "/api/petitions/p1", { key: KEY_A })).body.status).toBe(
      "not-found",
    );
    expect((await call("POST", "/api/petitions/p1/pray", { key: KEY_B })).body.status).toBe(
      "not-found",
    );
  });

  it("lets the owner leave another straight after", async () => {
    await call("DELETE", "/api/petitions/p1", { key: KEY_A });
    expect((await create(KEY_A, "otra")).body.status).toBe("created");
  });

  it("needs a key", async () => {
    expect((await call("DELETE", "/api/petitions/p1")).status).toBe(401);
  });
});

describe("being with a petition", () => {
  beforeEach(async () => {
    await create(KEY_A, "Por mi mamá");
  });
  const pray = (key: string, id = "p1") => call("POST", `/api/petitions/${id}/pray`, { key });

  it("counts each person once, and remembers who", async () => {
    expect((await pray(KEY_B)).body).toEqual({ status: "prayed", prayers: 1 });
    expect((await pray(KEY_B)).body).toEqual({ status: "already-prayed", prayers: 1 });
    expect((await pray(KEY_C)).body).toEqual({ status: "prayed", prayers: 2 });
    const asB = (await sky(KEY_B)).body.petitions[0];
    expect(asB).toMatchObject({ prayers: 2, prayed: true });
    expect((await sky(KEY_A)).body.petitions[0]).toMatchObject({ prayers: 2, prayed: false });
  });

  it("is not for one's own petition, nor for what is not there", async () => {
    expect((await pray(KEY_A)).body.status).toBe("own");
    expect((await pray(KEY_B, "nope")).body.status).toBe("not-found");
    expect((await mine(KEY_A)).body.petitions[0].prayers).toBe(0);
  });

  it("shows the owner that someone is with it", async () => {
    await pray(KEY_B);
    expect((await mine(KEY_A)).body.petitions[0].prayers).toBe(1);
  });

  it("slows down a script: more than forty in a minute are refused", async () => {
    for (let n = 0; n < 40; n++) {
      await create(`${(n % 9) + 1}`.repeat(32), `petición ${n}`).catch(() => undefined);
      clock += 11_000;
    }
    const ids = (await sky(KEY_B, "?limit=200")).body.petitions.map(
      (p: { id: string }) => p.id,
    ) as string[];
    let refused = 0;
    for (const id of ids) {
      const response = await pray(KEY_C, id);
      if (response.status === 429) refused++;
    }
    expect(ids.length).toBeGreaterThan(40);
    expect(refused).toBeGreaterThan(0);
    clock += 61_000;
    expect((await pray(KEY_C, ids[ids.length - 1] ?? "p1")).status).not.toBe(429);
  });

  it("needs a key", async () => {
    expect((await call("POST", "/api/petitions/p1/pray")).status).toBe(401);
  });
});

describe("reports", () => {
  beforeEach(async () => {
    await create(KEY_A, "Algo que no debería estar");
  });
  const report = (key: string, id = "p1") => call("POST", `/api/petitions/${id}/report`, { key });

  it("is saved, hides it for the one who reported it at once, and not for others", async () => {
    expect((await report(KEY_B)).body.status).toBe("reported");
    expect((await sky(KEY_B)).body.petitions).toEqual([]);
    expect((await sky(KEY_C)).body.petitions).toHaveLength(1);
    expect((await mine(KEY_A)).body.petitions).toHaveLength(1);
  });

  it("is not for one's own petition, nor for what is not there", async () => {
    expect((await report(KEY_A)).body.status).toBe("own");
    expect((await report(KEY_B, "nope")).body.status).toBe("not-found");
  });

  it("takes the petition out of everyone's sky once enough different people reported it", async () => {
    const keys = ["1", "2", "3", "4"].map((digit) => digit.repeat(32));
    for (const key of keys.slice(0, REPORTS_TO_HIDE - 1)) await report(key);
    expect((await sky(KEY_C)).body.petitions).toHaveLength(1);
    await report(keys[REPORTS_TO_HIDE - 1] as string);
    expect((await sky(KEY_C)).body.petitions).toEqual([]);
    expect((await call("POST", "/api/petitions/p1/pray", { key: KEY_C })).body.status).toBe(
      "not-found",
    );
    // Its author still has it.
    expect((await mine(KEY_A)).body.petitions).toHaveLength(1);
  });

  it("counts one person once", async () => {
    for (let i = 0; i < 5; i++) await report(KEY_B);
    expect((await sky(KEY_C)).body.petitions).toHaveLength(1);
  });
});

describe("what is kept", () => {
  it("never holds a key, only hashes made from it for one purpose each", async () => {
    await create(KEY_A, "Por mi mamá");
    await call("POST", "/api/petitions/p1/pray", { key: KEY_B });
    await call("POST", "/api/petitions/p1/report", { key: KEY_C });
    const dump = JSON.stringify(
      await Promise.all(
        ["petitions", "prayers", "reports"].map(
          async (table) => (await db.prepare(`SELECT * FROM ${table}`).all()).results,
        ),
      ),
    );
    for (const key of [KEY_A, KEY_B, KEY_C]) expect(dump).not.toContain(key);
    expect(dump).toContain(await hashKey(KEY_A, "owner"));
    expect(dump).toContain(await hashKey(KEY_B, "prayer"));
    expect(dump).toContain(await hashKey(KEY_C, "report"));
    // The hash that says who wrote a petition cannot be joined to the one that says who prayed or reported.
    expect(dump).not.toContain(await hashKey(KEY_A, "prayer"));
    expect(dump).not.toContain(await hashKey(KEY_B, "owner"));
  });

  it("hashes a key differently for each purpose, the same way every time, without showing it", async () => {
    const hashes = await Promise.all(
      (["owner", "prayer", "report"] as const).map((p) => hashKey(KEY_A, p)),
    );
    expect(new Set(hashes).size).toBe(3);
    expect(hashes.every((hash) => /^[0-9a-f]{64}$/.test(hash))).toBe(true);
    expect(await hashKey(KEY_A, "owner")).toBe(hashes[0]);
    expect(hashes.join("")).not.toContain(KEY_A);
    expect(await hashKey(KEY_B, "owner")).not.toBe(hashes[0]);
  });
});

describe("the edges of the api", () => {
  it("leaves every path that is not under /api to someone else", async () => {
    expect(await api(new Request("https://fogata.test/"))).toBeUndefined();
    expect(await api(new Request("https://fogata.test/parties/campfire/x"))).toBeUndefined();
  });

  it("answers the browser's preflight and lets any page ask, since no cookies are used", async () => {
    const response = await api(
      new Request("https://fogata.test/api/petitions", { method: "OPTIONS" }),
    );
    expect(response?.status).toBe(204);
    expect(response?.headers.get("access-control-allow-origin")).toBe("*");
    expect(response?.headers.get("access-control-allow-headers")).toContain(OWNER_KEY_HEADER);
    const sample = await call("GET", "/api/sky");
    expect(sample.headers.get("access-control-allow-origin")).toBe("*");
    expect(sample.headers.get("cache-control")).toBe("no-store");
  });

  it("says plainly when a path or a method is not one it knows", async () => {
    expect((await call("GET", "/api/nope")).status).toBe(404);
    expect((await call("GET", "/api/petitions")).status).toBe(404);
    expect((await call("PUT", "/api/petitions/p1")).status).toBe(404);
    expect((await call("GET", "/api/petitions/p1/pray")).status).toBe(404);
    expect((await call("POST", "/api/petitions/p1/explode", { key: KEY_A })).status).toBe(404);
    expect((await call("DELETE", `/api/petitions/${"x".repeat(80)}`, { key: KEY_A })).status).toBe(
      404,
    );
  });
});
