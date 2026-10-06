# 0003. Synthesized sound, no library

Status: accepted

**Context.** Sound must be calm, tiny to ship, and never startling.

**Decision.** One Web Audio `AudioContext` with a master gain. One-shots, wind and pops are synthesized (filtered noise, oscillators, envelopes). Two recordings are the exception: the crackle loop and the music (streamed from an audio element). A limiter keeps one-shots below the ambience and caps simultaneous voices. It never touches `navigator.audioSession`, so the silent switch is respected. A "Sonido" switch in settings satisfies WCAG 1.4.2.

**Consequences.** Small bundle, full control of levels (`levels.ts`), but levels are tuned by ear. Recordings need their licence recorded.
