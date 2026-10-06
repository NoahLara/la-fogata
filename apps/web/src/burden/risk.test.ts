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
    "quiero desaparecer",
    "No tengo ganas de vivir",
    "me corto a proposito",
    "I want to disappear",
    "I wish I were dead",
    "I just want to end it all",
    "I keep cutting myself",
    "I don't want to be here anymore",
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
    "Quiero un futuro mejor sin miedo",
    "Estar mejor sin mil deudas",
    "Me corto el pelo mañana",
    "Me corto las uñas",
    "Me corto cuando hablo en público",
    "Estaba cortándome el pelo",
    "Estoy mejor sin mi ex",
    "In the end it all worked out",
    "At the end it all made sense",
    "I'm cutting myself some slack",
    "I cut myself shaving",
    "This exam is going to kill me",
    "I don't want to be here alone tonight",
  ])("does not flag %j", (text) => {
    expect(hasRiskSignals(text)).toBe(false);
  });
});
