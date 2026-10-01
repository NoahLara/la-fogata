# La Fogata

A nocturnal, anonymous web space where people sit around a campfire in real time. It is not a chat: people leave short phrases (sparks), throw wood on the fire, and can burn what weighs on them. Built to keep people company on hard nights.

Visual and interaction reference: `docs/prototype/la-fogata.html` (open it in a browser). Match its look and feel.

## Product (MVP)

- A campfire is a room of at most 7 people. When it's full, a new one opens automatically.
- Characters: little animals (default) or souls. People on your side are seen from behind; people across the fire face you.
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
