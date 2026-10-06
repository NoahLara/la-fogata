# 0001. In-memory services first

Status: accepted

**Context.** The product is felt through gestures. Building the server first would delay seeing and testing them.

**Decision.** The UI depends only on service interfaces in `apps/web/src/data/types.ts`. In-memory versions stand in (`memoryPresence`, `memoryFire`, `memoryPetitions`, `memoryDistantFires`). Realtime (phase 3) and Supabase (phase 4) implement the same interfaces.

**Consequences.** Every gesture can be tested without a server. The interfaces must stay free of anything the server must never see (a burden is absent on purpose). Some shared rules still live in `scene/` and will move to `@fogata/shared`.
