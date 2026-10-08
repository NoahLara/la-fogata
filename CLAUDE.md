# La Fogata

A nocturnal, anonymous web space where people sit around a campfire in real time. It is not a chat: people throw wood, hand over what weighs on them, and leave petitions that become stars. Built to keep people company on hard nights.

Visual and interaction reference: `docs/prototype/la-fogata.html` (open it in a browser). Match its look and feel.

## Where the detail lives

This file holds the core rules. Area guidance loads on demand from `.claude/rules/` (by path): `scene.md` (scene, sky, stars, gestures, distant fires), `data.md` (services, petitions, fire word, preferences), `i18n.md` (copy, design system), `sound.md`, `realtime.md`. Architecture and how-tos: `docs/ARCHITECTURE.md`. Decisions: `docs/decisions/`. Other AI tools: `AGENTS.md`. Before calling work done, follow `.claude/skills/definition-of-done`.

## Product (MVP, core)

- Many campfires in the same forest, each a room of at most 7. Nobody ever waits: when a campfire is full, you join another. From your campfire you can see other campfires glowing far away between the trees.
- Characters: the 7 animals (panda, cat, owl, fox, capybara, rabbit, bear), one of each per fire; you get your preferred animal if it is free, otherwise a free one. In the UI: "personaje" / "character".
- The fire is small when the room is empty (never out) and grows with each connected person. Wood makes it big, burns down on its own (in about two minutes it is back to its small self), has a ceiling; anyone can throw wood whenever they like, and past the ceiling logs still fly but add no more light. Constants in `apps/web/src/scene/fuel.ts`.
- Three gestures only: throw wood, hand over a burden, leave a petition.
  - The burden is written, burns, and is 100% browser-side: NEVER sent, stored, logged or rendered in the scene or in any event. Everyone sees the same ritual with a blank folded note.
  - A petition rises from the fire and becomes a star in one shared sky: up to 2000 characters (a letter; a burden up to 3000, an answer up to 2000), dated with the day it was written and the day it was answered (only the day), 1 per person per day, moderated before it is shown, expires after 30 days (answered ones twinkle 30 more). Ownership is a secret key kept in the browser; no accounts.
  - Other people's stars show no author information, ever. The ichthys is the only response (one counter, no likes, no ranking).
- Touch the fire for a short verse (TLA es / WEB en, curated list in `apps/web/src/fire/words.ts`).
- No chat, no direct messages, no profiles, no likes, no streaks.
- Never simulate fake people in production. When you are alone, the scene shows the stars and any real distant fires, and never says anyone will come.

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
- Terms: the first visit asks for a one-time acceptance (`legal/terms.ts`, `TermsGate`; only the version is kept in localStorage) before the visitor sits down; bump `TERMS_VERSION` when they change in a way that matters. Readable again from the settings. Copy lives in `terms` in `es.ts`/`en.ts`; have a lawyer review it before launch.
- Every petition goes through moderation before it becomes a star.
- Risk messages (self-harm, suicide): never published; show the help screen with a link to https://findahelpline.com.
- Rate limits: 1 petition per day, prayer taps limited per session.
- The UI must state that the app keeps you company but does not replace professional help.

## Stack

- Monorepo: pnpm workspaces + Turborepo.
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind. Scene rendered with PixiJS. Petitions and UI animated with GSAP.
- `apps/realtime`: Cloudflare Workers + Durable Objects with PartyKit (`partyserver` on the server, `partysocket` on the client). One Durable Object per campfire.
- `packages/shared`: WebSocket event types and schemas with zod.
- Persistence: Supabase (Postgres) for petitions, prayer counts, reports and aggregated metrics. Presence lives in the Durable Object's memory.

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
   - star interactions: your own stars are buttons with a card, answered (twinkling) stars and returning a star to the fire ✅, rotating sky ✅, tap other people's stars with the ichthys, the flag to report ✅
   - a word from the fire ✅
   - distant campfires and the alone state ✅
   - sound ✅
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
