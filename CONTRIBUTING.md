# Contributing to La Fogata

Thanks for helping keep people company on hard nights. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first.

## Setup

Requires Node >= 22 (see `.nvmrc`) and pnpm.

```sh
corepack enable
pnpm install
pnpm dev
```

## Workflow

1. Fork the repository and clone your fork.
2. Create a branch from `master` using one of these prefixes:
   - `feat/` for new features
   - `fix/` for bug fixes
   - `chore/` for tooling, dependencies and maintenance
   - `docs/` for documentation
3. Make your changes in small, focused commits.
4. Before opening a PR, run:
   ```sh
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
5. Push your branch to your fork and open a pull request against `master`.

The default branch is `master`. PRs are **squash merged**, so the PR title becomes the commit message on `master`.

## Commits and PR titles

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

## Project rules

- Everything in English: code, names, comments, commits, docs and PRs.
- UI copy is Spanish by default. Keep every user-facing string in the single i18n file.
- Strict TypeScript. `any` is forbidden.
- Every WebSocket event is defined in `packages/shared` and validated with zod on both client and server.
- Accessibility follows WCAG 2.2 AA: keyboard navigation, visible focus, `prefers-reduced-motion`, and sparks rendered as real DOM text.
- Safety is non-negotiable: no personal data, every spark is moderated, and what a person burns is never sent to the server.
- No chat, direct messages, profiles, likes or streaks.

For large changes, open an issue to discuss a plan before writing code.
