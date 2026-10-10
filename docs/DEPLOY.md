# Running and deploying La Fogata

## Locally (no account, no credentials)

```
pnpm install
pnpm dev     # web on http://localhost:3000, realtime on http://localhost:8787
```

Open the web from another device on your network with `http://<your computer's address>:3000`; the web finds the realtime server on the same address.

## Your own instance on Cloudflare

You need a free Cloudflare account (no card). The code is MIT: anyone may run their own fogata.

1. Create the account with a project e-mail and turn on two-factor authentication.
2. Pick your `workers.dev` name when Workers asks for it.
3. Create an API token (_My Profile, API Tokens_) from the **Edit Cloudflare Workers** template, add _Account, D1, Edit_, and limit it to your account.
4. In your fork's GitHub settings (_Secrets and variables, Actions_) add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never paste them anywhere else.
5. Turn on **Secret scanning** and **Push protection** (_Settings, Code security_).
6. Push to `master` (or run it by hand from the _Actions_ tab with _Run workflow_): `.github/workflows/deploy.yml` deploys the **realtime Worker** after CI passes. It answers `ok` at `https://fogata-realtime.<your-subdomain>.workers.dev`.
7. Add that host, **without** `https://`, as a repository **variable** (not a secret) called `REALTIME_HOST` (_Settings, Secrets and variables, Actions, Variables_). It is baked into the web when it is built, so the page finds its campfires there (it uses `wss://` on its own).
8. `.github/workflows/deploy-web.yml` then deploys the **web** the same way, at `https://app.<your-subdomain>.workers.dev`. Run it by hand once if CI has not run since you added the variable.

Without the two secrets neither workflow does anything, and without `REALTIME_HOST` the web is not deployed, so forks and pull requests never fail or deploy.

The web is a Next.js app served on Workers through `@opennextjs/cloudflare`. `pnpm --filter @fogata/web preview` builds it and serves it locally on the Workers runtime. The adapter needs Next 16.3.8 or newer.

## The petitions' database

Petitions live in a D1 database called `fogata`, reached by the realtime Worker (`/api/...`, code in `packages/api`). The Deploy workflow runs `scripts/provision-d1.mjs`, which finds the database or creates it on a new account and writes its id into `apps/realtime/wrangler.jsonc`, then applies `packages/api/migrations` with `wrangler d1 migrations apply fogata --remote` before deploying. Locally `pnpm dev` applies the migrations to a local copy and needs no account. The web finds the API at the same host as the campfires (`REALTIME_HOST`).

## Secrets

| What                                | Where it lives                                                                      | In the repo? |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ------------ |
| Cloudflare API token and account id | GitHub Actions secrets                                                              | Never        |
| A secret the app needs              | `wrangler secret put NAME` (production), `apps/realtime/.dev.vars` (local, ignored) | Never        |
| D1 database                         | A binding in `wrangler.jsonc`: no password. The database id is not a secret         | Yes          |
| A person's petition key             | Their own browser; only its hash is ever stored                                     | No           |

## Free plan limits to watch

Workers: 100 000 requests a day. Durable Objects: 100 000 requests a day (WebSocket messages count). D1: 5 million rows read and 100 000 written a day, enforced since 1 September 2026 (queries fail until 00:00 UTC). If the community outgrows them, the paid Workers plan is about 5 USD a month.

## Who runs it

See `docs/decisions/0008-cloudflare-d1-and-the-operator.md`: the code is everyone's, an instance has an operator, and the terms say what the operator can read.
