import { vi } from "vitest";

/** A stand-in for the Web Audio API that records what it is asked to do. For tests only. */
export class FakeParam {
  value = 0;
  calls: [string, ...number[]][] = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.calls.push(["set", v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push(["ramp", v, t]);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.calls.push(["expramp", v, t]);
  }
  setTargetAtTime(v: number, t: number, k: number) {
    this.calls.push(["target", v, t, k]);
  }
  cancelScheduledValues(t: number) {
    this.calls.push(["cancel", t]);
  }
}

export class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  Q = new FakeParam();
  type = "";
  buffer: unknown = null;
  loop = false;
  connect<T>(to: T): T {
    return to;
  }
  disconnect() {}
  start() {}
  stop() {}
}

export class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  /** Like a browser that has not yet let the page make sound: a context stays suspended until this is cleared. */
  static blocked = false;
  state: "running" | "suspended" = FakeContext.blocked ? "suspended" : "running";
  destination = new FakeNode();
  nodes: FakeNode[] = [];
  resume = vi.fn(async () => {
    if (!FakeContext.blocked) this.state = "running";
  });
  suspend = vi.fn(async () => void (this.state = "suspended"));
  close = vi.fn(async () => {});
  private make() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }
  createMediaElementSource = () => this.make();
  createGain = () => this.make();
  createOscillator = () => this.make();
  createBiquadFilter = () => this.make();
  createBufferSource = () => this.make();
  createBuffer = (_channels: number, length: number) => ({
    duration: length / 8000,
    getChannelData: () => new Float32Array(length),
  });
}

/** A stand-in for an audio element that records what is done to it. */
export class FakeAudio {
  loop = false;
  preload = "";
  playing = false;
  played = 0;
  constructor(public src = "") {}
  play = vi.fn(async () => {
    this.playing = true;
    this.played++;
  });
  pause = vi.fn(() => {
    this.playing = false;
  });
  removeAttribute() {
    this.src = "";
  }
}
