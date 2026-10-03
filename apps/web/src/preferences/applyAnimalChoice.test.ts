import { describe, expect, it } from "vitest";
import { MemoryPresence } from "@/data/memoryPresence";
import { createRandom } from "@/scene/random";
import { applyAnimalChoice } from "./applyAnimalChoice";

function fire() {
  return new MemoryPresence({
    seatCount: 7,
    rand: createRandom(3),
    initial: [{ id: "other", species: "owl", seat: 0 }],
  });
}

describe("applyAnimalChoice", () => {
  it("changes a seated visitor to a free animal, in the same seat", async () => {
    const presence = fire();
    const me = await presence.join("fox");
    expect(me?.species).toBe("fox");
    expect(await applyAnimalChoice("cat", presence)).toBe("changed");
    expect(presence.self).toMatchObject({ id: me?.id, seat: me?.seat, species: "cat" });
  });

  it("says it is taken, and changes nothing, when another animal here is that one", async () => {
    const presence = fire();
    const me = await presence.join("fox");
    expect(await applyAnimalChoice("owl", presence)).toBe("taken");
    expect(presence.self).toEqual(me);
  });

  it("just saves it when the visitor is not seated yet, or chose random", async () => {
    const presence = fire();
    expect(await applyAnimalChoice("cat", presence)).toBe("saved");
    await presence.join("fox");
    expect(await applyAnimalChoice("random", presence)).toBe("saved");
    expect(await applyAnimalChoice("fox", presence)).toBe("saved");
  });
});
