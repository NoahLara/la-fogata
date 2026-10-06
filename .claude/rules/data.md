---
paths:
  - "apps/web/src/data/**"
  - "apps/web/src/fire/**"
  - "apps/web/src/preferences/**"
  - "apps/web/src/petition/**"
  - "apps/web/src/burden/**"
  - "apps/web/src/demo/**"
---

# Data, petitions, the fire word and preferences

Moved out of CLAUDE.md. The web is built first against the in-memory services in `apps/web/src/data`; realtime and Supabase come later behind the same interfaces.

- The group of your stars is named for its counts: "Tus peticiones: {n} estrellas, {m} respondidas" (plural rules, both languages). The roving focus between your stars stays.
- Up to 2000 characters (answers 2000, burdens 3000; limits in `data/limits.ts` and `burden/burden.ts`), 1 petition per person per day, moderated before it is shown. A petition carries the day it was written and, once answered, the day it was answered (`createdOn`, `answered.on`, `YYYY-MM-DD`, only the day); the UI heads the letter with it (`data/dates.ts`).
- Petitions expire after 30 days; answered ones keep twinkling 30 more days.
- No accounts: ownership is a secret key kept in the browser.
- **Sitting down and settings** (`apps/web/src/components/scene/SitDown.tsx`, `components/settings/`, `preferences/`): there is no welcome card or entrance screen. As soon as the scene is ready the visitor sits down at once, as their saved character (a free one if it is taken here, or if they chose none; `SitDown`). Everything a card could have offered lives in the settings. The gear (44 px, bottom-left) opens the only settings: character (the 7 front silhouettes on a firelit disc, plus "Al azar"), language (the `lang` cookie), text size (Pequeña, the default, 90% / Normal 100% / Grande 125%, set as the root font size by `html[data-text-size]`, so every rem size follows; never set text in px) sound ("Sonido", on by default, an on/off switch) and two volume sliders (with their value shown) (the fire's crackle and the music, 50 is the normal level, the crackle starts at 75 and the music at 25). Character, text size, sound and the volumes live in localStorage (try/catch). The panel is built not to scroll: two columns from `sm` up (character and language on the left; a sound card with the switch and both volumes, and text size, on the right) and compact on a phone. Language and text size are segmented controls (`SegmentedChoice`: one wooden trough, the chosen option a raised orange piece), and the chosen character stays level, outlined in gold with a small mark: nothing in a row moves when chosen. Changing character while seated keeps the seat: if free, the old one walks off and the new one arrives (`scene.replaceMember`, a fade with reduced motion); if taken here, it is saved with a gentle note.
- The fire also answers a burden and a petition with a word, but never on top of what is still to be seen: for a burden it comes about 1.5 s after the shooting star it became has crossed and gone (`onSettled`, not when the light sets off, which is when the gestures are free again); for a petition, about 1.5 s after its star has bloomed and settled. With reduced motion there is nothing to wait for.
- Touch the fire: receive one short random verse from a curated list (`apps/web/src/fire/words.ts`), with no reference shown unless the person taps the tiny chapter:verse number. The word from the fire uses TLA (es) and WEB (en), exact text: an entry is a whole verse or a contiguous fragment (leading "…" if it starts mid-sentence, trailing "…" where it was cut at ; , or :), up to 120 characters (aim for 90), no quotation marks, never one that names God, Lord, Yahweh, Jesus, Christ, the Spirit or the Father, and nothing that addresses the reader in the singular with a gendered word. An entry may exist in only one language; each language has its own shuffle bag. TLA's terms: at most 500 verses, non-commercial use, text unchanged. The translation notice (`fire.notice`) shows with the reference and on the About page.

- Characters: the 7 animals (panda, cat, owl, fox, capybara, rabbit, bear), one of each per campfire. Any species works in any seat. **Server rule: one of each animal per fire; you get your preferred animal if it's free, otherwise a free one.** In the UI they are called "personaje" / "character". The prototype's "souls" mode is not part of the product.
- The fire is small when the room is empty (embers and a low flame, never out) and grows a little with each connected person. Wood makes it big: each log adds fuel that burns down on its own, there is a ceiling, and each person can throw one log a minute (`WOOD_COOLDOWN_SECONDS`). Constants for the fire's size are in `apps/web/src/scene/fuel.ts`.
- Sparks (free-text phrases) are removed; petitions replace them.
