/** Every user-facing string lives here so another language can be added later. */
export const es = {
  scene: {
    ariaLabel: "Una fogata de noche con personas sentadas alrededor.",
  },
  /** Only shown with ?demo in development. */
  demo: {
    groupLabel: "Controles de demostración",
    arrives: "Alguien llega",
    leaves: "Alguien se va",
    throws: "Echar leña",
    // {seconds} is how long until someone can throw wood again.
    nobodyReady: "Todos esperan para echar más leña ({seconds} s).",
  },
} as const;
