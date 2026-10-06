/** A few seconds of white noise, to be looped or sliced. Everything noisy here is this, filtered. */
export function createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A source over the noise that loops forever. */
export function loopNoise(ctx: AudioContext, noise: AudioBuffer): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  return source;
}

/** A short slice of the noise, played once. */
export function noiseBurst(
  ctx: AudioContext,
  noise: AudioBuffer,
  at: number,
  seconds: number,
  random: () => number,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.start(at, random() * Math.max(0, noise.duration - seconds - 0.05), seconds + 0.05);
  return source;
}
