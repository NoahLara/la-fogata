import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { createRandom } from "@/scene/random";
import { MemoryKeyStore } from "./keyStore";
import { MemoryPetitions } from "./memoryPetitions";
import { seedDemoPetitions, type DemoLoader } from "./demoSeed";

const service = () =>
  new MemoryPetitions({
    now: () => 0,
    rand: createRandom(1),
    keys: new MemoryKeyStore(),
    newId: (() => {
      let n = 0;
      return () => `p${n++}`;
    })(),
    newKey: () => "k",
  });

const loader: DemoLoader = async () => ({
  DEMO_PETITIONS: {
    es: [
      { text: "uno", prayers: 2 },
      { text: "dos", prayers: 0, answered: "así pasó" },
    ],
    en: [{ text: "one", prayers: 1 }],
  },
});

describe("the demo petitions", () => {
  it("are seeded as real petitions, repeating the texts to fill the sky", async () => {
    const petitions = service();
    expect(await seedDemoPetitions(petitions, { count: 5, locale: "es", load: loader })).toBe(5);
    const sky = await petitions.sky(10);
    expect(sky).toHaveLength(5);
    expect(sky.every((p) => !p.mine)).toBe(true);
    expect(sky.filter((p) => p.answered).length).toBe(2);
    expect(sky.find((p) => p.answered)?.answered?.note).toBe("así pasó");
  });

  it("follow the language", async () => {
    const petitions = service();
    await seedDemoPetitions(petitions, { count: 2, locale: "en", load: loader });
    expect((await petitions.sky(5)).map((p) => p.text)).toEqual(["one", "one"]);
  });

  it("are never loaded without a loader, which is what a production build passes", async () => {
    const petitions = service();
    expect(await seedDemoPetitions(petitions, { count: 5, locale: "es", load: undefined })).toBe(0);
    expect(await petitions.sky(10)).toHaveLength(0);
  });
});

describe("demo texts never reach production", () => {
  const root = join(__dirname, "..");
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });

  it("only one file refers to the sample texts, through a dynamic import behind the production check", () => {
    const users = sources(root).filter((file) =>
      /demo\/otherPetitions/.test(readFileSync(file, "utf8")),
    );
    expect(users.map((file) => relative(root, file))).toEqual(["components/scene/FogataScene.tsx"]);
    const text = readFileSync(users[0] as string, "utf8");
    expect(text).toMatch(
      /process\.env\.NODE_ENV === "production"\s*\?\s*undefined\s*:\s*\(\) => import\("@\/demo\/otherPetitions"\)/,
    );
    expect(text).not.toMatch(/^import .*demo\/otherPetitions/m);
  });
});
