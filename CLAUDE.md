# La Fogata

A nocturnal, anonymous web space where people sit around a campfire in real time. It is not a chat: people leave short phrases (sparks), throw wood on the fire, and can burn what weighs on them. Built to keep people company on hard nights.

Visual and interaction reference: `docs/prototype/la-fogata.html` (open it in a browser). Match its look and feel.

## Product (MVP)

- A campfire is a room of at most 7 people. When it's full, a new one opens automatically.
- Characters: little animals only (the prototype's "souls" mode is not part of the product). Everyone faces the fire: people on your side are seen from behind, people beside it in profile, people across it head-on. See "Art and scene" below.
- The 7 animals: panda, cat, owl, fox, capybara, rabbit, bear. One of each per campfire (7 seats, 7 animals). If your animal is taken, you get a free one.
- The fire grows with each connected person.
- Sparks: phrases of at most 120 characters. They expire after 6 hours. They are moderated before being shown.
- Throw wood: a reaction with no text, visible to the whole room.
- Burn what weighs on you: happens 100% in the browser. It is NEVER sent to the server or stored.
- No chat, no direct messages, no profiles, no likes, no streaks.

## Safety (non-negotiable)

- Anonymous session. Zero personal data (no email, no name, no stored IP).
- Every spark goes through moderation before broadcast.
- Risk messages (self-harm, suicide): never published; show the help screen with a link to https://findahelpline.com.
- Rate limits per session: 1 spark every 30 s, 1 log every 5 s.
- The UI must state that the app keeps you company but does not replace professional help.

## Stack

- Monorepo: pnpm workspaces + Turborepo.
- `apps/web`: Next.js (App Router) + TypeScript + Tailwind. Scene rendered with PixiJS. Sparks animated with GSAP.
- `apps/realtime`: Cloudflare Workers + Durable Objects with PartyKit (`partyserver` on the server, `partysocket` on the client). One Durable Object per campfire.
- `packages/shared`: WebSocket event types and schemas with zod.
- Persistence: Supabase (Postgres) only for reports and aggregated metrics. Presence lives in the Durable Object's memory.

## Art and scene

The scene is PixiJS in `apps/web/src/scene/`. The prototype's drawn characters are gone; the look is below.

- **Faceless silhouettes lit by the fire.** No eyes, mouth or paws. An animal is recognized by its outline (ears, tail, body shape) and a few soft colour masses. Keep the outline one smooth merged shape.
- **Art per species:** `apps/web/public/characters/<species>/{front,back,side}.svg` (webp or png also work). 512x512, transparent, 4 px per local unit, feet origin at pixel (256, 472). `front` and `back` are required; `side` is optional. The side art faces left and is mirrored for seats on the left of the fire; a species without one shows its front there. Keep the species' size differences in `SPECIES_SCALE`, not in the art.
- **Lighting is done by the engine from the seat's position, never baked into the art:** a warm gradient on the side facing the fire, shadow on the far side, and a thin warm rim hugging the edge. Seats seen from behind are almost black, backlit, with a bright rim. The art's own colours stay neutral and soft.
- **Any species must work in any seat.** People join in any order. A seat decides the view, the lighting, the log and the lean; the species decides only the art and its size. Never special-case a species in `seats.ts`.
- **Seat layout** (angles around the fire, 90° is nearest the viewer): back view at 65° and 115°, side view at 165° and 15°, front view at 225°, 255° and 300°; logs at 115°, 225° and 300°. The ring is asymmetric on purpose, so no seat is directly behind the flames, and the fire sits at its centre. Seats other than the back-view ones are squeezed to 80% sideways.
- **Everyone sits on something:** a character's feet (the bottom of its body) touch the ground line at the art's origin, or its log when it has one. A tail lying in front of the feet may reach a little below it. Don't let art float above the origin.
- **The fire** is a symmetric teepee of five thick logs that cross near the top, with flame tongues climbing through the gaps. Keep it mirror-symmetric, or the flames lean to one side.
- **Sky and ground** are `sky.ts` and `ground.ts`. The static parts are baked into textures once per build (Milky Way, soil with pebbles, twigs and leaves, grass tufts, foreground grass), so per-frame work stays small. Only star twinkle, the shooting star and the flicker of the firelit copy of the soil change per frame. Stars come in three depth layers; Venus is steady (planets don't twinkle). The shooting star (one every 40 to 60 s, none with `prefers-reduced-motion`) is planned by pure, tested code in `shootingStar.ts` and never crosses the moon or Venus.
- **Dev-only URL flags**, read by `readDevFlags` and ignored in production builds: `?animal=<species>` puts one species in every seat; `?shuffle` randomizes who sits where.

## Conventions

- Default branch: master.
- Everything in English: code, names, comments, commits, docs, PRs.
- UI copy: Spanish by default. Keep every user-facing string in one i18n file so English can be added later.
- Strict TypeScript. `any` is forbidden.
- Every WebSocket event is defined in `packages/shared` and validated with zod on both client and server.
- Accessibility WCAG 2.2 AA: keyboard navigation, visible focus, `prefers-reduced-motion`, and sparks rendered as real DOM text (not canvas only).
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Before calling anything done: `pnpm lint && pnpm typecheck && pnpm test`.

## Phases

1. Monorepo + static scene in `apps/web` (port the prototype to PixiJS).
2. Real time: join a campfire, presence, characters arriving and leaving.
3. Sparks + moderation + help flow.
4. Wood, burn what weighs on you, sound.
5. Deploy (Vercel + Cloudflare) and a README with a GIF.

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
