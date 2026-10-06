/**
 * Phrases that suggest someone may be thinking of hurting themselves, in Spanish and English, written without
 * accents (the text is stripped of them before matching). It leans toward false alarms: showing the help
 * screen to someone who did not need it costs little.
 */
const RISK_PATTERNS: readonly RegExp[] = [
  /suicid/,
  /quitarme la vida|quitar(me)? mi vida|acabar con mi vida|terminar con mi vida|acabar con todo/,
  /no quiero (seguir )?(vivir|existir)|ya no quiero (seguir )?(vivir|existir)/,
  /(quiero|quisiera|ojala|me gustaria) (morir|morirme|estar muert[oa]|no despertar)/,
  /ojala (me )?muriera/,
  /(voy a|quiero|pienso|planeo) matarme|me voy a matar/,
  /hacerme dano|me (quiero |voy a |podria |pienso )?hacer dano|lastimarme|autolesion|hacerme algo malo|cortarme las venas|cortarme los brazos/,
  /mejor sin mi(?=\s*([.,;!?]|$))|seria mejor (que )?(yo )?no (estuviera|existiera)|nadie me va a extranar/,
  /quiero desaparecer|no tengo ganas de vivir|ya no aguanto mas (esta )?vida|me corto a proposito|cortandome (las venas|los brazos)|me estoy cortando (las venas|los brazos)|me quiero ir de este mundo/,
  /kill myself|end my life|take my (own )?life|want to die|wanna die|hurt myself|self[- ]?harm/,
  /(do not|don't|dont) want to (live|be alive|exist)|better off without me/,
  /(please|someone|somebody|just) kill me\b|(want to|going to|gonna|wanna|just|to) end it all\b|(want|wish) (to|i (was|were)) (disappear|dead)|wish i (was|were) dead|(keep|keeps|been|started|am|i'm) cutting myself\b(?! (some )?slack)|cut myself (on purpose|again|to feel)|don't want to be here anymore|no reason to live/,
];

function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ");
}

/** True when the text has a sign that the person may be at risk. */
export function hasRiskSignals(text: string): boolean {
  const clean = plain(text);
  return RISK_PATTERNS.some((pattern) => pattern.test(clean));
}
