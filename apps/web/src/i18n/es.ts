/** Spanish, the default. Every user-facing string lives here and in `en.ts`; both must have the same keys. */
export const es = {
  meta: {
    title: "La Fogata",
    description: "Una fogata para las noches difíciles",
  },
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
    remaining: {
      one: "Te queda {remaining} carácter.",
      other: "Te quedan {remaining} caracteres.",
    },
    submit: "Echar al fuego",
    cancel: "Cancelar",
    afterglow: "Ya no lo cargas a solas.",
  },
  petition: {
    title: "Pídelo",
    helper: "Se volverá una estrella.",
    // Faint, handwritten, on the first ruled line.
    placeholder: "Escribe lo que pides…",
    fieldLabel: "Lo que pides",
    // Always shown. {count} of {max} used.
    counter: "{count} de {max}",
    // Said aloud at a few points. {remaining} characters left.
    remaining: {
      one: "Te queda {remaining} carácter.",
      other: "Te quedan {remaining} caracteres.",
    },
    submit: "Elevar",
    cancel: "Cancelar",
    // Said, and shown, when the star has settled in the sky.
    afterglow: "Ya brilla en tu cielo.",
    // Instead of the form, when they have already left one today.
    alreadyToday: "Ya elevaste una hoy. Mañana podrás pedir otra.",
  },
  sky: {
    // The two buttons at the edges of the sky, an alternative to dragging it.
    turnControls: "Girar el cielo",
    turnLeft: "Girar el cielo a la izquierda",
    turnRight: "Girar el cielo a la derecha",
    // How many stars the visitor has, said as part of the name of the group of their stars.
    starCount: { one: "{count} estrella", other: "{count} estrellas" },
    answeredCount: { one: "{count} respondida", other: "{count} respondidas" },
    // {stars} and {answered} are the two counts above, each in its plural form.
    groupLabel: "Tus peticiones: {stars}, {answered}",
    // The name of a star for a screen reader. {text} is the start of the petition.
    star: "Petición: {text}",
    starAnswered: "Petición respondida: {text}",
    cardLabel: "Tu petición",
    answered: "Respondida",
    markAnswered: "Marcar como respondida",
    answerFieldLabel: "¿Cómo pasó?",
    answerPlaceholder: "Cuenta cómo pasó…",
    // {count} of {max} used.
    counter: "{count} de {max}",
    confirm: "Confirmar",
    cancel: "Cancelar",
    returnToFire: "Regresar petición a la fogata",
    returnQuestion: "¿Regresarla a la fogata? No se puede deshacer.",
    returnConfirm: "Regresar",
    // Said aloud, and shown, when the star has turned golden or gone back to the fire.
    announceAnswered: "Marcada como respondida.",
    announceReturned: "Regresó a la fogata.",
    // Gentle words when it can't be done; the star stays where it is.
    notYours: "Solo quien la pidió puede cambiarla. La estrella sigue en su lugar.",
    noteRequired: "Cuenta cómo pasó para marcarla como respondida.",
    notFound: "Esa petición ya no está. La estrella sigue en su lugar.",
    failed: "No se pudo. La estrella sigue en su lugar.",
  },
  fire: {
    // The name of the invisible button over the flames.
    listen: "Escuchar al fuego",
    // The tiny verse number under the word; it reveals the reference. {number} is like "41:10".
    showReference: "Ver la referencia de {number}",
    hideReference: "Ocultar la referencia de {number}",
    // The full reference. {book} {number}, for example "Isaías 41:10".
    reference: "{book} {number}",
    // Credit for the Spanish text. Exactly as the publisher asks; the About page shows it too.
    notice:
      "Texto bíblico: Traducción en lenguaje actual™ © Sociedades Bíblicas Unidas, 2002, 2004. Utilizado con permiso.",
  },
  books: {
    isaiah: "Isaías",
    psalms: "Salmos",
    matthew: "Mateo",
    hebrews: "Hebreos",
    joshua: "Josué",
    galatians: "Gálatas",
    john: "Juan",
    songOfSongs: "Cantares",
    jeremiah: "Jeremías",
    revelation: "Apocalipsis",
    ecclesiastes: "Eclesiastés",
    romans: "Romanos",
    proverbs: "Proverbios",
    thessalonians1: "1 Tesalonicenses",
    corinthians2: "2 Corintios",
  },
  help: {
    title: "Mereces apoyo ahora",
    body: "Lo que escribiste se quemó y nadie lo vio. Si estás pasando por algo muy difícil, hablar con una persona puede ayudar, y hay líneas de ayuda gratuitas en casi todos los países.",
    // After a petition: it was never published, so nothing "burned".
    bodyPetition:
      "Lo que escribiste no salió de tu pantalla y nadie lo vio. Si estás pasando por algo muy difícil, hablar con una persona puede ayudar, y hay líneas de ayuda gratuitas en casi todos los países.",
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
