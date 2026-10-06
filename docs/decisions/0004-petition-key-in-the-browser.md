# 0004. The petition key lives in the browser

Status: accepted

**Context.** There are no accounts and no personal data, yet an author must be able to answer or return their own star.

**Decision.** Creating a petition generates a random secret key kept in the browser (`data/keyStore.ts`, with a fallback when storage is blocked). Ownership is "I hold the key". Nothing identifies a person: no email, no name, no stored IP.

**Consequences.** Clearing browser data loses ownership of your stars. The server must treat the key as a secret and never expose authorship; other people's stars carry no author information.
