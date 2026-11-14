// Bodhrán (Irish frame drum), Québécois foot-tapping, and the metronome click,
// built from short sine tones and bursts of filtered noise. Also provides the
// shared noise buffer that other voices use for breath and hammer sounds.
//
// Every stroke is pre-rendered a few times (the noise differs each time, so
// repeated hits don't sound identical) and replayed at the event's velocity;
// see prerender.js.
import { createRenderCache, playBuffer, releaseWhenDone } from './prerender.js';

const noiseCache = new WeakMap();

export function noiseBuffer(ctx) {
  if (!noiseCache.has(ctx)) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return noiseCache.get(ctx);
}

function thump(ctx, output, when, { from, to, sweep, level, decay }) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(from, when);
  osc.frequency.exponentialRampToValueAtTime(to, when + sweep);
  const env = ctx.createGain();
  env.gain.setValueAtTime(level, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  osc.connect(env);
  env.connect(output);
  osc.start(when);
  osc.stop(when + decay + 0.02);
  releaseWhenDone(osc, env);
}

function noiseBurst(ctx, output, when, { type, frequency, Q = 1, level, decay }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = Q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(level, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  src.connect(filter);
  filter.connect(env);
  env.connect(output);
  src.start(when, Math.random() * 0.5);
  src.stop(when + decay + 0.02);
  releaseWhenDone(src, filter, env);
}

const TAKES = 4;

// strokes: { name: { length (seconds), build(ctx, output, when, velocity) } }.
// strokeFor(event) names the stroke to play.
function createHitVoice(ctx, output, strokes, strokeFor) {
  const cache = createRenderCache(ctx);
  for (const [name, stroke] of Object.entries(strokes)) {
    for (let take = 0; take < TAKES; take++) {
      cache.request(`${name}:${take}`, stroke.length, (c, out) => stroke.build(c, out, 0, 1));
    }
  }
  let hits = 0;
  return {
    play(ev, when) {
      const name = strokeFor(ev);
      const buffer = cache.get(`${name}:${hits++ % TAKES}`);
      if (!buffer) {
        strokes[name].build(ctx, output, when, ev.velocity);
        return;
      }
      playBuffer(ctx, output, buffer, when, when + buffer.duration, (gain) => gain.setValueAtTime(ev.velocity, when));
    },
  };
}

const BODHRAN_STROKES = {
  accent: { from: 130, to: 55, decay: 0.3, level: 0.9, noise: 0.25, noiseFreq: 1500 },
  normal: { from: 150, to: 65, decay: 0.22, level: 0.6, noise: 0.3, noiseFreq: 1500 },
  ghost: { from: 220, to: 120, decay: 0.08, level: 0.3, noise: 0.45, noiseFreq: 3000 },
};

export function createBodhranVoice(ctx, output) {
  const strokes = Object.fromEntries(Object.entries(BODHRAN_STROKES).map(([name, s]) => [name, {
    length: Math.max(s.decay, 0.03) + 0.03,
    build(c, out, when, v) {
      thump(c, out, when, { from: s.from, to: s.to, sweep: 0.1, level: s.level * v, decay: s.decay });
      noiseBurst(c, out, when, { type: 'bandpass', frequency: s.noiseFreq, Q: 0.8, level: s.noise * v, decay: 0.03 });
    },
  }]));
  return createHitVoice(ctx, output, strokes, (ev) => (ev.articulation in strokes ? ev.articulation : 'normal'));
}

// A woodblock-style click, the same on every beat.
export function createMetronomeVoice(ctx, output) {
  const strokes = {
    click: {
      length: 0.08,
      build(c, out, when, v) {
        thump(c, out, when, { from: 1320, to: 1280, sweep: 0.02, level: 0.5 * v, decay: 0.05 });
        noiseBurst(c, out, when, { type: 'highpass', frequency: 3000, level: 0.25 * v, decay: 0.012 });
      },
    },
  };
  return createHitVoice(ctx, output, strokes, () => 'click');
}

export function createFeetVoice(ctx, output) {
  const strokes = {
    toe: {
      length: 0.07,
      build(c, out, when, v) {
        noiseBurst(c, out, when, { type: 'bandpass', frequency: 1800, Q: 1.2, level: 0.5 * v, decay: 0.03 });
        thump(c, out, when, { from: 350, to: 250, sweep: 0.03, level: 0.2 * v, decay: 0.04 });
      },
    },
    heel: {
      length: 0.18,
      build(c, out, when, v) {
        thump(c, out, when, { from: 100, to: 45, sweep: 0.06, level: 0.9 * v, decay: 0.15 });
        noiseBurst(c, out, when, { type: 'lowpass', frequency: 400, level: 0.5 * v, decay: 0.05 });
      },
    },
  };
  return createHitVoice(ctx, output, strokes, (ev) => (ev.articulation === 'toe' ? 'toe' : 'heel'));
}
