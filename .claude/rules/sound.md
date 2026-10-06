---
paths:
  - "apps/web/src/sound/**"
  - "apps/web/public/sounds/**"
---

## Sound (`apps/web/src/sound/`)

Calm, quiet, never startling. Web only.

- **Web Audio, no library.** One `AudioContext` with a master gain (`engine.ts`). The one-shots, the wind and the fire's pops are synthesized (filtered noise, oscillators, envelopes). Two recordings live in `public/sounds`: the fire's crackle loop (it replaces the synthesized bed once loaded, which stays as the fallback) and the background music (`music.ts`, streamed from an audio element, never decoded whole, looping). Every level is in `levels.ts` and is set on the quiet side, to be tuned by ear.
- **Starts as soon as the page is ready, as far as the browser allows.** The engine tries to start at load (the `AudioContext` is created and `resume()` is asked for at once) and fades in. Browsers hold sound back until the visitor has touched the page (most first visits), so then the first press, tap or key outside a dialog starts it: `pointerup`, `click`, `touchend` or `keydown`, the events browsers count (a finger going down is not one). A press in the settings never starts it, so if the first thing someone does is turn sound off, it never played; with sound saved as off, nothing is created at all. Turning it on in the settings is itself a gesture. It never touches `navigator.audioSession`, so the phone's silent switch is respected. While the browser holds the context back nothing is scheduled (it would all sound at once when let go).
- **Fade in, fade out, rest.** It fades in over about 3 s to a low volume; turning sound off fades out over 0.5 s; it suspends when the tab is hidden and resumes when it is visible.
- **Volumes.** Two sliders in Settings, each 0 to 100 with 50 as the normal level and the top about 2.5 times louder (`volumeTrim.ts`); the crackle starts at 75 and the music at 25: the fire's crackle alone (`fogata:crackle`) and the music alone (`fogata:music`). The music starts when the sound does, fades in slowly, and is quieter than the fire at the same slider position.
- **Toggle in Settings.** "Sonido" / "Sound", on by default, remembered in localStorage (`fogata:sound`, try/catch). This is the audio control for WCAG 1.4.2.
- **Ambience** (`ambience.ts`): the fire's crackle (a noise bed plus random pops; its volume follows the people at the fire through `fireVolume`, never silent), and a very faint wind with a slow swell (no crickets).
- **One-shots** (`voices.ts`, mapped by `soundEvents.ts`): a thump and crackle for wood, a paper crackle for a burden, an airy rise for a petition, a tiny bell for a star settling, a soft shimmer for a shooting star, one warm low tone for the ichthys, quiet steps on leaves for someone arriving or leaving. The word from the fire has no new sound: the crackle swells. The scene reports events through `scene.onSound`, only the kind of event, never anything written.
- **Limits** (`limiter.ts`): one-shots never add up louder than the ambience (`ONE_SHOT_MAX_GAIN` x `MAX_ONE_SHOTS` is at most `ONE_SHOT_CEILING`), at most 3 sound at once (the least important gives way), the same voice isn't repeated too soon, and the ambience ducks slightly while one plays.
