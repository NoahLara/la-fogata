import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const requested: string[] = [];
const failing = new Set<string>();

vi.mock("pixi.js", () => ({
  Assets: {
    load: vi.fn(async ({ src }: { src: string }) => {
      requested.push(src);
      if (failing.has(src)) throw new Error(`no ${src}`);
      return { source: { autoGenerateMipmaps: false, style: {} } };
    }),
  },
}));

const { artUrl, SpriteArt, SPECIES } = await import("./index");

const publicFile = (url: string) =>
  fileURLToPath(new URL(`../../../public${url}`, import.meta.url));

afterEach(() => {
  requested.length = 0;
  failing.clear();
  vi.unstubAllGlobals();
});

describe("the characters' art", () => {
  it("is where the loader looks: every view of every animal is an SVG that exists", () => {
    for (const species of SPECIES) {
      for (const view of ["front", "back", "side"] as const) {
        const url = artUrl(species, view);
        expect(url).toBe(`/characters/${species}/${view}.svg`);
        expect(existsSync(publicFile(url)), `${url} is missing`).toBe(true);
      }
    }
  });

  it("asks only for the files that exist: no other formats are tried, so nothing is a 404", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await SpriteArt.load(SPECIES);
    expect(requested).toHaveLength(SPECIES.length * 3);
    expect(requested.every((url) => existsSync(publicFile(url)))).toBe(true);
    expect(requested.some((url) => /\.(webp|png)$/.test(url))).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads every animal with its three views", async () => {
    const art = await SpriteArt.load(SPECIES);
    for (const species of SPECIES) {
      expect(art.has(species)).toBe(true);
      expect(art.art(species, "side").directional).toBe(true);
    }
  });

  it("lets the front stand in for a side view an animal does not have", async () => {
    failing.add(artUrl("fox", "side"));
    const art = await SpriteArt.load(["fox"]);
    expect(art.has("fox")).toBe(true);
    const side = art.art("fox", "side");
    expect(side.texture).toBe(art.art("fox", "front").texture);
    expect(side.directional).toBe(false);
  });

  it("does not count an animal whose front or back cannot be loaded, and says so", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    failing.add(artUrl("owl", "back"));
    const art = await SpriteArt.load(["owl", "cat"]);
    expect(art.has("owl")).toBe(false);
    expect(art.has("cat")).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("owl"), expect.anything());
    warn.mockRestore();
  });
});
