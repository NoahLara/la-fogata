import { noiseBurst } from "./noise";
import type { VoiceName } from "./soundEvents";

/** Everything a voice needs. It plays into `out` from `at` on, at its own level (the cue's gain is already in `out`). */
export interface VoiceContext {
  ctx: AudioContext;
  out: AudioNode;
  at: number;
  noise: AudioBuffer;
  random: () => number;
}

/** A soft envelope on a fresh gain node: up to `peak` over `attack`, then down to silence by `end`. */
function envelope(
  { ctx, out, at }: VoiceContext,
  peak: number,
  attack: number,
  end: number,
): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + end);
  gain.connect(out);
  return gain;
}

function tone(
  voice: VoiceContext,
  frequency: number,
  peak: number,
  attack: number,
  end: number,
  sweepTo?: number,
) {
  const { ctx, at } = voice;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, at);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, at + end);
  osc.connect(envelope(voice, peak, attack, end));
  osc.start(at);
  osc.stop(at + end + 0.05);
}

/** Small filtered pops of noise at random moments between `from` and `to`, getting quieter and sparser toward the end. */
interface PopSpec {
  from: number;
  to: number;
  count: number;
  low: number;
  high: number;
  peak: number;
}

function pops(voice: VoiceContext, { from, to, count, low, high, peak }: PopSpec) {
  const { ctx, at, noise, random } = voice;
  for (let i = 0; i < count; i++) {
    const fade = 1 - i / count;
    const t = at + from + (to - from) * (i / count) + random() * ((to - from) / count);
    const length = 0.015 + random() * 0.04;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = low + random() * (high - low);
    filter.Q.value = 2.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak * (0.3 + random() * 0.7) * fade, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    noiseBurst(ctx, noise, t, length, random).connect(filter);
    filter.connect(gain);
    gain.connect(voice.out);
  }
}

/** A low thump, then a brief crackle burst. */
function thump(voice: VoiceContext) {
  tone(voice, 95, 1, 0.012, 0.32, 42);
  pops(voice, { from: 0.1, to: 0.6, count: 9, low: 1400, high: 3600, peak: 0.7 });
}

/** A paper crackle: many tiny pops that thin out. */
function paper(voice: VoiceContext) {
  pops(voice, { from: 0, to: 1.7, count: 34, low: 2000, high: 5200, peak: 0.8 });
}

/** An airy rising shimmer: breath of noise whose pitch climbs, with a faint tone under it. */
function rise({ ctx, out, at, noise, random }: VoiceContext) {
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 5;
  filter.frequency.setValueAtTime(700, at);
  filter.frequency.exponentialRampToValueAtTime(3600, at + 2);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.9, at + 1.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.1);
  noiseBurst(ctx, noise, at, 2.1, random).connect(filter);
  filter.connect(gain);
  gain.connect(out);
  const voice = { ctx, out, at, noise, random };
  tone(voice, 520, 0.25, 0.9, 2.1, 1560);
}

/** A tiny bell. */
function bell(voice: VoiceContext) {
  tone(voice, 1318, 1, 0.006, 1.6);
  tone(voice, 1976, 0.28, 0.006, 1.0);
  tone(voice, 3320, 0.08, 0.006, 0.5);
}

/** A soft shimmer: three high tones that bloom one after another and fade. */
function shimmer(voice: VoiceContext) {
  [1760, 2217, 2637].forEach((frequency, i) => {
    tone({ ...voice, at: voice.at + i * 0.22 }, frequency, 0.6, 0.35, 1.7);
  });
}

/** One warm low tone. */
function warm(voice: VoiceContext) {
  tone(voice, 196, 1, 0.08, 1.4);
  tone(voice, 98, 0.5, 0.1, 1.4);
}

/** Very quiet steps on leaves. */
function steps(voice: VoiceContext) {
  const { ctx, at, noise, random } = voice;
  let t = at;
  for (let i = 0; i < 4; i++) {
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900 + random() * 800;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.9 - i * 0.1, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    noiseBurst(ctx, noise, t, 0.1, random).connect(filter);
    filter.connect(gain);
    gain.connect(voice.out);
    t += 0.28 + random() * 0.14;
  }
}

export const VOICES: Record<VoiceName, (voice: VoiceContext) => void> = {
  thump,
  paper,
  rise,
  bell,
  shimmer,
  tone: warm,
  steps,
};
