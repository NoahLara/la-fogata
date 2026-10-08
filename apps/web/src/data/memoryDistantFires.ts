import { Emitter } from "./emitter";
import type { DistantFire, DistantFireService } from "./types";

/** The other campfires, kept in this browser. There are none: only real ones will ever be listed, and they will come from the server. */
export class MemoryDistantFires implements DistantFireService {
  private list: readonly DistantFire[] = [];
  private readonly events = new Emitter<readonly DistantFire[]>();

  fires(): readonly DistantFire[] {
    return this.list;
  }

  subscribe(listener: (fires: readonly DistantFire[]) => void) {
    return this.events.subscribe(listener);
  }

  protected set(fires: readonly DistantFire[]): void {
    this.list = fires;
    this.events.emit(fires);
  }
}
