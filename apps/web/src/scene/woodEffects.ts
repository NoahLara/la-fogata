import { Container, Graphics } from "pixi.js";
import type { Point, SceneLayout } from "./layout";
import { lerp, mixColor } from "./math";
import { arcAt, spinAt, THROW } from "./woodThrow";

interface Flight {
  log: Graphics;
  from: Point;
  to: Point;
  apex: number;
  fromScale: number;
  toScale: number;
  direction: 1 | -1;
  elapsed: number;
  onLand: () => void;
}

export interface WoodEffects {
  /** Over the characters, so a log flies in front of everyone. */
  container: Container;
  /** A log leaves `from` (its scale is how big a unit is there) and lands in the fire, where `onLand` is called. */
  launch(from: Point, scale: number, onLand: () => void): void;
  update(dt: number): void;
  /** Lands every log still in the air at once, for when the scene is rebuilt. */
  landAll(): void;
  destroy(): void;
}

const LOG_LENGTH = 30;
const LOG_RADIUS = 4.4;
/** Colours of a log seen from the dark and of one lit by the fire it is about to land in. */
const DARK = 0x6a5a60;
const LIT = 0xffc890;

function drawLog(): Graphics {
  const log = new Graphics();
  log
    .roundRect(-LOG_LENGTH / 2, -LOG_RADIUS, LOG_LENGTH, LOG_RADIUS * 2, LOG_RADIUS * 0.8)
    .fill(0x5a3f2a);
  log.roundRect(-LOG_LENGTH / 2 + 2, -LOG_RADIUS + 1, LOG_LENGTH - 4, LOG_RADIUS * 0.7, 2).fill({
    color: 0x8a6444,
    alpha: 0.7,
  });
  log.ellipse(LOG_LENGTH / 2 - 1, 0, 2.2, LOG_RADIUS - 0.6).fill(0xa9794c);
  return log;
}

export function createWoodEffects(layout: SceneLayout): WoodEffects {
  const container = new Container();
  const flights: Flight[] = [];
  // The base of the fire, where the log ends up.
  const target: Point = { x: layout.cx, y: layout.cy - 6 * layout.u };

  const land = (flight: Flight) => {
    flight.log.destroy();
    flight.onLand();
  };

  return {
    container,
    launch(from, scale, onLand) {
      const log = drawLog();
      container.addChild(log);
      const distance = Math.hypot(target.x - from.x, target.y - from.y);
      flights.push({
        log,
        from,
        to: target,
        apex: 60 * layout.u + distance * 0.12,
        fromScale: scale,
        toScale: (layout.characterHeight / 100) * 0.85,
        direction: from.x < target.x ? 1 : -1,
        elapsed: -THROW.release,
        onLand,
      });
    },
    update(dt) {
      for (let i = flights.length - 1; i >= 0; i--) {
        const flight = flights[i];
        if (!flight) continue;
        flight.elapsed += dt;
        // Still in the thrower's hands: nothing to see yet.
        flight.log.visible = flight.elapsed >= 0;
        const u = Math.min(1, Math.max(0, flight.elapsed / THROW.flight));
        const at = arcAt(flight.from, flight.to, flight.apex, u);
        flight.log.position.set(at.x, at.y);
        flight.log.rotation = spinAt(u, flight.direction);
        flight.log.scale.set(lerp(flight.fromScale, flight.toScale, u));
        // It catches the light of the fire as it gets close.
        flight.log.tint = mixColor(DARK, LIT, u * u);
        if (flight.elapsed >= THROW.flight) {
          flights.splice(i, 1);
          land(flight);
        }
      }
    },
    landAll() {
      while (flights.length) {
        const flight = flights.pop();
        if (flight) land(flight);
      }
    },
    destroy() {
      for (const flight of flights) flight.log.destroy();
      flights.length = 0;
      container.destroy({ children: true });
    },
  };
}
