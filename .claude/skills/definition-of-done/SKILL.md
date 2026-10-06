---
name: definition-of-done
description: Checklist to run before calling any La Fogata change done. Use when finishing a feature, fix or refactor, before committing or opening a PR.
---

# Definition of done

Go through every item and fix what fails before saying the work is done.

1. **Strings**: every new user-facing string, including aria labels and text drawn in the scene, is in both `apps/web/src/i18n/es.ts` and `en.ts` with the same key. English is natural and warm, never says "petition"; counts use `plural()`.
2. **Tests**: new pure logic has tests next to it; tests check behaviour, not implementation details, and use fake timers rather than real waits.
3. **Reduced motion**: every new animation has a `prefers-reduced-motion` path.
4. **Accessibility**: keyboard reachable, visible focus, focus returns where it should, labels and live regions, targets at least 24 px (44 px where specified), text in rem and tokens (no raw hex).
5. **Safety**: a burden never leaves the browser; the risk check runs before anything is sent or published; no personal data; demo code stays out of production.
6. **Scene performance** (if the scene changed): no per-frame allocations; everything added is cleaned up; textures destroyed; compare visually with `master`.
7. **Docs**: `CLAUDE.md`, the matching `.claude/rules/*.md` and `docs/ARCHITECTURE.md` are updated when behaviour or structure changed; add an ADR in `docs/decisions/` for a key decision.
8. **Checks**: run `pnpm lint && pnpm typecheck && pnpm test` and report the real result. Run `/code-review` on the diff.
9. **Git**: a small PR for one area, branched from `master`, conventional commit messages in English.
