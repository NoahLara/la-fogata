# La Fogata

A nocturnal, anonymous web space where people sit around a campfire in real time. It is not a chat: people throw wood, hand over what weighs on them, and leave petitions that become stars. Built to keep people company on hard nights.

Visual and interaction reference: `docs/prototype/la-fogata.html` (open it in a browser). Match its look and feel.

## Product (MVP)

- Many campfires in the same forest, each a room of at most 7. Nobody ever waits: when a campfire is full, you join another. From your campfire you can see other campfires glowing far away between the trees.
- Characters: the 7 animals (panda, cat, owl, fox, capybara, rabbit, bear), one of each per campfire. Any species works in any seat. If your animal is taken, you get a free one. The prototype's "souls" mode is not part of the product.
- The fire is small when the room is empty (embers and a low flame, never out) and grows a little with each connected person. Wood makes it big: each log adds fuel that burns down on its own, there is a ceiling, and each person can throw one log a minute (`WOOD_COOLDOWN_SECONDS`). Constants for the fire's size are in `apps/web/src/scene/fuel.ts`.
- Three gestures only:
  1. Throw wood: shows you are present; the fire grows, and it slowly dies down when nobody adds wood. The thrower's animal swings an arm, a log flies into the fire and it flares. Visible to the whole room.
  2. Hand over a burden: you write it and it burns in the fire. It happens 100% in the browser and is NEVER sent or stored.
  3. Leave a petition: it rises from the fire and becomes a star in the sky.
- Petition stars:
  - One shared sky across all campfires. The sky slowly rotates, so different stars pass over time.
  - Each sky shows about 30 petition stars at a time, prioritizing petitions with fewer prayers, so none goes unprayed.
  - Tap a star: see the petition and a "Pray for this" button. The star brightens and shows how many people prayed.
  - The author can mark it answered and add one optional line. The star turns golden, and a shooting star crosses everyone's sky.
  - A "find my stars" button highlights your own petition stars.
  - Max 140 characters, 1 petition per person per day, moderated before it is shown.
  - Petitions expire after 30 days; answered ones stay golden 30 more days.
  - No accounts: ownership is a secret key kept in the browser.
- Touch the fire: receive one short random verse from a curated list, in a modern translation, with no reference shown. The translation credit goes in an About page.
- Sparks (free-text phrases) are removed; petitions replace them.
- No chat, no direct messages, no profiles, no likes, no streaks.
- Never simulate fake people in production. When you are alone, the scene shows the stars and "someone will arrive".

## Vision (never shown explicitly in the UI)

La Fogata is quietly inspired by Christian faith. It never says so; the meaning lives in symbols for those who look:

- The teepee's three main logs: the Trinity
- Throwing wood to keep the fire alive: drawing near to God (Leviticus 6:13)
- Seven seats: completeness; "where two or three gather" (Matthew 18:20)
- Venus, the morning star (Revelation 22:16)
- Petitions as stars: "Look up at the sky and count the stars" (Genesis 15:5)
- Handing over a burden: casting your anxiety on Him (1 Peter 5:7)
- The shooting star: an answered prayer

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
- **Sky and ground** are `sky.ts` and `ground.ts`. The static parts are baked into textures once per build (Milky Way, soil with pebbles, twigs and leaves, grass tufts, foreground grass), so per-frame work stays small. Only star twinkle, the shooting star and the flicker of the firelit copy of the soil change per frame. Stars come in three depth layers; Venus is steady (planets don't twinkle). The ambient shooting star (one every 40 to 60 s, none with `prefers-reduced-motion`) is planned by pure, tested code in `shootingStar.ts` and never crosses the moon or Venus.
- **Dev-only URL flags**, read by `readDevFlags` and ignored in production builds: `?animal=<species>` puts one species in every seat; `?shuffle` randomizes who sits where.

## Conventions

- Default branch: master.
- Everything in English: code, names, comments, commits, docs, PRs.
- UI copy: Spanish by default. Keep every user-facing string in one i18n file so English can be added later.
- Strict TypeScript. `any` is forbidden.
- Every WebSocket event is defined in `packages/shared` and validated with zod on both client and server.
- Accessibility WCAG 2.2 AA: keyboard navigation, visible focus, `prefers-reduced-motion`, and petitions rendered as real DOM text (not canvas only).
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Before calling anything done: `pnpm lint && pnpm typecheck && pnpm test`.

## Phases

1. Static scene ✅ (scene, animals, arrival and leave animations, wood)
2. Realtime: many campfires, presence, shared wood, distant campfires
3. Petition stars: rotating sky, pray, answered, find my stars, storage and expiry
4. Hand over a burden, a word from the fire, sound
5. Launch: moderation, crisis flow, About page, deploy, README

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
