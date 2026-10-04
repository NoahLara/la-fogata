import type { Random } from "@/scene/random";
import { randomInt } from "@/scene/math";
import { Emitter } from "./emitter";
import type { DistantFire, DistantFireService } from "./types";

/**
 * The other campfires, kept in this browser. There are none: only real ones will ever be listed, and they will
 * come from the server. `addDemo` and `removeDemo` are for `?demo` alone, so the scene can be seen with some.
 */
export class MemoryDistantFires implements DistantFireService {
  private list: readonly DistantFire[] = [];
  private readonly events = new Emitter<readonly DistantFire[]>();
  private next = 1;

  constructor(private readonly rand: Random) {}

  fires(): readonly DistantFire[] {
    return this.list;
  }

  subscribe(listener: (fires: readonly DistantFire[]) => void) {
    return this.events.subscribe(listener);
  }

  /** Demo only: another campfire lights, with a few people at it. */
  addDemo(): void {
    this.set([...this.list, { id: `fire-${this.next++}`, people: randomInt(this.rand, 1, 7) }]);
  }

  /** Demo only: the most recently lit demo campfire goes out. */
  removeDemo(): void {
    this.set(this.list.slice(0, -1));
  }

  private set(fires: readonly DistantFire[]): void {
    this.list = fires;
    this.events.emit(fires);
  }
}
