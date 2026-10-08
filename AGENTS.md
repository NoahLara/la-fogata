# AGENTS.md

Guidance for AI tools working in La Fogata (the full rules are in `CLAUDE.md`).

1. Read `CLAUDE.md` first: product rules, the Vision, the Safety rules (non-negotiable) and commands.
2. Read `.claude/rules/*.md` for the area you touch: `scene`, `data`, `i18n`, `sound`, `realtime`.
3. Read `docs/ARCHITECTURE.md` for the module map, how a gesture travels and how to add a gesture, string, sound or scene effect. Past decisions are in `docs/decisions/`.
4. Do not break these, ever: a burden never leaves the browser; no personal data; the risk check runs before anything is sent or published; there is no demo mode or dev flags (test helpers live only in `apps/web/src/data/testing.ts`); no likes, ranking or fake people; no religious vocabulary in the UI.
5. Before finishing, follow `.claude/skills/definition-of-done/SKILL.md` and run `pnpm lint && pnpm typecheck && pnpm test`.

Conventions: everything in English (UI copy in Spanish and English via `apps/web/src/i18n`), strict TypeScript with no `any`, conventional commits, default branch `master`, one small PR per area.
