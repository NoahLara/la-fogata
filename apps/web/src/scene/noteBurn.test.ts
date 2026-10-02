import { describe, expect, it } from "vitest";
import {
  buildNoteCells,
  cellStateAt,
  curlAt,
  fadeIntoFire,
  NOTE,
  NOTE_COLUMNS,
  NOTE_ROWS,
  valueNoise,
} from "./noteBurn";

describe("valueNoise", () => {
  it("is the same for the same input and always in 0..1", () => {
    expect(valueNoise(1.3, 2.7, 5)).toBe(valueNoise(1.3, 2.7, 5));
    for (let i = 0; i < 200; i++) {
      const value = valueNoise(i * 0.37, i * 0.91, 3);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("changes with the seed, and gently from one place to the next", () => {
    expect(valueNoise(2.5, 2.5, 1)).not.toBe(valueNoise(2.5, 2.5, 2));
    expect(Math.abs(valueNoise(2.5, 2.5, 1) - valueNoise(2.51, 2.5, 1))).toBeLessThan(0.05);
  });
});

describe("buildNoteCells", () => {
  const cells = buildNoteCells(11);

  it("makes a grid of cells, the same one for the same seed", () => {
    expect(cells).toHaveLength(NOTE_COLUMNS * NOTE_ROWS);
    expect(buildNoteCells(11)).toEqual(cells);
    expect(buildNoteCells(12)).not.toEqual(cells);
  });

  it("lights the edges before the middle", () => {
    const mean = (list: readonly number[]) => list.reduce((a, b) => a + b, 0) / list.length;
    const edge = cells.filter(
      (c) => c.col === 0 || c.row === 0 || c.col === NOTE_COLUMNS - 1 || c.row === NOTE_ROWS - 1,
    );
    const middle = cells.filter(
      (c) => c.col >= 4 && c.col <= NOTE_COLUMNS - 5 && c.row >= 4 && c.row <= NOTE_ROWS - 5,
    );
    expect(mean(edge.map((c) => c.ignite))).toBeLessThan(mean(middle.map((c) => c.ignite)) - 0.15);
  });

  it("has a front that is not a straight line: cells along one edge catch at different times", () => {
    const top = cells.filter((c) => c.row === 0).map((c) => c.ignite);
    expect(Math.max(...top) - Math.min(...top)).toBeGreaterThan(0.05);
    // And cells one step in from the edge are not all later than their neighbours on the edge.
    const second = cells.filter((c) => c.row === 1).map((c) => c.ignite);
    expect(new Set(second.map((value) => value.toFixed(3))).size).toBeGreaterThan(NOTE_COLUMNS / 2);
  });

  it("burns each cell in order, and finishes everything before the end", () => {
    for (const cell of cells) {
      expect(cell.ignite).toBeGreaterThan(0);
      expect(cell.char).toBeGreaterThan(cell.ignite);
      expect(cell.ash).toBeGreaterThan(cell.char);
      expect(cell.ash).toBeLessThanOrEqual(1);
    }
  });
});

describe("cellStateAt", () => {
  const [cell] = buildNoteCells(4);
  if (!cell) throw new Error("no cells");

  it("goes paper, burning, char, ash as the burn goes on", () => {
    expect(cellStateAt(cell, 0).phase).toBe("paper");
    expect(cellStateAt(cell, (cell.ignite + cell.char) / 2).phase).toBe("burning");
    expect(cellStateAt(cell, (cell.char + cell.ash) / 2).phase).toBe("char");
    expect(cellStateAt(cell, 1).phase).toBe("ash");
  });

  it("reports how far through the phase it is", () => {
    expect(cellStateAt(cell, (cell.ignite + cell.char) / 2).amount).toBeCloseTo(0.5);
  });

  it("every cell is ash at the end", () => {
    for (const each of buildNoteCells(9)) expect(cellStateAt(each, 1).phase).toBe("ash");
  });
});

describe("curlAt", () => {
  it("starts flat and ends curled and smaller, never going back", () => {
    expect(curlAt(0)).toEqual({ tilt: 0, shrink: 1 });
    expect(curlAt(1).tilt).toBeGreaterThan(0.3);
    expect(curlAt(1).shrink).toBeLessThan(0.8);
    let tilt = 0;
    for (let i = 1; i <= 20; i++) {
      const step = curlAt(i / 20);
      expect(step.tilt).toBeGreaterThanOrEqual(tilt);
      tilt = step.tilt;
    }
  });
});

describe("fadeIntoFire", () => {
  it("starts solid, ends gone with the glow back to nothing, and glows most in the middle", () => {
    expect(fadeIntoFire(0)).toEqual({ alpha: 1, glow: 0 });
    expect(fadeIntoFire(NOTE.fade).alpha).toBe(0);
    expect(fadeIntoFire(NOTE.fade).glow).toBeCloseTo(0);
    expect(fadeIntoFire(NOTE.fade / 2).glow).toBeCloseTo(1);
  });
});
