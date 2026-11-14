// Plucked strings (guitar, banjo, upright bass) using the Karplus-Strong model:
// a burst of noise circulates in a short delay line and is gently smoothed on
// every pass, which sounds like a string ringing out. Each pitch is rendered
// once into a buffer and cached, so playing a note just replays the buffer.
// prepare() renders a tune's pitches before they're needed, keeping that work
// out of the scheduler's timer; play() still renders on demand as a fallback.

import { midiToFreq } from '../../music/theory.js';
import { releaseWhenDone, longestByPitch } from './prerender.js';

export const PLUCK_CONFIGS = {
  guitar: {
    name: 'guitar', damping: 0.996, length: 1.6, brightness: 0.6, level: 0.3,
    release: 0.12, strumSpread: 0.012,
    filters: [{ type: 'lowpass', frequency: 4500, Q: 0.7 }],
  },
  banjo: {
    name: 'banjo', damping: 0.985, length: 0.9, brightness: 0.95, level: 0.3,
    release: 0.08, strumSpread: 0.008,
    filters: [{ type: 'highpass', frequency: 250, Q: 0.7 }, { type: 'peaking', frequency: 2500, Q: 1.2, gain: 5 }],
  },
  bass: {
    name: 'bass', damping: 0.995, length: 1.4, brightness: 0.25, level: 0.6,
    release: 0.08, strumSpread: 0,
    filters: [{ type: 'lowpass', frequency: 900, Q: 0.8 }],
  },
};

const bufferCache = new WeakMap();

export function renderPluck(sampleRate, freq, { damping, length, brightness }) {
  const total = Math.floor(sampleRate * length);
  const out = new Float32Array(total);
  // The two-point average adds half a sample of delay, so subtract it.
  const period = Math.max(2, Math.round(sampleRate / freq - 0.5));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  // Darker instruments start from smoother noise.
  const passes = Math.round((1 - brightness) * 4);
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < period; i++) ring[i] = 0.5 * (ring[i] + ring[(i + 1) % period]);
  }
  let idx = 0;
  let peak = 0;
  for (let i = 0; i < total; i++) {
    const cur = ring[idx];
    const next = ring[(idx + 1) % period];
    out[i] = cur;
    peak = Math.max(peak, Math.abs(cur));
    ring[idx] = damping * 0.5 * (cur + next);
    idx = (idx + 1) % period;
  }
  const fade = Math.floor(sampleRate * 0.01);
  const norm = peak > 0 ? 0.8 / peak : 1;
  for (let i = 0; i < total; i++) {
    out[i] *= norm * (i >= total - fade ? (total - i) / fade : 1);
  }
  return out;
}

function getBuffer(ctx, config, midi) {
  if (!bufferCache.has(ctx)) bufferCache.set(ctx, new Map());
  const cache = bufferCache.get(ctx);
  const cacheKey = `${config.name}:${midi}`;
  if (!cache.has(cacheKey)) {
    const data = renderPluck(ctx.sampleRate, midiToFreq(midi), config);
    const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buffer.getChannelData(0).set(data);
    cache.set(cacheKey, buffer);
  }
  return cache.get(cacheKey);
}

export function createPluckVoice(ctx, output, config) {
  let input = output;
  for (const spec of [...config.filters].reverse()) {
    const filter = ctx.createBiquadFilter();
    filter.type = spec.type;
    filter.frequency.value = spec.frequency;
    filter.Q.value = spec.Q ?? 1;
    if (spec.gain !== undefined) filter.gain.value = spec.gain;
    filter.connect(input);
    input = filter;
  }

  function pluck(midi, velocity, when, dur) {
    const buffer = getBuffer(ctx, config, midi);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const env = ctx.createGain();
    env.gain.setValueAtTime(config.level * velocity, when);
    env.gain.setTargetAtTime(0, when + dur, config.release / 3);
    src.connect(env);
    env.connect(input);
    src.start(when);
    src.stop(Math.min(when + buffer.duration, when + dur + config.release * 2));
    releaseWhenDone(src, env);
  }

  return {
    prepare(events) {
      for (const midi of longestByPitch(events).keys()) getBuffer(ctx, config, midi);
    },

    play(ev, when, secondsPerTick) {
      const dur = Math.max(0.03, ev.durationTicks * secondsPerTick);
      if (!Array.isArray(ev.midi)) {
        pluck(ev.midi, ev.velocity, when, dur);
        return;
      }
      // A strum: strings sounded a few milliseconds apart, low to high on a
      // down-strum and high to low on an up-strum.
      const strings = [...ev.midi].sort((a, b) => a - b);
      if (ev.articulation === 'up') strings.reverse();
      const scale = 1 / Math.sqrt(strings.length);
      strings.forEach((midi, i) => {
        const offset = i * config.strumSpread;
        pluck(midi, ev.velocity * scale * (1 - i * 0.06), when + offset, Math.max(0.03, dur - offset));
      });
    },
  };
}

export const createGuitarVoice = (ctx, output) => createPluckVoice(ctx, output, PLUCK_CONFIGS.guitar);
export const createBanjoVoice = (ctx, output) => createPluckVoice(ctx, output, PLUCK_CONFIGS.banjo);
export const createBassVoice = (ctx, output) => createPluckVoice(ctx, output, PLUCK_CONFIGS.bass);
