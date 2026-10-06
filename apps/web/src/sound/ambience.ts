import { AMBIENCE } from "./levels";
import { loopNoise, noiseBurst } from "./noise";

export interface Ambience {
  /** The crackle's level, 0 to 1 (see `fireVolume`); it eases there. */
  setFire(level: number): void;
  /** The visitor's own volume for the fire crackle alone, as a multiplier (1 is normal). */
  setTrim(multiplier: number): void;
  /** Swaps the synthesized crackle for a recording of a real fire, which loops. */
  useRecording(buffer: AudioBuffer): void;
  /** The crackle swells for a moment and settles back. */
  swell(): void;
  stop(): void;
}

const POP_TICK_MS = 140;

/** A looped filtered noise through `filters` and a gain, into `out`. */
function bed(
  ctx: AudioContext,
  noise: AudioBuffer,
  out: AudioNode,
  filters: readonly [BiquadFilterType, number][],
  level: number,
) {
  const source = loopNoise(ctx, noise);
  let last: AudioNode = source;
  for (const [type, frequency] of filters) {
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    last.connect(filter);
    last = filter;
  }
  const gain = ctx.createGain();
  gain.gain.value = level;
  last.connect(gain);
  gain.connect(out);
  source.start();
  return { source, gain };
}

/** A slow oscillator that moves a gain's level up and down around its own, like a breath. */
function swellOver(ctx: AudioContext, target: GainNode, rate: number, depth: number) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  lfo.connect(amount);
  amount.connect(target.gain);
  lfo.start();
  return lfo;
}

/** The fire's crackle, and a very faint wind with a slow swell. */
export function startAmbience(
  ctx: AudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  random: () => number = Math.random,
): Ambience {
  let level = 0;
  let trim = 1;
  let recording: { source: AudioBufferSourceNode; gain: GainNode } | undefined;
  const crackle = bed(
    ctx,
    noise,
    out,
    [
      ["highpass", 700],
      ["lowpass", 2600],
    ],
    0,
  );
  // A slow wind: a low, soft sound that rises and falls over about twenty seconds.
  const wind = bed(ctx, noise, out, [["lowpass", 260]], AMBIENCE.wind * 0.6);
  const windSwell = swellOver(ctx, wind.gain, 0.05, AMBIENCE.wind * 0.45);

  const bedLevel = (swell = 1) => (recording ? 0 : AMBIENCE.crackle * level * trim * swell);
  const recordingLevel = (swell = 1) => AMBIENCE.recording * level * trim * swell;
  const apply = (swell: number, at: number, time: number) => {
    crackle.gain.gain.setTargetAtTime(bedLevel(swell), at, time);
    recording?.gain.gain.setTargetAtTime(recordingLevel(swell), at, time);
  };

  // Random small pops, a few a second, more with a bigger fire.
  const timer = setInterval(() => {
    // While the browser holds the context back nothing is scheduled: it would all sound at once when it is let go.
    if (ctx.state !== "running") return;
    if (random() > (0.5 + 1.1 * level) * (POP_TICK_MS / 1000)) return;
    const at = ctx.currentTime + 0.02;
    const length = 0.015 + random() * 0.035;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200 + random() * 2800;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    // With a real fire under it, the synthesized pops only add a little.
    const popLevel = AMBIENCE.pop * (recording ? 0.12 : 1);
    gain.gain.linearRampToValueAtTime(popLevel * (0.25 + random() * 0.75) * level, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    noiseBurst(ctx, noise, at, length, random).connect(filter);
    filter.connect(gain);
    gain.connect(out);
  }, POP_TICK_MS);

  return {
    setFire(next) {
      level = next;
      apply(1, ctx.currentTime, 1.5);
    },
    setTrim(multiplier) {
      trim = multiplier;
      apply(1, ctx.currentTime, 0.2);
    },
    useRecording(buffer) {
      if (recording) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(out);
      // Start somewhere in the recording, so it isn't the same opening every visit.
      source.start(0, random() * buffer.duration);
      recording = { source, gain };
      // The synthesized bed gives way to the recording over a couple of seconds.
      apply(1, ctx.currentTime, 1.2);
    },
    swell() {
      const now = ctx.currentTime;
      apply(1.6, now, 0.7);
      apply(1, now + 2.4, 1.4);
    },
    stop() {
      clearInterval(timer);
      for (const node of [crackle.source, wind.source, windSwell, recording?.source]) {
        try {
          node?.stop();
        } catch {
          // Already stopped.
        }
      }
    },
  };
}
