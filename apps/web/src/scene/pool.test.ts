import { describe, expect, it } from "vitest";
import { createPool } from "./pool";

describe("createPool", () => {
  it("creates an item when none is free", () => {
    let made = 0;
    const pool = createPool(() => ({ id: ++made }));
    const first = pool.acquire();
    const second = pool.acquire();
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(true);
    expect(first.item).not.toBe(second.item);
    expect(made).toBe(2);
  });

  it("hands a released item out again instead of creating another", () => {
    let made = 0;
    const pool = createPool(() => ({ id: ++made }));
    const { item } = pool.acquire();
    pool.release(item);
    const again = pool.acquire();
    expect(again.item).toBe(item);
    expect(again.isNew).toBe(false);
    expect(made).toBe(1);
  });

  it("keeps several released items apart", () => {
    const pool = createPool(() => ({}));
    const a = pool.acquire().item;
    const b = pool.acquire().item;
    pool.release(a);
    pool.release(b);
    const reused = [pool.acquire().item, pool.acquire().item];
    expect(reused).toContain(a);
    expect(reused).toContain(b);
    expect(pool.acquire().isNew).toBe(true);
  });
});
