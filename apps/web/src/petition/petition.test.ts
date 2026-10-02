import { describe, expect, it } from "vitest";
import { canElevate, limitPetition, petitionRemainingToAnnounce } from "./petition";

describe("canElevate", () => {
  it("accepts short petitions like Paz and Fe", () => {
    expect(canElevate("Fe")).toBe(true);
    expect(canElevate("Paz")).toBe(true);
  });

  it("rejects a single character, spaces and the empty sheet", () => {
    expect(canElevate("a")).toBe(false);
    expect(canElevate("  a  ")).toBe(false);
    expect(canElevate("")).toBe(false);
  });

  it("accepts exactly 140 characters and no more", () => {
    expect(canElevate("a".repeat(140))).toBe(true);
    expect(canElevate("a".repeat(141))).toBe(false);
  });
});

describe("limitPetition", () => {
  it("cuts at 140 characters without splitting an emoji", () => {
    const cut = limitPetition("🙏".repeat(200));
    expect(Array.from(cut)).toHaveLength(140);
    expect(limitPetition("hola")).toBe("hola");
  });
});

describe("petitionRemainingToAnnounce", () => {
  it("speaks only at 50, 10 and 0 left", () => {
    expect(petitionRemainingToAnnounce(90)).toBe(50);
    expect(petitionRemainingToAnnounce(130)).toBe(10);
    expect(petitionRemainingToAnnounce(140)).toBe(0);
    expect(petitionRemainingToAnnounce(100)).toBeUndefined();
  });
});
