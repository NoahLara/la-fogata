import { describe, expect, it } from "vitest";
import { applyChains, chainWeight, compileChain, compileChains, type Chain } from "./deform";

const ear: Chain = {
  path: [
    { x: 0, y: 0 },
    { x: 0, y: -10 },
  ],
  width: 4,
  falloff: 3,
};

/** A grid of vertices, 1 unit apart, covering -20..20. */
function grid(): Float32Array {
  const points: number[] = [];
  for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) points.push(x, y);
  return Float32Array.from(points);
}

describe("chainWeight", () => {
  it("is zero at the base, so the base stays put", () => {
    expect(chainWeight(ear, { x: 0, y: 0 })).toBe(0);
  });

  it("is zero behind the base and far from the part", () => {
    expect(chainWeight(ear, { x: 0, y: 8 })).toBe(0);
    expect(chainWeight(ear, { x: 12, y: -5 })).toBe(0);
    expect(chainWeight(ear, { x: 0, y: -12 })).toBeGreaterThan(0.99);
    expect(chainWeight(ear, { x: 0, y: -30 })).toBe(0);
  });

  it("is full at the tip and beyond it, and grows along the part", () => {
    expect(chainWeight(ear, { x: 0, y: -10 })).toBe(1);
    expect(chainWeight(ear, { x: 0, y: -2 })).toBeLessThan(chainWeight(ear, { x: 0, y: -6 }));
  });

  it("fades smoothly across the edge, with no jump", () => {
    let previous = chainWeight(ear, { x: 3, y: -8 });
    for (let x = 3; x <= 8; x += 0.05) {
      const weight = chainWeight(ear, { x, y: -8 });
      expect(Math.abs(weight - previous)).toBeLessThan(0.1);
      expect(weight).toBeLessThanOrEqual(previous + 1e-9);
      previous = weight;
    }
    expect(chainWeight(ear, { x: 7, y: -8 })).toBe(0);
  });
});

describe("compileChain / applyChains", () => {
  const rest = grid();
  const compiled = compileChain(rest, ear);

  it("only picks vertices near the part", () => {
    for (const i of compiled.indices) {
      expect(Math.abs(rest[2 * i] as number)).toBeLessThanOrEqual(7);
    }
    expect(compiled.indices.length).toBeGreaterThan(20);
    expect(compiled.indices.length).toBeLessThan(rest.length / 2 / 4);
  });

  it("leaves everything as it was when the angle is zero", () => {
    const out = new Float32Array(rest.length);
    applyChains(rest, out, [compiled], [0]);
    expect(Array.from(out)).toEqual(Array.from(rest));
  });

  it("moves only the vertices of the part, and keeps each at its distance from the pivot", () => {
    const out = new Float32Array(rest.length);
    applyChains(rest, out, [compiled], [0.3]);
    const moved = new Set(compiled.indices);
    let changed = 0;
    for (let i = 0; i < rest.length / 2; i++) {
      const same = out[2 * i] === rest[2 * i] && out[2 * i + 1] === rest[2 * i + 1];
      if (!moved.has(i)) expect(same).toBe(true);
      if (!same) {
        changed++;
        const before = Math.hypot(rest[2 * i] as number, rest[2 * i + 1] as number);
        const after = Math.hypot(out[2 * i] as number, out[2 * i + 1] as number);
        expect(after).toBeCloseTo(before, 4);
      }
    }
    expect(changed).toBeGreaterThan(10);
  });

  it("turns the tip clockwise on screen for a positive angle", () => {
    const out = new Float32Array(rest.length);
    applyChains(rest, out, [compiled], [0.3]);
    const tip = rest.findIndex((_, i) => i % 2 === 0 && rest[i] === 0 && rest[i + 1] === -10) / 2;
    expect(out[2 * tip] as number).toBeGreaterThan(1);
    expect(out[2 * tip + 1] as number).toBeGreaterThan(-10);
  });

  it("can be applied again after a movement and returns exactly to rest", () => {
    const out = new Float32Array(rest.length);
    applyChains(rest, out, [compiled], [0.3]);
    applyChains(rest, out, [compiled], [0]);
    expect(Array.from(out)).toEqual(Array.from(rest));
  });
});

describe("compileChains with neighbours", () => {
  const rest = grid();
  /** Two ears 8 units apart, so wide that each reaches into the other. */
  const left: Chain = {
    path: [
      { x: -4, y: 0 },
      { x: -4, y: -12 },
    ],
    width: 6,
    falloff: 3,
    group: "ear",
  };
  const right: Chain = {
    path: [
      { x: 4, y: 0 },
      { x: 4, y: -12 },
    ],
    width: 6,
    falloff: 3,
    group: "ear",
  };

  const moved = (compiled: ReturnType<typeof compileChains>, chain: number) => {
    const out = new Float32Array(rest.length);
    applyChains(
      rest,
      out,
      compiled,
      compiled.map((_, i) => (i === chain ? 0.4 : 0)),
    );
    const same = (i: number) => out[2 * i] === rest[2 * i] && out[2 * i + 1] === rest[2 * i + 1];
    const at = (x: number, y: number) =>
      rest.findIndex((_, i) => i % 2 === 0 && rest[i] === x && rest[i + 1] === y) / 2;
    return { same, at };
  };

  it("lets a vertex follow either neighbour without them, but only the nearer with them", () => {
    const alone = compileChains(rest, [
      { ...left, group: undefined },
      { ...right, group: undefined },
    ]);
    const together = compileChains(rest, [left, right]);
    // On the right ear's own axis, up near its tip.
    const onRight = (compiled: typeof alone) => {
      const { same, at } = moved(compiled, 0);
      return !same(at(4, -10));
    };
    expect(onRight(alone)).toBe(true);
    expect(onRight(together)).toBe(false);
  });

  it("still moves everything of the ear that is moving", () => {
    const together = compileChains(rest, [left, right]);
    const { same, at } = moved(together, 0);
    expect(same(at(-4, -10))).toBe(false);
    expect(same(at(-5, -8))).toBe(false);
  });

  it("splits the vertices midway between neighbours", () => {
    const [a, b] = compileChains(rest, [left, right]);
    const index = rest.findIndex((_, i) => i % 2 === 0 && rest[i] === 0 && rest[i + 1] === -10) / 2;
    const weightOf = (c: NonNullable<typeof a>) =>
      c.weights[Array.from(c.indices).indexOf(index)] ?? 0;
    expect(weightOf(a!)).toBeCloseTo(weightOf(b!), 5);
  });

  it("does not make chains in no group compete", () => {
    const [x, y] = compileChains(rest, [
      { ...left, group: undefined },
      { ...right, group: undefined },
    ]);
    const index = rest.findIndex((_, i) => i % 2 === 0 && rest[i] === 0 && rest[i + 1] === -10) / 2;
    expect(Array.from(x!.indices)).toContain(index);
    expect(Array.from(y!.indices)).toContain(index);
  });
});
