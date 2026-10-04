import type { Messages } from "./messages";

/** English. Same keys as `es.ts`: a missing or extra key fails typecheck. */
export const en = {
  meta: {
    title: "La Fogata",
    description: "A campfire for hard nights",
  },
  scene: {
    ariaLabel: "A campfire at night, with people sitting around it.",
    /** Over the visitor's own animal when they sit down. */
    you: "you",
  },
  common: {
    close: "Close",
    // Always visible near anything sensitive.
    notProfessionalHelp: "La Fogata keeps you company, but it doesn't replace professional help.",
  },
  gestures: {
    groupLabel: "Gestures by the fire",
    // The short label is what shows on wider screens; the full one is what a screen reader hears.
    wood: { label: "Wood", aria: "Throw a log on the fire" },
    burden: { label: "Burden", aria: "Hand over a burden" },
    petition: { label: "Ask", aria: "Ask for something" },
    // {seconds} is how long until they can throw wood again.
    woodCooling: "You can throw another log in {seconds} s.",
    notSeated: "You don't have a seat by the fire yet.",
    // They have a seat but are still walking to it.
    arriving: "One moment, you're still taking your seat by the fire.",
  },
  burden: {
    title: "Hand it over",
    helper: "No one will see it. It burns, and it's never saved.",
    // Faint, handwritten, on the first ruled line.
    placeholder: "Write what you're carrying here…",
    fieldLabel: "What's weighing on you",
    // Shown only in the last characters. {count} of {max} used.
    counter: "{count} of {max}",
    // Said aloud at a few points. {remaining} characters left.
    remaining: { one: "{remaining} character left.", other: "{remaining} characters left." },
    submit: "Throw it in the fire",
    cancel: "Cancel",
    afterglow: "You're not carrying it alone anymore.",
  },
  petition: {
    title: "Ask",
    helper: "It will become a star.",
    // Faint, handwritten, on the first ruled line.
    placeholder: "Write what you're asking for…",
    fieldLabel: "What you're asking for",
    // Always shown. {count} of {max} used.
    counter: "{count} of {max}",
    // Said aloud at a few points. {remaining} characters left.
    remaining: { one: "{remaining} character left.", other: "{remaining} characters left." },
    submit: "Lift it up",
    cancel: "Cancel",
    // Said, and shown, when the star has settled in the sky.
    afterglow: "It's shining in your sky now.",
    // Instead of the form, when they have already left one today.
    alreadyToday: "You've already lifted one up today. Tomorrow you can ask again.",
  },
  sky: {
    // The two buttons at the edges of the sky, an alternative to dragging it.
    turnControls: "Turn the sky",
    turnLeft: "Turn the sky left",
    turnRight: "Turn the sky right",
    // How many stars the visitor has, said as part of the name of the group of their stars.
    starCount: { one: "{count} star", other: "{count} stars" },
    answeredCount: { one: "{count} answered", other: "{count} answered" },
    // {stars} and {answered} are the two counts above, each in its plural form.
    groupLabel: "Your stars: {stars}, {answered}",
    // The name of a star for a screen reader. {text} is the start of what they asked.
    star: "Star: {text}",
    starAnswered: "Answered star: {text}",
    cardLabel: "Your star",
    answered: "Answered",
    markAnswered: "Mark as answered",
    answerFieldLabel: "How did it happen?",
    answerPlaceholder: "Write how it happened…",
    // {count} of {max} used.
    counter: "{count} of {max}",
    confirm: "Confirm",
    cancel: "Cancel",
    returnToFire: "Return it to the fire",
    returnQuestion: "Return it to the fire? This can't be undone.",
    returnConfirm: "Return it",
    // Said aloud, and shown, when the star has turned golden or gone back to the fire.
    announceAnswered: "Marked as answered.",
    announceReturned: "Returned to the fire.",
    // Gentle words when it can't be done; the star stays where it is.
    notYours: "Only the person who asked can change it. The star stays where it is.",
    noteRequired: "Write how it happened to mark it as answered.",
    notFound: "That star is gone. It stays where it is.",
    failed: "That didn't work. The star stays where it is.",
  },
  entrance: {
    title: "La Fogata",
    tagline: "A place to sit by the fire tonight. No names, no profiles.",
    enter: "Sit by the fire",
    chooseCharacter: "Choose my character",
    pickerTitle: "Choose your character",
    pickerDone: "Done",
  },
  settings: {
    // The name of the gear button, and the title of its panel.
    open: "Settings",
    title: "Settings",
    character: { legend: "Character", random: "Random" },
    language: { legend: "Language" },
    textSize: { legend: "Text size", small: "Small", normal: "Normal", large: "Large" },
    // A gentle note when the character they picked is already at this campfire; it is saved for next time.
    characterTaken: "That character is already at this fire. It'll keep you company next time.",
  },
  // The names of the 7 characters, as shown in the picker.
  species: {
    panda: "Panda",
    cat: "Cat",
    owl: "Owl",
    fox: "Fox",
    capybara: "Capybara",
    rabbit: "Rabbit",
    bear: "Bear",
  },
  fire: {
    // The name of the invisible button over the flames.
    listen: "Listen to the fire",
    // The tiny verse number under the word; it reveals the reference. {number} is like "41:10".
    showReference: "Show the reference for {number}",
    hideReference: "Hide the reference for {number}",
    // The full reference. {book} {number}, for example "Isaiah 41:10".
    reference: "{book} {number}",
    // Credit for the English text; the About page shows it too.
    notice: "Scripture: World English Bible (public domain).",
  },
  books: {
    isaiah: "Isaiah",
    psalms: "Psalm",
    matthew: "Matthew",
    hebrews: "Hebrews",
    joshua: "Joshua",
    galatians: "Galatians",
    john: "John",
    songOfSongs: "Song of Solomon",
    jeremiah: "Jeremiah",
    revelation: "Revelation",
    ecclesiastes: "Ecclesiastes",
    romans: "Romans",
    proverbs: "Proverbs",
    thessalonians1: "1 Thessalonians",
    corinthians2: "2 Corinthians",
  },
  help: {
    title: "You deserve support right now",
    body: "What you wrote burned, and no one saw it. If you're going through something really hard, talking with a person can help, and there are free helplines in almost every country.",
    // After a petition: it was never published, so nothing "burned".
    bodyPetition:
      "What you wrote never left your screen, and no one saw it. If you're going through something really hard, talking with a person can help, and there are free helplines in almost every country.",
    link: "Find a helpline",
    back: "Back to the fire",
  },
  /** Only shown with ?demo in development. */
  // The other campfires, and who comes and goes at this one.
  company: {
    // Said once when the visitor sits alone, and read as the scene's description. {count} is how many other fires burn.
    otherFires: {
      one: "There is {count} other fire burning right now.",
      other: "There are {count} other fires burning right now.",
    },
    noOtherFires: "No other fires are burning right now.",
    // Alone, with no other fires: company without promising anyone will come.
    keepsCompany: "The fire keeps you company.",
    joined: "Someone sat down by the fire.",
    left: "Someone left.",
    // One summary when several changes came within ten seconds. {count} is everyone by the fire now, the visitor included.
    summary: {
      one: "There is {count} by the fire now.",
      other: "There are {count} by the fire now.",
    },
  },
  demo: {
    groupLabel: "Demo controls",
    arrives: "Someone arrives",
    leaves: "Someone leaves",
    // Plays the ritual for someone else, to check it works for anyone.
    burden: "Someone hands over a burden",
    farFireAdd: "+ distant fire",
    farFireRemove: "− distant fire",
  },
} satisfies Messages;
