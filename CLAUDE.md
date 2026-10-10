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
  - A petition rises from the fire and becomes a star in one shared sky: up to 2000 characters (a letter; a burden up to 3000, an answer up to 2000), dated with the day it was written and the day it was answered (only the day), moderated before it is shown. There is no limit on how many a person may leave and they do not expire: a star stays until its author returns it to the fire. Ownership is a secret key kept in the browser; no accounts.
  - Other people's stars show no author information, ever. The ichthys is the only response (one counter, no likes, no ranking).
- Touch the fire for a short verse (TLA es / WEB en, curated list in `apps/web/src/fire/words.ts`). Only the words show, with no number; tapping the words shows where they come from.
- The first time, after accepting the terms, a short tutorial (`components/tutorial/`, `tutorial/tutorial.ts`) says what La Fogata is and what can be done in it, one step at a time with a small drawing of each; it can be skipped, is remembered (`fogata:tutorial`), and can be opened again from the settings. It stays neutral: no religious vocabulary, no promise of rules that do not exist (a test guards both).
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
- Content check (`apps/web/src/moderation/`): before a burden is handed over, a petition is raised or an answer is saved, the text is checked in the browser (and again in the service) for insults and swearing in Spanish and English, however disguised (spaced, stretched, leet, look-alike letters), and for nothing readable (only numbers, symbols, emoji or spaces, keyboard mashing, endless repetition). It is dropped right after; nothing is logged. A refusal says gently "La Fogata no es para esto" and never names the word. A text with signs of risk (`burden/risk.ts`) is never refused for rough words: help comes first. Lists live in `moderation/words.ts`; every change must keep `moderation/content.test.ts` green (it checks generated disguises, everyday texts, every verse and every UI string).
- Risk messages (self-harm, suicide): never published; show the help screen with a link to https://findahelpline.com.
- Rate limits: prayer taps limited per session. There is no limit on petitions per person or per day (a flood guard in the Durable Object may come with the server).
- Petitions are public by nature: their text is stored on the operator's servers and the operator can read it (the terms say so). Only the hash of an owner's key is stored, never the key, and a burden never reaches the server at all.
- The repo is public and open source: never commit a secret. `.env*` and `.dev.vars*` are ignored; deploy credentials live only in GitHub Actions secrets and `wrangler secret`. Every deploy runs from `master` through `.github/workflows/deploy.yml`, and skips itself where the credentials are absent (forks).
- The UI must state that the app keeps you company but does not replace professional help.

## Stack

- Monorepo: pnpm workspaces + Turborepo.
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind. Scene rendered with PixiJS. Petitions and UI animated with GSAP.
- `apps/realtime`: Cloudflare Workers + Durable Objects with PartyKit (`partyserver` on the server, `partysocket` on the client). One Durable Object per campfire.
- `packages/shared`: WebSocket event types and schemas with zod.
- Persistence: Cloudflare D1 (SQLite) for petitions, prayer counts, reports and aggregated metrics, reached from the Worker through a binding (there is no database password). Presence and the fire live in the Durable Object's memory. See `docs/decisions/0008-cloudflare-d1-and-the-operator.md`.

## Conventions

- Default branch: master.
- Everything in English: code, names, comments, commits, docs, PRs.
- UI copy: Spanish (default) and English, nothing else for now. Every user-facing string, including aria labels and text drawn in the scene, lives in `apps/web/src/i18n/es.ts` and `en.ts` (same keys, enforced by `satisfies Messages` and a test); every new string goes into both. English is written to sound natural and warm, never a literal translation, and avoids the word "petition" (the gesture is "Ask", the thing in the sky is a "star"). Counts use `plural()` (Intl.PluralRules), never `"s"` tricks. The language is the `lang` cookie the visitor set in the settings, else Spanish, whatever language the browser says it speaks (English is only for whoever picks it); the cookie is a functional preference, not personal data.
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
4. Persistence: Cloudflare D1 for petitions, prayer counts, reports and metrics
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
