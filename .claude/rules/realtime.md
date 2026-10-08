---
paths:
  - "apps/realtime/**"
  - "packages/shared/**"
---

# Realtime and shared schemas

Phase 3 is not built yet: `apps/realtime` is a stub and `packages/shared` has only a ping schema.

- One Durable Object per campfire (`partyserver` on the server, `partysocket` on the client). Presence lives in the object's memory.
- Every WebSocket event is defined in `packages/shared` with zod and validated on both client and server. Schemas are `.strict()`.
- The burden never travels: the shared events for a burden carry only a member id, never text. Add a test that no burden schema has a free-text field.
- Server rules: one of each animal per fire (preferred animal if free, otherwise a free one); at most 7 per fire; nobody waits (a full fire sends you to another).
- Rate limits live in the Durable Object, not only the client: a flood guard for logs (there is no product cooldown, but the Durable Object should still drop absurd bursts), one petition per person per day, limited prayer taps per session.
- No personal data: no IPs stored, no accounts. A petition's owner is a secret key kept in the browser.
- Risk messages (self-harm, suicide) are never published or sent on; moderation runs before a petition becomes a star.
- Move constants and service types that both sides need into `@fogata/shared`.
