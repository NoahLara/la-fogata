# 0002. A panorama sky and a constellation of your own stars

Status: accepted

**Context.** One shared sky must hold many petitions, stay calm, and let each person find their own stars.

**Decision.** The sky is a seamless panorama about four screens wide that always turns slowly by itself; only reduced motion, a finger, or an open card stop it. Trees and ground never move. Your stars live in a compact cluster (`constellation.ts`) above the pines, joined by thin gold lines to form a tree. Other people's stars never enter that area. Only the visible sections are drawn and the buttons move through refs, so React does not re-render as the sky turns.

**Consequences.** Different stars pass over time, so none stays unseen. Placement is deterministic from the petition id. Turning must also work without dragging (WCAG 2.5.7).
