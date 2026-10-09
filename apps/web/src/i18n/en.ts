import type { Messages } from "./messages";

/** English. Same keys as `es.ts`: a missing or extra key fails typecheck. */
export const en = {
  meta: {
    title: "La Fogata",
    description:
      "A free, anonymous campfire for hard nights. Throw wood, hand over what weighs on you, and leave an ask that becomes a star. No chat, no profiles.",
  },
  scene: {
    ariaLabel: "A campfire at night, with people sitting around it.",
    /** Over the visitor's own animal when they sit down. */
    you: "you",
    /** When the scene cannot be built, such as when the browser has no WebGL. */
    startFailed: "We couldn't light the fire. Reload the page to try again.",
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
    // If it is for someone, only their first name and surname: others read it and can pray along.
    helper:
      "It will become a star. If you're asking for someone, write only their first and last name, with no address or other details, so others who read it can pray with you.",
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
    star: "Your star: {text}",
    starAnswered: "Your star, answered: {text}",
    // Another person's star: a waiting one is named by its text alone.
    starOther: "{text}",
    starOtherAnswered: "Answered: {text}",
    // The name of the group of every star in the sky, for a screen reader.
    groupAll: "Stars in the sky",
    answered: "Answered",
    // Read out before the date that heads a letter; the date itself is what shows.
    writtenOn: "Written on {date}",
    answeredOn: "Answered on {date}",
    markAnswered: "Mark as answered",
    answerFieldLabel: "How did it happen?",
    answerPlaceholder: "Tell us how it happened…",
    // Under the field where the author tells how it was answered.
    answerHelper:
      "Tell us how it happened, so others can believe and their faith in La Fogata grows.",
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
    // Another person's star. The card has no visible words except in reporting: what follows is for screen readers.
    otherCardLabel: "A star",
    accompany: "I'm with you",
    accompanyCount: { one: "{count} person is with this", other: "{count} people are with this" },
    ownAccompanyCount: { one: "{count} person is with you", other: "{count} people are with you" },
    announceAccompanied: "Someone is with you.",
    // Said to a screen reader (and not shown) when the taps allowed in a session have run out.
    tooMany: "That's enough for now. You can be with another one later.",
    // Reporting is a safety feature, so these are the only words shown on the card.
    report: "Report",
    reportQuestion: "Report this star?",
    reportConfirm: "Report",
    reportDone: "Thank you. You won't see it again.",
  },
  // The screen shown while the scene is being built.
  loading: {
    lighting: "Lighting the fire…",
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
    sound: { legend: "Sound", on: "On", off: "Off" },
    crackle: { legend: "Fire crackle volume" },
    music: { legend: "Music volume" },
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
  // When what someone wrote is not taken: insults, swearing, or nothing readable. Said gently, never naming the word.
  moderation: {
    offensive:
      "La Fogata isn't for this. Please write it without insults or swearing: there's room here for everything you carry.",
    unreadable:
      "La Fogata is for real words. Put it in your own: there's room here for what you feel.",
  },
  // The terms people agree to once, and can read again in the settings.
  terms: {
    title: "Before you sit down",
    intro: "There are only a few rules, written plainly. Take your time.",
    company: {
      heading: "Company, not professional help",
      body: "La Fogata keeps you company, but it isn't therapy, medical care or an emergency service, and it doesn't replace professional help. If you're in danger or thinking of hurting yourself, please reach out for help right now.",
    },
    age: {
      heading: "Age",
      body: "La Fogata is for people aged 16 or older. If you're younger, please ask a parent or guardian before coming in.",
    },
    privacy: {
      heading: "Anonymous and private",
      body: "There are no accounts and no personal data: we don't ask for your name or email, and we don't keep your IP address. Your browser keeps only what's needed for things to work: your settings, the secret key to your stars and this agreement. A burden you hand over is written and burned in your browser: it is never sent or saved.",
    },
    petitions: {
      heading: "What you leave in a star",
      body: "Before it's shown, what you write is reviewed. Then it appears as a star, with no name, for everyone in the forest. By leaving it you let us show it that way for as long as it lasts (30 days, and 30 more if you mark it answered). It stays yours: if you send it back to the fire, it stops being shown. Please don't write personal details about yourself or others, like names, phone numbers or addresses.",
    },
    respect: {
      heading: "Living together",
      body: "Please don't write hate, harassment, threats, sexual or illegal content, ads or spam, or anything that hurts other people. We may remove a star, or limit access, to look after the people here. Anything that shows signs of risk isn't published: instead we show you where to find help.",
    },
    liability: {
      heading: "No guarantees",
      body: "La Fogata is offered as it is, with no promise that it will always be available or free of errors. You are responsible for what you write. The other people here are strangers: don't share anything you wouldn't want them to know. To the extent the law allows, we aren't liable for harm that comes from using La Fogata or from what other people write.",
    },
    changes: {
      heading: "Changes",
      body: "If these terms change in a way that matters, we'll ask you again. You can read them any time in Settings.",
    },
    accept: "I agree, take me in",
    acceptNote: "By tapping “I agree, take me in” you confirm you've read this and you agree.",
    open: "Terms and privacy",
  },
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
} satisfies Messages;
