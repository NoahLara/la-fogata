/** Every user-facing string lives here so another language can be added later. */
export const es = {
  scene: {
    ariaLabel: "Una fogata de noche con personas sentadas alrededor.",
    /** Over the visitor's own animal when they sit down. */
    you: "tú",
  },
  common: {
    close: "Cerrar",
    // Always visible near anything sensitive.
    notProfessionalHelp: "La Fogata te acompaña, pero no reemplaza la ayuda profesional.",
  },
  gestures: {
    groupLabel: "Gestos junto al fuego",
    // The short label is what shows on wider screens; the full one is what a screen reader hears.
    wood: { label: "Leña", aria: "Echar leña" },
    burden: { label: "Carga", aria: "Entregar una carga" },
    petition: { label: "Petición", aria: "Dejar una petición" },
    // {seconds} is how long until they can throw wood again.
    woodCooling: "Podrás echar más leña en {seconds} s.",
    notSeated: "Todavía no tienes un lugar junto a la fogata.",
    // They have a seat but are still walking to it.
    arriving: "Un momento, todavía te estás sentando junto al fuego.",
  },
  burden: {
    title: "Entrégalo",
    helper: "Nadie lo verá. Se quema y no se guarda.",
    // Faint, handwritten, on the first ruled line.
    placeholder: "Escribe aquí lo que cargas…",
    fieldLabel: "Lo que te pesa",
    // Shown only in the last characters. {count} of {max} used.
    counter: "{count} de {max}",
    // Said aloud at a few points. {remaining} characters left.
    remaining: "Te quedan {remaining} caracteres.",
    submit: "Echar al fuego",
    cancel: "Cancelar",
    afterglow: "Ya no lo cargas a solas.",
  },
  petition: {
    title: "Dejar una petición",
    comingSoon: "Pronto podrás dejar una petición y verla subir desde el fuego hasta el cielo.",
  },
  help: {
    title: "Mereces apoyo ahora",
    body: "Lo que escribiste se quemó y nadie lo vio. Si estás pasando por algo muy difícil, hablar con una persona puede ayudar, y hay líneas de ayuda gratuitas en casi todos los países.",
    link: "Encontrar una línea de ayuda",
    back: "Volver a la fogata",
  },
  /** Only shown with ?demo in development. */
  demo: {
    groupLabel: "Controles de demostración",
    arrives: "Alguien llega",
    leaves: "Alguien se va",
    // Plays the ritual for someone else, to check it works for anyone.
    burden: "Alguien entrega una carga",
  },
} as const;

/** The page that lists help lines in every country. */
export const HELPLINE_URL = "https://findahelpline.com";
