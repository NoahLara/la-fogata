/** Spanish, the default. Every user-facing string lives here and in `en.ts`; both must have the same keys. */
export const es = {
  meta: {
    title: "La Fogata",
    description:
      "Una fogata anónima y gratuita para las noches difíciles. Echa leña, entrega lo que te pesa y deja una petición que se vuelve estrella. Sin chat, sin perfiles.",
  },
  scene: {
    ariaLabel: "Una fogata de noche con personas sentadas alrededor.",
    /** Over the visitor's own animal when they sit down. */
    you: "tú",
    /** When the scene cannot be built, such as when the browser has no WebGL. */
    startFailed: "No pudimos encender la fogata. Recarga la página para intentarlo de nuevo.",
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
    // If it is for someone, only their first name and surname: others read it and can pray along.
    helper:
      "Se volverá una estrella. Si pides por alguien, escribe solo su nombre y su apellido, sin direcciones ni más datos, para que otros que lo lean puedan orar contigo.",
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
    star: "Tu estrella: {text}",
    starAnswered: "Tu estrella, respondida: {text}",
    // Another person's star: a waiting one is named by its text alone.
    starOther: "{text}",
    starOtherAnswered: "Respondida: {text}",
    // The name of the group of every star in the sky, for a screen reader.
    groupAll: "Estrellas del cielo",
    answered: "Respondida",
    // Read out before the date that heads a letter; the date itself is what shows.
    writtenOn: "Escrita el {date}",
    answeredOn: "Respondida el {date}",
    markAnswered: "Marcar como respondida",
    answerFieldLabel: "¿Cómo pasó?",
    answerPlaceholder: "Cuéntanos cómo pasó…",
    // Under the field where the author tells how it was answered.
    answerHelper: "Cuéntanos cómo pasó, para que otros crean y su fe en la Fogata crezca.",
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
    // Another person's star. The card has no visible words except in reporting: what follows is for screen readers.
    otherCardLabel: "Una petición",
    accompany: "Estoy contigo",
    accompanyCount: {
      one: "{count} persona acompaña esto",
      other: "{count} personas acompañan esto",
    },
    ownAccompanyCount: {
      one: "{count} persona te acompaña",
      other: "{count} personas te acompañan",
    },
    announceAccompanied: "Alguien te acompaña.",
    // Said to a screen reader (and not shown) when the taps allowed in a session have run out.
    tooMany: "Por ahora es suficiente. Puedes acompañar otra más tarde.",
    // Reporting is a safety feature, so these are the only words shown on the card.
    report: "Reportar",
    reportQuestion: "¿Reportar esta petición?",
    reportConfirm: "Reportar",
    reportDone: "Gracias. Ya no la verás.",
  },
  // The screen shown while the scene is being built.
  loading: {
    lighting: "Encendiendo la fogata…",
  },
  settings: {
    // The name of the gear button, and the title of its panel.
    open: "Ajustes",
    title: "Ajustes",
    character: { legend: "Personaje", random: "Al azar" },
    language: { legend: "Idioma" },
    textSize: { legend: "Tamaño del texto", small: "Pequeña", normal: "Normal", large: "Grande" },
    // A gentle note when the character they picked is already at this campfire; it is saved for next time.
    characterTaken: "Ese personaje ya está en esta fogata. Te acompañará la próxima vez.",
    sound: { legend: "Sonido", on: "Activado", off: "Desactivado" },
    crackle: { legend: "Volumen del crepitar del fuego" },
    music: { legend: "Volumen de la música" },
  },
  // The names of the 7 characters, as shown in the picker.
  species: {
    panda: "Panda",
    cat: "Gato",
    owl: "Búho",
    fox: "Zorro",
    capybara: "Capibara",
    rabbit: "Conejo",
    bear: "Oso",
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
  // When what someone wrote is not taken: insults, swearing, or nothing readable. Said gently, never naming the word.
  moderation: {
    offensive:
      "La Fogata no es para esto. Escríbelo sin insultos ni groserías: aquí cabe todo lo que cargas.",
    unreadable:
      "La Fogata es para palabras de verdad. Cuéntalo con las tuyas: aquí cabe lo que sientes.",
  },
  // The terms people agree to once, and can read again in the settings.
  terms: {
    title: "Antes de sentarte",
    intro: "Son pocas reglas, escritas claras. Léelas con calma.",
    company: {
      heading: "Compañía, no ayuda profesional",
      body: "La Fogata te acompaña, pero no es terapia, ni atención médica, ni un servicio de emergencia, y no reemplaza la ayuda profesional. Si estás en peligro o piensas en hacerte daño, busca ayuda ahora mismo.",
    },
    age: {
      heading: "Edad",
      body: "La Fogata es para personas de 16 años o más. Si tienes menos, pide permiso a tu madre, padre o tutor antes de entrar.",
    },
    privacy: {
      heading: "Anonimato y privacidad",
      body: "No hay cuentas ni datos personales: no te pedimos nombre ni correo y no guardamos tu dirección IP. En tu navegador solo se guarda lo necesario para que todo funcione: tus ajustes, la clave secreta de tus estrellas y esta aceptación. Lo que entregas como carga se escribe y se quema en tu navegador: nunca se envía ni se guarda.",
    },
    petitions: {
      heading: "Lo que dejas en una petición",
      body: "Antes de mostrarse, una petición se revisa. Luego se ve como una estrella, sin nombre, para todas las personas del bosque. Al dejarla nos permites mostrarla así mientras dura (30 días, y 30 más si la marcas como respondida). Sigue siendo tuya: si la devuelves al fuego, deja de mostrarse. No escribas datos tuyos ni de otras personas, como nombres, teléfonos o direcciones.",
    },
    respect: {
      heading: "Convivencia",
      body: "No escribas odio, acoso, amenazas, contenido sexual o ilegal, publicidad ni spam, ni nada que haga daño a otras personas. Podemos retirar una petición, o limitar el acceso, para cuidar a quienes están aquí. Lo que muestra señales de riesgo no se publica: en su lugar te mostramos dónde encontrar ayuda.",
    },
    liability: {
      heading: "Sin garantías",
      body: "La Fogata se ofrece tal cual, sin garantía de que esté siempre disponible ni libre de errores. Eres responsable de lo que escribes. Las demás personas son desconocidas: no compartas nada que no quieras que sepan. En la medida en que la ley lo permita, no respondemos por daños derivados del uso de La Fogata ni por lo que otras personas escriban.",
    },
    changes: {
      heading: "Cambios",
      body: "Si estas condiciones cambian de forma importante, te lo volveremos a preguntar. Puedes releerlas cuando quieras en Ajustes.",
    },
    accept: "Acepto y entro",
    acceptNote: "Al tocar «Acepto y entro» confirmas que las leíste y estás de acuerdo.",
    open: "Términos y privacidad",
  },
  // The other campfires, and who comes and goes at this one.
  company: {
    // Said once when the visitor sits alone, and read as the scene's description. {count} is how many other fires burn.
    otherFires: {
      one: "Hay {count} fogata más encendida ahora.",
      other: "Hay {count} fogatas más encendidas ahora.",
    },
    noOtherFires: "No hay otras fogatas encendidas ahora.",
    // Alone, with no other fires: company without promising anyone will come.
    keepsCompany: "El fuego te acompaña.",
    joined: "Alguien se sentó junto al fuego.",
    left: "Alguien se fue.",
    // One summary when several changes came within ten seconds. {count} is everyone by the fire now, the visitor included.
    summary: {
      one: "Ahora hay {count} junto al fuego.",
      other: "Ahora son {count} junto al fuego.",
    },
  },
} as const;
