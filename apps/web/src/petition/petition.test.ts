import { describe, expect, it } from "vitest";
import { PETITION_MAX_LENGTH } from "@/data/limits";
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

  it("accepts exactly the most a petition can have and no more", () => {
    expect(canElevate("a".repeat(PETITION_MAX_LENGTH))).toBe(true);
    expect(canElevate("a".repeat(PETITION_MAX_LENGTH + 1))).toBe(false);
  });
});

describe("limitPetition", () => {
  it("cuts at the limit without splitting an emoji", () => {
    const cut = limitPetition("🙏".repeat(PETITION_MAX_LENGTH + 60));
    expect(Array.from(cut)).toHaveLength(PETITION_MAX_LENGTH);
    expect(limitPetition("hola")).toBe("hola");
  });
});

describe("petitionRemainingToAnnounce", () => {
  it("speaks only at 100, 20 and 0 left", () => {
    expect(petitionRemainingToAnnounce(PETITION_MAX_LENGTH - 100)).toBe(100);
    expect(petitionRemainingToAnnounce(PETITION_MAX_LENGTH - 20)).toBe(20);
    expect(petitionRemainingToAnnounce(PETITION_MAX_LENGTH)).toBe(0);
    expect(petitionRemainingToAnnounce(PETITION_MAX_LENGTH - 500)).toBeUndefined();
  });
});
