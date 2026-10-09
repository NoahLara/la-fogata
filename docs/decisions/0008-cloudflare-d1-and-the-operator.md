# 0008. Cloudflare D1 for persistence, and the operator model

Status: accepted (replaces the plan to use Supabase)

**Context.** La Fogata is free and open source: the repo is public and anyone may run their own copy. Persistence was planned on Supabase (Postgres), which brings a project per deployer, a service-role key to keep secret and a Docker stack for local work. Everything else already runs on Cloudflare.

**Decision.** Petitions, prayer counts, reports and metrics live in **Cloudflare D1** (SQLite), reached from the Worker through a binding. There is no connection string or database password, so there is nothing of that kind to leak. Locally `wrangler dev` emulates D1, so a contributor needs no account and no credentials. The free plan (5 GB per account, 500 MB per database, 5 million rows read and 100 000 written a day) is far more than text petitions need; reads are counted by rows scanned, so the queries are indexed and the sky is cached for a few minutes.

The **code belongs to everyone** (MIT); an **instance is run by an operator**: whoever holds the Cloudflare account. The official instance starts with its author as operator, with a project e-mail, two-factor authentication and a token that can only deploy Workers and edit D1. When a community forms the account and the repo move to an organisation with at least two administrators, and the database is exported regularly to a place two people control.

**What the operator can and cannot see.** The operator can read the text of petitions (they are public, anonymous stars) and says so in the terms. They cannot read burdens (they never leave the browser) or tell who wrote a petition (only the hash of the owner's key is stored, never the key). There is no personal data.

**Secrets.** None live in the repo. `.env*` and `.dev.vars*` are ignored, the deploy token and account id are GitHub Actions secrets, and any secret the app needs is set with `wrangler secret put`. The deploy workflow runs only from `master` and skips itself where the credentials are absent, so forks and pull requests from forks never deploy and never fail.

**Consequences.** One provider and one free account run the whole thing. D1 is SQLite, not Postgres: no row-level security and no built-in auth or realtime, none of which we use, since the Worker applies the rules. Moving to another database later only means another implementation of the same store interface.
