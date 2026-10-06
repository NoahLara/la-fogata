import { Container, Graphics } from "pixi.js";
import { softGlow } from "./glow";
import type { Point, SceneLayout } from "./layout";
import { between, lerp, mixColor, smoothstep } from "./math";
import {
  buildNoteCells,
  cellStateAt,
  curlAt,
  fadeIntoFire,
  NOTE,
  NOTE_COLUMNS,
  NOTE_ROWS,
  type NoteCell,
} from "./noteBurn";
import { createRandom } from "./random";
import { arcAt } from "./woodThrow";

/** Where someone's hands are and how big a unit is there. */
export interface Hand {
  x: number;
  y: number;
  scale: number;
}

/** What happens to the fire and to the ritual as a note burns. */
export interface NoteHooks {
  /** The note lands on the ember bed (at once with reduced motion). */
  onLand: () => void;
  /** Fire is spitting: `count` embers should rise. */
  onEmbers: (count: number) => void;
  /** The note has burned to nothing. */
  onDone: () => void;
}

export interface NoteHandle {
  /** The note leaves their hands for the ember bed on `side` of the fire (-1 left, 1 right): the side they stand on. */
  release(side: 1 | -1): void;
  /** Ends it at once, wherever it is. */
  finish(): void;
}

export interface NoteEffects {
  /** Over the characters: the note in someone's hands and in the air, and the ash and smoke that rise. */
  air: Container;
  /**
   * A small folded note, with no writing on it, is in someone's hands (`hand` says where they are from frame to
   * frame). It is always the same note: nothing about what anyone wrote ever gets here. On `release` it arcs onto the
   * ember bed and burns there.
   */
  carry(hand: () => Hand | undefined, hooks: NoteHooks, seed: number): NoteHandle;
  /** With reduced motion: the note is on the fire at once, and fades into it with a soft glow. */
  fadeIn(side: 1 | -1, hooks: NoteHooks): NoteHandle;
  update(dt: number): void;
  /** Ends every note at once, for when the scene is rebuilt. */
  finishAll(): void;
  destroy(): void;
}

/** The note's size in character units (a character is 100 tall): small, about a fifth of the animal. */
export const NOTE_WIDTH_UNITS = 20;
export const NOTE_HEIGHT_UNITS = 25;

// The same cream as the back of the folded paper on the page (paper-shade), so the note looks the same either side of the handoff.
const PAPER = 0xe6d3ae;
const CREASE = 0xa5906a;
const LIT = 0xffd9a8;
const FLAKES_PER_CELL = 0.55;

interface Flake {
  shape: Graphics;
  age: number;
  life: number;
  vx: number;
  vy: number;
  spin: number;
  wobble: number;
}

type Stage = "carried" | "arc" | "burning" | "fading" | "done";

interface Note {
  holder: Container;
  paper: Graphics;
  heat: Graphics;
  halo: Graphics;
  cells: NoteCell[];
  ashed: boolean[];
  stage: Stage;
  elapsed: number;
  /** When the stage began. */
  stageStart: number;
  hand: () => Hand | undefined;
  last: Hand;
  from: Point;
  fromScale: number;
  bed: Point;
  bedScale: number;
  hooks: NoteHooks;
  embersAt: number[];
  landed: boolean;
}

/** The darkness of a charred cell, from just-burned to cold. */
const charColor = (amount: number) => mixColor(0x3a2418, 0x120c0a, amount);
/** The color of a burning cell, from the bright front to the red behind it. */
const fireColor = (amount: number) => mixColor(0xffd870, 0xff4a10, smoothstep(0, 1, amount));

export function createNoteEffects(layout: SceneLayout, bedLayer: Container): NoteEffects {
  const air = new Container();
  const notes: Note[] = [];
  const flakes: Flake[] = [];
  const smokes: {
    puff: Graphics;
    age: number;
    life: number;
    x: number;
    y: number;
    drift: number;
  }[] = [];
  const rand = createRandom(97);
  // On the ember bed, to the side of the animal that lays it there so the front log doesn't hide it.
  const bedPoint = (side: 1 | -1): Point => ({
    x: layout.cx + side * 13 * layout.u,
    y: layout.cy + 4 * layout.u,
  });
  const bedScale = layout.characterHeight / 100;

  const puffSmoke = (x: number, y: number) => {
    const puff = new Graphics().circle(0, 0, 3 + rand() * 3).fill(0x9a8c84);
    puff.alpha = 0;
    air.addChild(puff);
    smokes.push({
      puff,
      age: 0,
      life: 1.4 + rand() * 1.1,
      x: x + (rand() - 0.5) * 8 * layout.u,
      y,
      drift: (rand() - 0.5) * 14 * layout.u,
    });
  };

  const makeFlake = (x: number, y: number, size: number) => {
    const shape = new Graphics();
    const w = size * between(rand, 0.6, 1.3);
    const h = size * between(rand, 0.4, 0.9);
    shape
      .poly([-w / 2, -h / 3, w / 3, -h / 2, w / 2, h / 3, -w / 4, h / 2])
      .fill(mixColor(0x2e2823, 0x8a8076, rand()));
    shape.position.set(x, y);
    air.addChild(shape);
    flakes.push({
      shape,
      age: 0,
      life: between(rand, 1.3, 2.4),
      vx: between(rand, -9, 9) * layout.u,
      vy: -between(rand, 26, 58) * layout.u,
      spin: between(rand, -3, 3),
      wobble: between(rand, 0, 6.28),
    });
  };

  const drawCells = (note: Note, progress: number) => {
    const { paper, heat, cells } = note;
    paper.clear();
    heat.clear();
    // Cells are drawn a hair larger than their grid so no seams show between them.
    const cellW = NOTE_WIDTH_UNITS / NOTE_COLUMNS;
    const cellH = NOTE_HEIGHT_UNITS / NOTE_ROWS;
    cells.forEach((cell, index) => {
      const state = cellStateAt(cell, progress);
      const x = (cell.u - 0.5) * NOTE_WIDTH_UNITS;
      const y = (cell.v - 0.5) * NOTE_HEIGHT_UNITS;
      if (state.phase === "ash") {
        if (!note.ashed[index]) {
          note.ashed[index] = true;
          if (rand() < FLAKES_PER_CELL) {
            makeFlake(
              note.holder.x + x * note.holder.scale.x,
              note.holder.y + y * note.holder.scale.y,
              3 * bedScale,
            );
          }
        }
        return;
      }
      // The note is folded: the two creases show as darker lines across it.
      const crease = Math.max(
        1 - Math.abs(cell.u - 0.5) / 0.06,
        1 - Math.abs(cell.v - 0.5) / 0.05,
        0,
      );
      let color = mixColor(PAPER, CREASE, crease * 0.55);
      let curl = 0;
      if (state.phase === "burning") {
        color = fireColor(state.amount);
        heat
          .rect(x - cellW * 1.1, y - cellH * 1.1, cellW * 2.2, cellH * 2.2)
          .fill({ color: 0xff8a2a, alpha: 0.5 * Math.sin(Math.PI * state.amount) + 0.12 });
      } else if (state.phase === "char") {
        color = charColor(state.amount);
        curl = smoothstep(0, 1, state.amount);
        // A few cells still glow red as they cool.
        if (((index * 7919) % 11) / 11 > 0.7 && state.amount < 0.7) {
          heat
            .rect(x - cellW * 0.6, y - cellH * 0.6, cellW * 1.2, cellH * 1.2)
            .fill({ color: 0xff3a10, alpha: 0.4 * (1 - state.amount) });
        }
      }
      // Burned cells curl in toward the middle and lift off the paper, a little smaller.
      const shrink = 1 - 0.25 * curl;
      const cx = x * (1 - 0.12 * curl);
      const cy = y * (1 - 0.12 * curl) - curl * 1.4;
      paper
        .rect(
          cx - (cellW * shrink) / 2 - 0.2,
          cy - (cellH * shrink) / 2 - 0.2,
          cellW * shrink + 0.4,
          cellH * shrink + 0.4,
        )
        .fill(color);
    });
  };

  const makeNote = (
    hand: () => Hand | undefined,
    side: 1 | -1,
    hooks: NoteHooks,
    seed: number,
    stage: Stage,
  ): Note => {
    const holder = new Container();
    const halo = softGlow(30, [255, 150, 70], 0.4);
    halo.alpha = 0;
    const paper = new Graphics();
    const heat = new Graphics();
    heat.blendMode = "add";
    holder.addChild(halo, paper, heat);
    const start = hand() ?? { x: layout.cx, y: layout.cy, scale: bedScale };
    holder.position.set(start.x, start.y);
    holder.scale.set(start.scale);
    const note: Note = {
      holder,
      paper,
      heat,
      halo,
      cells: buildNoteCells(seed),
      ashed: [],
      stage,
      elapsed: 0,
      stageStart: 0,
      hand,
      last: start,
      from: { x: start.x, y: start.y },
      fromScale: start.scale,
      bed: bedPoint(side),
      bedScale,
      hooks,
      embersAt: [0.1, 0.4, 0.7],
      landed: false,
    };
    drawCells(note, 0);
    return note;
  };

  const land = (note: Note) => {
    if (note.landed) return;
    note.landed = true;
    note.hooks.onLand();
  };

  const finish = (note: Note) => {
    if (note.stage === "done") return;
    note.stage = "done";
    const at = notes.indexOf(note);
    if (at >= 0) notes.splice(at, 1);
    note.holder.destroy({ children: true });
    note.hooks.onDone();
  };

  const toBed = (note: Note) => {
    // On the ember bed it is part of the fire: in front of the back logs, behind the flames.
    bedLayer.addChild(note.holder);
    note.holder.position.set(note.bed.x, note.bed.y);
    note.holder.scale.set(note.bedScale);
    note.holder.rotation = 0;
  };

  return {
    air,
    carry(hand, hooks, seed) {
      const note = makeNote(hand, 1, hooks, seed, "carried");
      air.addChild(note.holder);
      notes.push(note);
      return {
        release(side) {
          if (note.stage !== "carried") return;
          note.bed = bedPoint(side);
          note.from = { x: note.holder.x, y: note.holder.y };
          note.fromScale = note.holder.scale.x;
          note.stage = "arc";
          note.stageStart = note.elapsed;
        },
        finish: () => {
          land(note);
          finish(note);
        },
      };
    },
    fadeIn(side, hooks) {
      const note = makeNote(() => undefined, side, hooks, 5, "fading");
      toBed(note);
      note.stageStart = 0;
      notes.push(note);
      land(note);
      return {
        release() {},
        finish: () => finish(note),
      };
    },
    update(dt) {
      for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        if (!note) continue;
        note.elapsed += dt;
        const inStage = note.elapsed - note.stageStart;
        if (note.stage === "carried") {
          const hand = note.hand();
          if (hand) note.last = hand;
          note.holder.position.set(note.last.x, note.last.y);
          note.holder.scale.set(note.last.scale);
        } else if (note.stage === "arc") {
          const u = Math.min(1, inStage / NOTE.arc);
          const at = arcAt(note.from, note.bed, 18 * layout.u, u);
          note.holder.position.set(at.x, at.y);
          note.holder.scale.set(lerp(note.fromScale, note.bedScale, smoothstep(0, 1, u)));
          note.holder.rotation = u * 0.5;
          if (u >= 1) {
            toBed(note);
            land(note);
            note.stage = "burning";
            note.stageStart = note.elapsed;
          }
        } else if (note.stage === "burning") {
          const progress = Math.min(1, inStage / NOTE.burn);
          const curl = curlAt(progress);
          note.holder.rotation = curl.tilt * 0.35;
          note.holder.scale.set(note.bedScale, note.bedScale * curl.shrink);
          drawCells(note, progress);
          // Warmer as it catches, glowing at the middle of the burn.
          note.halo.alpha = Math.sin(Math.PI * Math.min(1, progress * 1.15)) * 0.9;
          note.paper.tint = mixColor(0xffffff, LIT, smoothstep(0, 0.5, progress));
          if (rand() < 0.5 && progress > 0.1 && progress < 0.85) {
            puffSmoke(note.holder.x, note.holder.y - 4 * layout.u);
          }
          while (note.embersAt.length && progress >= (note.embersAt[0] ?? 2)) {
            note.embersAt.shift();
            note.hooks.onEmbers(5);
          }
          if (progress >= 1) {
            finish(note);
          }
        } else if (note.stage === "fading") {
          const { alpha, glow } = fadeIntoFire(inStage);
          note.paper.alpha = alpha;
          note.halo.alpha = glow;
          if (inStage >= NOTE.fade) {
            finish(note);
          }
        }
      }
      for (let i = flakes.length - 1; i >= 0; i--) {
        const flake = flakes[i];
        if (!flake) continue;
        flake.age += dt;
        const u = flake.age / flake.life;
        if (u >= 1) {
          flake.shape.destroy();
          flakes.splice(i, 1);
          continue;
        }
        flake.shape.x += (flake.vx + Math.sin(flake.age * 4 + flake.wobble) * 8 * layout.u) * dt;
        flake.shape.y += flake.vy * dt * (1 - 0.5 * u);
        flake.shape.rotation += flake.spin * dt;
        flake.shape.alpha = 0.85 * (1 - u) ** 0.8;
      }
      for (let i = smokes.length - 1; i >= 0; i--) {
        const smoke = smokes[i];
        if (!smoke) continue;
        smoke.age += dt;
        const u = smoke.age / smoke.life;
        if (u >= 1) {
          smoke.puff.destroy();
          smokes.splice(i, 1);
          continue;
        }
        smoke.puff.position.set(smoke.x + smoke.drift * u, smoke.y - u * 46 * layout.u);
        smoke.puff.scale.set(0.6 + u * 1.4);
        smoke.puff.alpha = 0.26 * Math.sin(Math.PI * u);
      }
    },
    finishAll() {
      while (notes.length) {
        const note = notes.pop();
        if (!note) continue;
        land(note);
        finish(note);
      }
    },
    destroy() {
      notes.length = 0;
      flakes.length = 0;
      smokes.length = 0;
      air.destroy({ children: true });
    },
  };
}
