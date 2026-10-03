import { describe, expect, it } from "vitest";
import {
  backgroundScale,
  MY_AURA,
  hashId,
  STAR_STYLE,
  starLook,
  TWINKLE_BREATH,
  TWINKLE_LOW,
  type StarKind,
  treeLineAt,
  starScale,
  starSizes,
  type Tree,
} from "./petitionStars";

describe("hashId", () => {
  it("is stable and tells ids apart", () => {
    expect(hashId("a")).toBe(hashId("a"));
    expect(hashId("a")).not.toBe(hashId("b"));
  });
});

describe("treeLineAt", () => {
  const pine: Tree = { x: 100, top: 50, height: 100, width: 40 };

  it("is the tip at the pine's middle, falling toward its sides", () => {
    expect(treeLineAt([pine], 100)).toBe(50);
    expect(treeLineAt([pine], 110)).toBeGreaterThan(50);
    expect(treeLineAt([pine], 120)).toBeCloseTo(50 + 0.9 * 100, 6);
  });

  it("is open where no pine reaches", () => {
    expect(treeLineAt([pine], 200)).toBe(Infinity);
    expect(treeLineAt([], 100)).toBe(Infinity);
  });

  it("takes the highest of overlapping pines", () => {
    const taller: Tree = { x: 105, top: 20, height: 130, width: 50 };
    expect(treeLineAt([pine, taller], 105)).toBe(20);
  });
});

describe("starLook: one small white look per state, for everyone", () => {
  const times = [0, 0.7, 1.9, 5.3, 12, 31.4];
  const levels = (kind: StarKind, reduced = false) =>
    times.map((time) => starLook(kind, time, 1.2, reduced).level);

  it("has three kinds only: background, waiting and answered. There is no separate look for other people's stars", () => {
    expect(Object.keys(STAR_STYLE).sort()).toEqual(["answered", "background", "waiting"]);
  });

  it("makes a petition star small: a core of about 2.5 to 3 px and a tight halo about 8 px in radius", () => {
    for (const kind of ["waiting", "answered"] as const) {
      expect(STAR_STYLE[kind].coreSize).toBeGreaterThanOrEqual(2.5);
      expect(STAR_STYLE[kind].coreSize).toBeLessThanOrEqual(3);
      expect(STAR_STYLE[kind].glowSize / 2).toBeGreaterThanOrEqual(7);
      expect(STAR_STYLE[kind].glowSize / 2).toBeLessThanOrEqual(9);
    }
  });

  it("makes every petition star white: no gold, no blue", () => {
    for (const kind of ["waiting", "answered"] as const) {
      expect(STAR_STYLE[kind].core).toBe(0xffffff);
      expect(STAR_STYLE[kind].glow).toBe(0xffffff);
      for (const time of times) {
        expect(starLook(kind, time, 0.4, false).core).toBe(0xffffff);
        expect(starLook(kind, time, 0.4, true).glow).toBe(0xffffff);
      }
    }
  });

  it("makes an answered star exactly the same star as a waiting one: same size, same white", () => {
    expect(STAR_STYLE.answered).toEqual(STAR_STYLE.waiting);
  });

  it("has no crosses or spikes at all", () => {
    for (const kind of ["background", "waiting", "answered"] as const) {
      expect(Object.keys(STAR_STYLE[kind]).sort()).toEqual([
        "core",
        "coreSize",
        "glow",
        "glowSize",
      ]);
      expect(Object.keys(starLook(kind, 1, 0, false)).sort()).toEqual([
        "aura",
        "core",
        "glow",
        "level",
        "scale",
      ]);
    }
  });

  it("keeps a petition star clearly bigger than a background dot, which is 1.5 px or less", () => {
    const { background, waiting } = STAR_STYLE;
    expect(background.coreSize).toBeLessThanOrEqual(1.5);
    expect(background.glowSize).toBe(0);
    expect(waiting.coreSize).toBeGreaterThan(background.coreSize * 1.5);
    for (const u of [0.35, 0.5, 0.8, 1, 1.3, 1.6, 2.4]) {
      expect(background.coreSize * backgroundScale(u)).toBeLessThanOrEqual(1.5);
      expect(waiting.coreSize * starScale(u)).toBeGreaterThan(
        background.coreSize * backgroundScale(u) * 1.5,
      );
      expect(waiting.glowSize * starScale(u)).toBeGreaterThan(waiting.coreSize * starScale(u) * 3);
    }
  });

  it("scales the sizes with the screen, but within limits, so they look the same on a phone", () => {
    expect(starScale(0.35)).toBe(0.85);
    expect(starScale(1)).toBe(1);
    expect(starScale(3)).toBe(1.25);
    expect(starScale(0.9)).toBeLessThan(starScale(1.1));
    expect(backgroundScale(3)).toBe(1);
    expect(backgroundScale(0.1)).toBe(0.8);
  });

  it("makes a background star twinkle softly, and hold still with reduced motion", () => {
    expect(new Set(levels("background")).size).toBeGreaterThan(3);
    for (const level of levels("background")) {
      expect(level).toBeGreaterThanOrEqual(0.4);
      expect(level).toBeLessThanOrEqual(0.9);
    }
    expect(new Set(levels("background", true)).size).toBe(1);
  });

  it("keeps a waiting star steady at any time", () => {
    const first = starLook("waiting", 0, 1.2, false);
    for (const time of times) expect(starLook("waiting", time, 1.2, false)).toEqual(first);
    expect(starLook("waiting", 4, 0.3, true)).toEqual(starLook("waiting", 9, 0.3, false));
  });

  it("makes an answered star twinkle, and only twinkle", () => {
    const answeredLevels = [];
    for (let time = 0; time < 60; time += 0.37) {
      const look = starLook("answered", time, 1.2, false);
      answeredLevels.push(look.level);
      expect(look.level).toBeGreaterThanOrEqual(TWINKLE_LOW - 1e-9);
      expect(look.level).toBeLessThanOrEqual(1);
      expect(look.core).toBe(starLook("waiting", 0, 0, false).core);
      expect(look.glow).toBe(starLook("waiting", 0, 0, false).glow);
    }
    expect(new Set(answeredLevels).size).toBeGreaterThan(10);
    // A visible twinkle: it moves over a good part of its range.
    expect(Math.max(...answeredLevels) - Math.min(...answeredLevels)).toBeGreaterThan(0.4);
  });

  it("makes the halo of an answered star breathe gently with its twinkle, and only that one", () => {
    const scales = [];
    for (let time = 0; time < 30; time += 0.2) {
      const look = starLook("answered", time, 0.7, false);
      scales.push(look.scale);
      expect(look.scale).toBeGreaterThanOrEqual(1 - TWINKLE_BREATH - 1e-9);
      expect(look.scale).toBeLessThanOrEqual(1 + TWINKLE_BREATH + 1e-9);
      expect(starLook("waiting", time, 0.7, false).scale).toBe(1);
    }
    expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(0.1);
    expect(starLook("answered", 3, 0.7, true).scale).toBe(1);
  });

  it("holds an answered star still with reduced motion, just like a waiting star", () => {
    const still = starLook("answered", 0, 1.2, true);
    for (const time of times) expect(starLook("answered", time, 1.2, true)).toEqual(still);
    expect(still).toEqual(starLook("waiting", 0, 1.2, true));
  });

  it("eases the twinkle in as a star is answered", () => {
    const waiting = starLook("waiting", 3, 0.5, false).level;
    expect(starLook("answered", 3, 0.5, false, 0).level).toBe(waiting);
    const full = starLook("answered", 3, 0.5, false, 1).level;
    const half = starLook("answered", 3, 0.5, false, 0.5).level;
    expect(full).not.toBe(waiting);
    expect(half).toBeCloseTo((waiting + full) / 2, 9);
  });
});

describe("starLook: mine and others', waiting and answered", () => {
  const times = [0, 0.9, 2.2, 7.7, 19];
  const look = (kind: "waiting" | "answered", mine: boolean, time = 3, reduced = false) =>
    starLook(kind, time, 0.8, reduced, 1, mine);

  it("gives my waiting star a soft aura, and the same small white star as anyone's", () => {
    const mineWaiting = look("waiting", true);
    const theirs = look("waiting", false);
    expect(mineWaiting.aura).toBeGreaterThan(0);
    expect(theirs.aura).toBe(0);
    expect({ ...mineWaiting, aura: 0 }).toEqual(theirs);
    expect(mineWaiting.core).toBe(0xffffff);
  });

  it("gives my answered star the aura, and the twinkle", () => {
    const levels = new Set(times.map((time) => look("answered", true, time).level));
    expect(look("answered", true).aura).toBeGreaterThan(0);
    expect(levels.size).toBeGreaterThan(2);
  });

  it("gives another person's waiting star no aura: only the small core with its tight halo", () => {
    for (const time of times) {
      const other = look("waiting", false, time);
      expect(other.aura).toBe(0);
      expect(other.core).toBe(0xffffff);
    }
  });

  it("gives another person's answered star the twinkle but no aura", () => {
    const levels = new Set(times.map((time) => look("answered", false, time).level));
    expect(levels.size).toBeGreaterThan(2);
    for (const time of times) expect(look("answered", false, time).aura).toBe(0);
  });

  it("makes an answered star the same for everyone except for the aura", () => {
    for (const time of times) {
      for (const reduced of [false, true]) {
        const mine = look("answered", true, time, reduced);
        const theirs = look("answered", false, time, reduced);
        expect({ ...mine, aura: 0 }).toEqual(theirs);
      }
    }
  });

  it("keeps the aura steady (it identifies, it doesn't twinkle)", () => {
    for (const kind of ["waiting", "answered"] as const) {
      for (const time of times) expect(look(kind, true, time).aura).toBe(look(kind, true, 0).aura);
    }
  });

  it("makes the aura about 22 px in radius, dimmer than Venus's glow", () => {
    expect(MY_AURA.size / 2).toBeGreaterThanOrEqual(20);
    expect(MY_AURA.size / 2).toBeLessThanOrEqual(24);
    // Venus's inner glow is drawn at an alpha of 0.38.
    expect(MY_AURA.alpha).toBeLessThan(0.38);
    for (const u of [0.35, 1, 3]) {
      expect((MY_AURA.size * starScale(u)) / 2).toBeGreaterThanOrEqual(18);
      expect((MY_AURA.size * starScale(u)) / 2).toBeLessThanOrEqual(28);
    }
  });
});

describe("the sizes of a petition star", () => {
  const cases = [
    { kind: "waiting", mine: true },
    { kind: "waiting", mine: false },
    { kind: "answered", mine: true },
    { kind: "answered", mine: false },
  ] as const;

  it("have the same core radius and the same halo radius for waiting and answered, mine and others'", () => {
    for (const u of [0.35, 0.5, 1, 1.4, 2.4]) {
      const [first, ...rest] = cases.map(({ kind, mine }) => starSizes(kind, mine, u));
      for (const sizes of rest) {
        expect(sizes.core / 2).toBe(first!.core / 2);
        expect(sizes.halo / 2).toBe(first!.halo / 2);
      }
    }
  });

  it("are small: a core of about 1.4 px in radius and a halo of about 8 px", () => {
    const sizes = starSizes("waiting", false, 1);
    expect(sizes.core / 2).toBeGreaterThanOrEqual(1.25);
    expect(sizes.core / 2).toBeLessThanOrEqual(1.5);
    expect(sizes.halo / 2).toBeGreaterThanOrEqual(7);
    expect(sizes.halo / 2).toBeLessThanOrEqual(9);
  });

  it("give only my stars an aura, and leave every other size the same either way", () => {
    for (const kind of ["waiting", "answered"] as const) {
      const mine = starSizes(kind, true, 1);
      const theirs = starSizes(kind, false, 1);
      expect(mine.aura).toBeGreaterThan(0);
      expect(theirs.aura).toBe(0);
      expect({ ...mine, aura: 0 }).toEqual({ ...theirs, aura: 0 });
    }
  });
});
