# 0005. Verses from TLA (es) and WEB (en)

Status: accepted

**Context.** Touching the fire gives a short word. Scripture appears only when asked for, and the vision is never stated in the UI.

**Decision.** A curated list in `apps/web/src/fire/words.ts` uses TLA (Spanish) and WEB (English), text unchanged. Entries are a whole verse or a contiguous fragment up to 120 characters, with no quotation marks, no names of God (God, Lord, Yahweh, Jesus, Christ, the Spirit, the Father) and no gendered singular address. Each language has its own shuffle bag. The reference shows only on tapping the verse number, with the translation notice. TLA terms: at most 500 verses, non-commercial use.

**Consequences.** `words.test.ts` enforces the rules. WEB is public domain; TLA terms must be honoured and credited on the About page.
