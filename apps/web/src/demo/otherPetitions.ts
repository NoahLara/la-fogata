/**
 * Sample petitions of other people, for looking at the sky in development (`?demo`). This module is only ever
 * loaded by a dynamic import that a production build removes, so none of this text reaches a visitor.
 */
import type { DemoPetition } from "@/data/demoSeed";
import type { Locale } from "@/i18n/locale";

const es: readonly DemoPetition[] = [
  {
    text: "Querida vida:\n\nHace tres meses que mi papá está internado y todos los días repito el mismo camino al hospital. Aprendí a contar los semáforos, a reconocer a las enfermeras por sus pasos, a no llorar en el ascensor. Hoy quiero pedir algo grande y a la vez muy pequeño: que él despierte un día y me reconozca, aunque sea un segundo. No pido que todo vuelva a ser como antes. Pido una mañana tranquila, una mano que apriete la mía, una palabra suya, la que sea.\n\nTambién pido fuerza para mí y para mi hermana, que ha cargado con más de lo que le corresponde. Que no nos peleemos por cansancio. Que podamos reírnos otra vez de las historias que él contaba, esas que ya nos sabemos de memoria.\n\nGracias por escuchar, aunque no sepa a quién le escribo.",
    prayers: 9,
    answered:
      "Ayer abrió los ojos y dijo mi nombre. Fue solo un momento, pero fue suficiente. Los médicos dicen que es un buen comienzo y que hay que ir con calma, y vamos con calma.\n\nQuería contarlo aquí porque cuando escribí esto no podía imaginar que llegaría este día. Si alguien está en un pasillo de hospital leyendo esto: aguante. Los días largos también terminan, y a veces terminan bien.",
  },
  { text: "Que mi mamá se recupere pronto", prayers: 7 },
  { text: "Paz para esta semana", prayers: 0 },
  {
    text: "Encontrar trabajo antes de fin de mes",
    prayers: 3,
    answered: "Me llamaron el viernes y empiezo el lunes",
  },
  { text: "Fuerza para seguir estudiando", prayers: 1 },
  { text: "Que mi hijo vuelva a dormir tranquilo", prayers: 12 },
  { text: "Perdonar y que me perdonen", prayers: 2 },
  { text: "Salud para mi abuelo", prayers: 5, answered: "Salió del hospital y ya está en casa" },
  { text: "Un poco de calma en mi cabeza", prayers: 0 },
  { text: "Que mi hermana encuentre su camino", prayers: 4 },
  { text: "No sentirme tan solo", prayers: 9 },
  { text: "Que el examen salga bien", prayers: 0, answered: "" },
  { text: "Valor para hablar con mi papá", prayers: 6 },
  { text: "Que lleguen las lluvias a nuestro campo", prayers: 2 },
  { text: "Sanar de lo que pasó", prayers: 15 },
  { text: "Que mi perro mejore", prayers: 1, answered: "Está jugando otra vez" },
  { text: "Esperanza para mi familia", prayers: 3 },
  { text: "Gratitud, solo gratitud", prayers: 0 },
  { text: "Que pueda pagar lo que debo", prayers: 8 },
  { text: "Un abrazo para quien lo necesita hoy", prayers: 2 },
  { text: "Que mi amigo regrese sano y salvo", prayers: 5 },
  { text: "Descansar sin miedo", prayers: 1 },
  {
    text: "Que mi matrimonio se levante",
    prayers: 10,
    answered: "Hablamos por fin, y empezamos de nuevo",
  },
  { text: "Claridad para decidir", prayers: 0 },
  { text: "Paciencia con mis hijos", prayers: 4 },
];

const en: readonly DemoPetition[] = [
  {
    text: "Dear life,\n\nMy dad has been in the hospital for three months, and every day I make the same trip. I learned to count the traffic lights, to know the nurses by their footsteps, not to cry in the elevator. Today I want to ask for something big and very small at once: that one day he wakes up and recognizes me, even for a second. I'm not asking for everything to go back to how it was. I'm asking for one quiet morning, a hand that squeezes mine, a word from him, any word.\n\nI also ask for strength, for me and for my sister, who has carried more than her share. That we don't fight out of tiredness. That we can laugh again at the stories he used to tell, the ones we know by heart.\n\nThank you for listening, even if I don't know who I'm writing to.",
    prayers: 9,
    answered:
      "Yesterday he opened his eyes and said my name. It was only a moment, but it was enough. The doctors say it's a good start and that we should go slowly, and we are going slowly.\n\nI wanted to tell it here because when I wrote this I couldn't imagine this day would come. If someone is in a hospital hallway reading this: hang in there. Long days end too, and sometimes they end well.",
  },
  { text: "That my mom recovers soon", prayers: 7 },
  { text: "Peace for this week", prayers: 0 },
  {
    text: "To find work before the month is out",
    prayers: 3,
    answered: "They called on Friday and I start Monday",
  },
  { text: "Strength to keep studying", prayers: 1 },
  { text: "That my son can sleep calmly again", prayers: 12 },
  { text: "To forgive and be forgiven", prayers: 2 },
  {
    text: "Health for my grandfather",
    prayers: 5,
    answered: "He left the hospital and he's home now",
  },
  { text: "A little calm in my head", prayers: 0 },
  { text: "That my sister finds her way", prayers: 4 },
  { text: "To not feel so alone", prayers: 9 },
  { text: "That the exam goes well", prayers: 0, answered: "" },
  { text: "Courage to talk to my dad", prayers: 6 },
  { text: "That the rains reach our fields", prayers: 2 },
  { text: "To heal from what happened", prayers: 15 },
  { text: "That my dog gets better", prayers: 1, answered: "He's playing again" },
  { text: "Hope for my family", prayers: 3 },
  { text: "Gratitude, just gratitude", prayers: 0 },
  { text: "To be able to pay what I owe", prayers: 8 },
  { text: "A hug for whoever needs one today", prayers: 2 },
  { text: "That my friend comes back safe", prayers: 5 },
  { text: "To rest without fear", prayers: 1 },
  {
    text: "That my marriage gets back on its feet",
    prayers: 10,
    answered: "We finally talked, and we're starting over",
  },
  { text: "Clarity to decide", prayers: 0 },
  { text: "Patience with my kids", prayers: 4 },
];

export const DEMO_PETITIONS: Record<Locale, readonly DemoPetition[]> = { es, en };
