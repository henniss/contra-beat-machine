// Bodhrán (Irish frame drum) and Québécois foot-tapping, built from a falling
// sine "thump" plus a burst of filtered noise. Also provides the shared noise
// buffer that other voices use for breath and hammer sounds.

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
}

const BODHRAN_STROKES = {
  accent: { from: 130, to: 55, decay: 0.3, level: 0.9, noise: 0.25, noiseFreq: 1500 },
  normal: { from: 150, to: 65, decay: 0.22, level: 0.6, noise: 0.3, noiseFreq: 1500 },
  ghost: { from: 220, to: 120, decay: 0.08, level: 0.3, noise: 0.45, noiseFreq: 3000 },
};

export function createBodhranVoice(ctx, output) {
  return {
    play(ev, when) {
      const s = BODHRAN_STROKES[ev.articulation] ?? BODHRAN_STROKES.normal;
      const v = ev.velocity;
      thump(ctx, output, when, { from: s.from, to: s.to, sweep: 0.1, level: s.level * v, decay: s.decay });
      noiseBurst(ctx, output, when, { type: 'bandpass', frequency: s.noiseFreq, Q: 0.8, level: s.noise * v, decay: 0.03 });
    },
  };
}

export function createFeetVoice(ctx, output) {
  return {
    play(ev, when) {
      const v = ev.velocity;
      if (ev.articulation === 'toe') {
        noiseBurst(ctx, output, when, { type: 'bandpass', frequency: 1800, Q: 1.2, level: 0.5 * v, decay: 0.03 });
        thump(ctx, output, when, { from: 350, to: 250, sweep: 0.03, level: 0.2 * v, decay: 0.04 });
      } else {
        thump(ctx, output, when, { from: 100, to: 45, sweep: 0.06, level: 0.9 * v, decay: 0.15 });
        noiseBurst(ctx, output, when, { type: 'lowpass', frequency: 400, level: 0.5 * v, decay: 0.05 });
      }
    },
  };
}
