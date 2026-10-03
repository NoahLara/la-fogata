# La Fogata

A nocturnal, anonymous web space where people sit around a campfire in real time. It is not a chat: people throw wood, hand over what weighs on them, and leave petitions that become stars. Built to keep people company on hard nights.

Visual and interaction reference: `docs/prototype/la-fogata.html` (open it in a browser). Match its look and feel.

## Product (MVP)

- Many campfires in the same forest, each a room of at most 7. Nobody ever waits: when a campfire is full, you join another. From your campfire you can see other campfires glowing far away between the trees.
- Characters: the 7 animals (panda, cat, owl, fox, capybara, rabbit, bear), one of each per campfire. Any species works in any seat. **Server rule: one of each animal per fire; you get your preferred animal if it's free, otherwise a free one.** In the UI they are called "personaje" / "character". The prototype's "souls" mode is not part of the product.
- The fire is small when the room is empty (embers and a low flame, never out) and grows a little with each connected person. Wood makes it big: each log adds fuel that burns down on its own, there is a ceiling, and each person can throw one log a minute (`WOOD_COOLDOWN_SECONDS`). Constants for the fire's size are in `apps/web/src/scene/fuel.ts`.
- Three gestures only:
  1. Throw wood: shows you are present; the fire grows, and it slowly dies down when nobody adds wood. The thrower's animal swings an arm, a log flies into the fire and it flares. Visible to the whole room.
  2. Hand over a burden: you write it and it burns in the fire. It happens 100% in the browser and is NEVER sent or stored. On the page the paper folds twice like a letter and flies to your animal's paws, so its text is never rendered in the scene. Your animal then stands, walks to the stones, leans over them, puts the folded note on the ember bed and walks back while it burns like paper. Everyone in the room sees the same ritual for anyone (the same folded note, with nothing written on it); the text must never be part of any event. When the note has burned its light rises from the flames exactly like a petition's, but goes to the middle of the sky that is passing at that moment and is born there as a shooting star that crosses and is gone (nothing more with reduced motion). The sky does not move for it, and the gestures are free again as soon as the light sets off.
  3. Leave a petition: it rises from the fire and becomes a star in the sky.
- Petition stars:
  - One shared sky across all campfires. The sky slowly rotates, so different stars pass over time.
  - Each sky shows about 30 petition stars at a time, prioritizing petitions with fewer prayers, so none goes unprayed.
  - One standard for every petition star, yours and other people's (`starLook` in `petitionStars.ts`): small and all white, never big blurry orbs. A star is a core of about 2.8 px with a tight, soft halo about 8 px in radius at a low alpha, steady while it waits. An answered star is exactly the same star as a waiting one (same core, same halo, same white) and only twinkles: no crosses, no spikes (it holds still with reduced motion). A petition star always reads clearly bigger than a background dot (1.5 px or less, plain, with a soft twinkle and no flare). Sizes scale with the screen (within limits) so they look the same on a phone; your stars keep their invisible 44 px tap targets. No gold and no blue tint. **Your own stars are identified by a soft white aura** about 22 px in radius (scaled), clearly visible but smaller and dimmer than Venus's glow; other people's stars have none, only the small core with its tight halo. There is no separate dim style for other people's stars (the demo makes about 20% of them answered), and they stay above the real pine silhouette with a margin, like yours.
  - Tap a star: see the petition and a "Pray for this" button. The star brightens and shows how many people prayed.
  - The author can mark it answered, and must say how it happened in one line (the explanation is required). The star starts to twinkle, and a shooting star crosses everyone's sky.
  - The author can return a star to the fire (no undo, after a confirmation): the star dims into a small golden light, glides in an arc down to the fire and sinks into the flames with a small flare and a few sparks. Nobody walks. With reduced motion the star just fades out. The day's petition stays used.
  - Your own stars are real buttons (a 44 px target over each). The sky is one tab stop with a roving tabindex: arrows (and Home/End) move between stars ordered by x then y, wrapping at the ends; Enter opens the star's card, a non-modal paper card with a gold edge (a bottom sheet on phones).
  - The sky is a seamless horizontal panorama about four screens wide. The moon, Venus and every star turn with it; the trees and the ground never move. **The sky is always turning by itself**, at about 10 px a second whatever the screen (so a laptop drifts as calmly as a phone; the arrows make it faster, about 16 px a second, the way they point). Nothing but these stops it: reduced motion, a finger while it is down, and an open star card, because what is read on the card must not move with the star; it goes on turning when the card closes (turning the sky by hand closes the card). Drag left or right to turn it (a tap under about 6 px still opens a star), with gentle inertia, and it goes on turning when let go. Drags only start on the sky strip above the fire and the characters. Leaving a petition does turn the sky, smoothly, to the visitor's constellation ("Mi cielo"), so the star is born where it is seen; the sky never stops there either, so the turn leads the light by its flight and the light aims at where the star will be when it arrives. A burden or a returning star never turns it, On load the view is also centred, once, on the visitor's constellation. The turn is kept as a share of the panorama, so a resize keeps the view. Only the sections on screen are drawn, and nothing runs while the tab is hidden. With `?demo`, about 200 anonymous stars of other people (a fixed density per px², about a fifth answered) are spread over the whole panorama: no text, not tappable, never inside the cluster area or its 40 px margin.
  - Turning without dragging (WCAG 2.5.7): two white arrows ("Girar el cielo a la izquierda / derecha") appear only when the mouse is near the sky's edges or one has keyboard focus, and stay in the tab order; pressing one sets the sky turning like a carousel that doesn't stop, the stars moving the way the arrow points (with reduced motion, a half-screen step). On touch, a tap on empty sky in the outer 10% at either side turns the sky one step. A star that takes keyboard focus turns the sky to bring it into view.
  - Your constellation (`constellation.ts`): your stars live in a compact cluster in the front section of the sky, not spread across it. The region is about 35% of the screen wide (at most about 520 px; about 70% on a phone), between 12% and 55% of the sky's height, clear of the moon and Venus and always above the real silhouette of the pines (the tallest pine at the star's x and just beside it, plus a margin; never behind a pine). The first star goes near the centre of the region; each new one goes 60 to 120 px (scaled by the screen) from an earlier star and at least 40 px from all of them, placed deterministically from the petition id and its position in the order you made them. When the region fills up it grows slowly around its centre (up to 1.6 times, never across the whole sky). With a single petition its aura identifies it; from two stars on, thin gold lines (about 1 px, 40% opacity, always faintly visible) join each star to its nearest earlier star, so they form a tree, not a chain: they never cross and none is longer than about 140 px (scaled). Other people's stars never get lines and never come inside the cluster area or its 40 px margin. Venus is just Venus: it hangs near the moon and turns with the sky.
  - The group of your stars is named for its counts: "Tus peticiones: {n} estrellas, {m} respondidas" (plural rules, both languages). The roving focus between your stars stays.
  - Max 140 characters, 1 petition per person per day, moderated before it is shown.
  - Petitions expire after 30 days; answered ones keep twinkling 30 more days.
  - No accounts: ownership is a secret key kept in the browser.
- **Entrance and settings** (`apps/web/src/components/settings/`, `preferences/`): nobody sits down until the welcome card says so. The card is `bark` with `gold` text and a gold edge, over the dimmed scene; it can't be closed with Esc. The card shows only once, on the first visit; after that (the `visited` flag, set when the card has faded) the visitor sits down at once with their saved character, and everything the card offered lives in the settings. The gear (44 px, bottom-left) opens the only settings: character (the 7 front silhouettes on a firelit disc, plus "Al azar"), language (the `lang` cookie) and text size (Pequeña, the default, 90% / Normal 100% / Grande 125%, set as the root font size by `html[data-text-size]`, so every rem size follows; never set text in px). Character and text size live in localStorage (try/catch). Changing character while seated keeps the seat: if free, the old one walks off and the new one arrives (`scene.replaceMember`, a fade with reduced motion); if taken here, it is saved with a gentle note. Dev-only `?skipIntro` skips the card.
- Touch the fire: receive one short random verse from a curated list (`apps/web/src/fire/words.ts`), with no reference shown unless the person taps the tiny chapter:verse number. The word from the fire uses TLA (es) and WEB (en), exact text: an entry is a whole verse or a contiguous fragment (leading "…" if it starts mid-sentence, trailing "…" where it was cut at ; , or :), up to 120 characters (aim for 90), no quotation marks, never one that names God, Lord, Yahweh, Jesus, Christ, the Spirit or the Father, and nothing that addresses the reader in the singular with a gendered word. An entry may exist in only one language; each language has its own shuffle bag. TLA's terms: at most 500 verses, non-commercial use, text unchanged. The translation notice (`fire.notice`) shows with the reference and on the About page.
- Sparks (free-text phrases) are removed; petitions replace them.
- No chat, no direct messages, no profiles, no likes, no streaks.
- Never simulate fake people in production. When you are alone, the scene shows the stars and "someone will arrive".

## Vision (never shown explicitly in the UI)

La Fogata is quietly inspired by Christian faith. It never says so; the meaning lives in symbols for those who look:

- The teepee's three main logs: the Trinity
- Throwing wood to keep the fire alive: drawing near to God (Leviticus 6:13)
- Seven seats: completeness; "where two or three gather" (Matthew 18:20)
- Petitions as stars: "Look up at the sky and count the stars" (Genesis 15:5)
- Handing over a burden: casting your anxiety on Him (1 Peter 5:7); "Cast your burden on the Lord" (Psalm 55:22)
- The word from the fire: God speaking to Moses from the burning bush (Exodus 3:2–4). Verses where God speaks in first person read as a voice from the fire.
- Ecclesiastes 4:12: a cord of three strands is not quickly broken — the three logs
- Psalm 141:2: the petition rising with the smoke (let my prayer be set before you like incense)
- Matthew 7:7: Pídelo (ask and it will be given to you)
- The shooting star: an answered prayer, and a burden that has burned

Rules: never preach, no religious vocabulary in the default UI, everyone is welcome whatever they believe, Scripture only when the user asks for it.

## Safety (non-negotiable)

- Anonymous session. Zero personal data (no email, no name, no stored IP).
- Every petition goes through moderation before it becomes a star.
- Risk messages (self-harm, suicide): never published; show the help screen with a link to https://findahelpline.com.
- Rate limits: 1 petition per day, 1 log every 5 s, prayer taps limited per session.
- The UI must state that the app keeps you company but does not replace professional help.

## Stack

- Monorepo: pnpm workspaces + Turborepo.
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind. Scene rendered with PixiJS. Petitions and UI animated with GSAP.
- `apps/realtime`: Cloudflare Workers + Durable Objects with PartyKit (`partyserver` on the server, `partysocket` on the client). One Durable Object per campfire.
- `packages/shared`: WebSocket event types and schemas with zod.
- Persistence: Supabase (Postgres) for petitions, prayer counts, reports and aggregated metrics. Presence lives in the Durable Object's memory.

## Art and scene

The scene is PixiJS in `apps/web/src/scene/`. The prototype's drawn characters are gone; the look is below.

- **Faceless silhouettes lit by the fire.** No eyes, mouth or paws. An animal is recognized by its outline (ears, tail, body shape) and a few soft colour masses. Keep the outline one smooth merged shape.
- **Art per species:** `apps/web/public/characters/<species>/{front,back,side}.svg` (webp or png also work). 512x512, transparent, 4 px per local unit, feet origin at pixel (256, 472). `front` and `back` are required; `side` is optional. The side art faces left and is mirrored for seats on the left of the fire; a species without one shows its front there. Keep the species' size differences in `SPECIES_SCALE`, not in the art.
- **Lighting is done by the engine from the seat's position, never baked into the art:** a warm gradient on the side facing the fire, shadow on the far side, and a thin warm rim hugging the edge. Seats seen from behind are almost black, backlit, with a bright rim. The art's own colours stay neutral and soft.
- **Any species must work in any seat.** People join in any order. A seat decides the view, the lighting, the log and the lean; the species decides only the art and its size. Never special-case a species in `seats.ts`.
- **Seat layout** (angles around the fire, 90° is nearest the viewer): back view at 65° and 115°, side view at 165° and 15°, front view at 225°, 255° and 300°; logs at 115°, 225° and 300°. The ring is asymmetric on purpose, so no seat is directly behind the flames, and the fire sits at its centre. Seats other than the back-view ones are squeezed to 80% sideways.
- **Everyone sits on something:** a character's feet (the bottom of its body) touch the ground line at the art's origin, or its log when it has one. A tail lying in front of the feet may reach a little below it. Don't let art float above the origin.
- **The fire** is a symmetric teepee of three thick logs (one in front, a mirrored pair behind) that cross near the top, with flame tongues climbing through the gaps. Keep it mirror-symmetric, or the flames lean to one side.
- **Sky and ground** are `sky.ts` and `ground.ts`. The static parts are baked into textures once per build (soil with pebbles, twigs and leaves, grass tufts, foreground grass), so per-frame work stays small. Only star twinkle, the shooting star and the flicker of the firelit copy of the soil change per frame. Stars come in three depth layers. There is no Milky Way: the sky is plain dark with its stars. Venus is steady (planets don't twinkle) and, with the moon, hangs in the panorama and turns with it. The ambient shooting star (one every 40 to 60 s, none with `prefers-reduced-motion`) is planned by pure, tested code in `shootingStar.ts` and never crosses the moon or Venus. The soil fades out of the haze at the horizon: there is no hard line between the trees and the ground.
- **The burden ritual** has two halves. On the page (`BurdenDialog`, `FoldingNote`, `design/fold.ts`): the title and buttons fade, the sheet folds in half twice (CSS 3D, the writing fading as the first fold starts), then the folded note shrinks and flies to the animal's paws (`scene.notePlacement`) and the scene takes it. In the scene (`scene.handOverBurden(id)`, which works for any member id, so realtime can play it for others): the member runs an errand (`errand.ts`, `planErrand` in `walk.ts`): stand up, hop down off a log, turn, walk to a spot on a flank of the stones, lean over them, put the note on the ember bed (`fire.noteLayer`, in front of the back logs and behind the flames, so it shows from every seat), and walk back by the arrival machinery. The note (`noteEffects.ts`, `noteBurn.ts`) is a grid of cells that catch from the edges with noise, glow, char, curl and break into ash flakes that rise with the embers and smoke; the fire flares. The whole thing takes about 8 s from the button, and the gesture bar is disabled meanwhile. With reduced motion nobody folds or walks: the note fades into the fire with a soft glow.
- **Dev-only URL flags**, read by `readDevFlags` and ignored in production builds: `?animal=<species>` puts one species in every seat; `?shuffle` randomizes who sits where; `?demo` adds buttons to make other animals arrive, leave or hand over a burden, and seeds anonymous stars of other people across the sky.

## Design system

The look is a night scene with warm light. Tokens live in the Tailwind `@theme` in `apps/web/src/app/globals.css`, which is the single source: components use the tokens (`bg-night`, `text-gold`, `font-title`), never raw hex values, and `src/design/contrast.test.ts` reads that file to check WCAG AA for every text pair.

- **Fonts** (`next/font/google`, self-hosted at build time, so visitors never contact Google): **Fraunces** for titles (`font-title`), **Atkinson Hyperlegible Next** for UI and body text (`font-ui`, the default), **Caveat** for what people write by hand and on the paper that burns (`font-hand`).
- **Colors:** `night` (sky, ground), `bark` and `bark-deep` (warm dark of buttons and dialogs), `ember` and `ember-soft` (the fire; primary actions), `gold` (warm light and text on dark surfaces; an answered star), `paper`, `paper-glow` and `paper-shade` (cream sheets), `ink`, `ink-soft` and `ink-faint` (dark brown written on paper; `ink-faint` only for placeholders).
- **Radius and shadows:** `rounded-sheet`, `rounded-paper`; `shadow-paper` (lit from below by the fire), `shadow-ember` (glow on the primary action), `shadow-focus`.
- **The paper rule:** whatever a person writes (a burden, later a petition) is written on a sheet of paper: warm cream, soft irregular edge (`paperOutline`), tilted about -1°, lit warmly from below; handwriting in `font-hand` and `ink` over faint ruled lines; no input borders; focus shown as a soft warm glow on the paper's edge. Text on paper is `ink` or `ink-soft`, never lighter. Anything else (menus, buttons on the scene, help screens) is `bark` with `gold` text.
- **Text in the canvas:** only the small "you" label is drawn by Pixi, which draws text once, so its font is loaded (`document.fonts.load`) before the scene starts and read from the theme (`--font-ui`). What people write never goes into the canvas.

## Conventions

- Default branch: master.
- Everything in English: code, names, comments, commits, docs, PRs.
- UI copy: Spanish (default) and English, nothing else for now. Every user-facing string, including aria labels and text drawn in the scene, lives in `apps/web/src/i18n/es.ts` and `en.ts` (same keys, enforced by `satisfies Messages` and a test); every new string goes into both. English is written to sound natural and warm, never a literal translation, and avoids the word "petition" (the gesture is "Ask", the thing in the sky is a "star"). Counts use `plural()` (Intl.PluralRules), never `"s"` tricks. The language is the `lang` cookie, else `Accept-Language` (highest-priority supported language), else Spanish; the cookie is a functional preference, not personal data.
- Strict TypeScript. `any` is forbidden.
- Every WebSocket event is defined in `packages/shared` and validated with zod on both client and server.
- Accessibility WCAG 2.2 AA: keyboard navigation, visible focus, `prefers-reduced-motion`, and petitions rendered as real DOM text (not canvas only).
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Before calling anything done: `pnpm lint && pnpm typecheck && pnpm test`.

## Phases

The web experience is built first, against the in-memory services (`apps/web/src/data`), so every gesture can be seen and tested before there is a server. Realtime comes after.

1. Static scene ✅ (scene, animals, arrival and leave animations, wood)
2. Web experience on in-memory services. Left to build, in order:
   - burden ✅
   - petition ritual: leave a petition and watch it become a star in your own sky
   - star interactions: your own stars are buttons with a card, answered (twinkling) stars and returning a star to the fire ✅. Left: rotating sky, tap other people's stars, "Estoy contigo"
   - a word from the fire ✅
   - distant campfires and the alone state
   - sound
   - the About page
3. Realtime: many campfires, presence, shared wood, other people's petitions in one shared sky
4. Persistence: Supabase for petitions, prayer counts, reports and metrics
5. Launch: moderation, crisis flow, deploy, README

Don't start a phase until the previous one is done. For large changes, propose a plan before editing.

## Commands

Requires Node >= 22 (`.nvmrc`) and pnpm (`corepack enable`).

- `pnpm install`: install all workspaces.
- `pnpm dev`: run web (http://localhost:3000) and realtime (http://localhost:8787) via Turborepo.
- `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test`: run the task in every workspace.
- `pnpm format`: Prettier over the repo.
- One workspace only: `pnpm --filter @fogata/web dev`, `pnpm --filter @fogata/realtime dev`, `pnpm --filter @fogata/shared test`.
- Done check: `pnpm lint && pnpm typecheck && pnpm test`.

Workspaces: `@fogata/web` (apps/web), `@fogata/realtime` (apps/realtime), `@fogata/shared` (packages/shared, consumed as TS source). Shared config: `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`.
