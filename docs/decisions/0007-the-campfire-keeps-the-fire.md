# 0007. The campfire keeps the fire and tells everyone what happens at it

Status: accepted

**Context.** Until phase 3 the fuel lived in each browser's scene. With real people at one campfire, passing only "X threw a log" would leave every browser with its own fire: a latecomer would start cold while the others see a big blaze, logs would land at different moments, and clocks would drift.

**Decision.** The campfire's Durable Object keeps the fire (`Fire` in `packages/shared`: the fuel it had when the last log landed, burning down since, so the current value is computed on demand and nothing ticks). The maths (`addLog`, `burn`, `FUEL`) lives in `packages/shared` and the scene imports it. A log is `{ type: "wood" }` from the browser and `{ type: "wood", by, fuel }` to everyone; a `welcome` carries the fuel too. The visitor's own log flies at once, before the server answers, and its echo is not played twice; somebody else's log sets the fire to the campfire's fuel when it lands (burnt down for the time it was in the air), so every log re-aligns the fire. The Durable Object only drops absurd bursts (`Throttle`: a burst of 10, then 6 a second); there is still no cooldown, and past the ceiling logs still fly and add no light. Only someone sitting at the campfire can throw.

**Consequences.** One fire per campfire, the same for everyone. If the Durable Object restarts the fire starts cold; it would be back to its small self within two minutes anyway, so it is not stored. Anything else that everyone at a campfire must see the same (the gestures) goes through the same session and the same rule: the browser says it at once, the campfire repeats it to the others, and nothing a person wrote is ever in an event.
