import { describe, expect, it } from "vitest";
import { hasRiskSignals } from "./risk";

describe("hasRiskSignals", () => {
  it.each([
    "A veces pienso en el suicidio",
    "quiero quitarme la vida",
    "Ya no quiero vivir así",
    "QUIERO MORIR",
    "voy a matarme",
    "me quiero hacer daño",
    "I want to kill myself",
    "I don't want to live anymore",
    "I don’t want to be alive",
    "thinking about self-harm",
  ])("flags %j", (text) => {
    expect(hasRiskSignals(text)).toBe(true);
  });

  it("ignores accents and extra spaces", () => {
    expect(hasRiskSignals("quiero   quitarme  la  VIDA")).toBe(true);
    expect(hasRiskSignals("me quiero hacer daño")).toBe(hasRiskSignals("me quiero hacer dano"));
  });

  it.each([
    "",
    "Me muero de risa con mi hermano",
    "Estoy cansado del trabajo",
    "Mato el tiempo viendo series",
    "Me preocupa el examen de mañana",
    "My boss is killing me with deadlines",
  ])("does not flag %j", (text) => {
    expect(hasRiskSignals(text)).toBe(false);
  });
});
