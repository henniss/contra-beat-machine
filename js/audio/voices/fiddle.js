// Synthesized fiddle: two slightly detuned sawtooth waves (the raw buzz of a
// bowed string) shaped by fixed filters that imitate a violin body's
// resonances, with a soft bow attack and vibrato that fades in on long notes.
//
// Each pitch's bowed tone (attack, then an endless sustain) is pre-rendered
// once and replayed, with the note's length and release applied live; see
// prerender.js. The body filters are shared by all notes and stay live.
import { midiToFreq } from '../../music/theory.js';
import {
  createRenderCache, playBuffer, releaseWhenDone, longestByPitch, TEMPO_MARGIN,
} from './prerender.js';

const BODY_RESONANCES = [
  // [frequency Hz, Q, gain dB]
  [300, 1.4, 6],
  [1000, 1.8, 4],
  [3000, 2.0, 5],
];

const ATTACK = 0.03;
const SETTLE = 0.06;      // after the attack, the bow eases back to 80%
const RELEASE = 0.05;
const LEVEL = 0.16;
const VIBRATO_RAMP = 0.35;
// Notes shorter than this (the quick notes of a roll) have a faster attack
// than the pre-rendered one, so they're built live.
const SHORTEST_PRERENDERED = 0.1;
// Pre-rendered notes use the brightness of a typical velocity (0.8).
const brightness = (velocity) => 2400 + 3200 * velocity;

// The bowed sound before its volume envelope, feeding `out`.
function bowedTone(c, out, { freq, cutoff, when, stopAt, vibratoRamp }) {
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = cutoff;
  tone.Q.value = 0.6;
  tone.connect(out);

  const oscs = [-5, 5].map((detune) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(tone);
    osc.start(when);
    osc.stop(stopAt);
    return osc;
  });
  const nodes = [tone, ...oscs.slice(1)];

  if (vibratoRamp) {
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = c.createGain();
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(12, when + vibratoRamp);
    lfo.connect(depth);
    for (const osc of oscs) depth.connect(osc.detune);
    lfo.start(when);
    lfo.stop(stopAt);
    nodes.push(lfo, depth);
  }
  return { first: oscs[0], nodes };
}

export function createFiddleVoice(ctx, output) {
  const input = ctx.createGain();
  let node = input;
  for (const [frequency, Q, gain] of BODY_RESONANCES) {
    const peak = ctx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = frequency;
    peak.Q.value = Q;
    peak.gain.value = gain;
    node.connect(peak);
    node = peak;
  }
  const air = ctx.createBiquadFilter();
  air.type = 'highshelf';
  air.frequency.value = 6000;
  air.gain.value = -10;
  node.connect(air);
  air.connect(output);

  const cache = createRenderCache(ctx);

  // Attack and settle at full scale, then sustain until the buffer ends.
  function request(midi, dur) {
    const seconds = (dur + RELEASE + 0.02) * TEMPO_MARGIN;
    cache.request(midi, seconds, (c, out) => {
      const env = c.createGain();
      env.gain.setValueAtTime(0, 0);
      env.gain.linearRampToValueAtTime(1, ATTACK);
      env.gain.linearRampToValueAtTime(0.8, ATTACK + SETTLE);
      env.connect(out);
      bowedTone(c, env, {
        freq: midiToFreq(midi), cutoff: brightness(0.8), when: 0, stopAt: seconds, vibratoRamp: VIBRATO_RAMP,
      });
    });
  }

  // The original, fully live note: used for short notes and until a buffer is ready.
  function playLive(ev, when, dur) {
    const attack = Math.min(ATTACK, dur * 0.3);
    const peak = LEVEL * ev.velocity;
    const end = when + dur + RELEASE;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + attack);
    if (dur > attack + SETTLE) env.gain.linearRampToValueAtTime(peak * 0.8, when + attack + SETTLE);
    env.gain.setValueAtTime(dur > attack + SETTLE ? peak * 0.8 : peak, when + dur);
    env.gain.linearRampToValueAtTime(0, end);
    env.connect(input);
    const { first, nodes } = bowedTone(ctx, env, {
      freq: midiToFreq(ev.midi),
      cutoff: brightness(ev.velocity),
      when,
      stopAt: end + 0.02,
      vibratoRamp: dur > 0.25 ? Math.min(VIBRATO_RAMP, dur) : 0,
    });
    releaseWhenDone(first, ...nodes, env);
  }

  return {
    prepare(events, secondsPerTick) {
      for (const [midi, ticks] of longestByPitch(events)) {
        const dur = ticks * secondsPerTick;
        if (dur >= SHORTEST_PRERENDERED) request(midi, dur);
      }
    },

    play(ev, when, secondsPerTick) {
      const dur = Math.max(0.03, ev.durationTicks * secondsPerTick);
      if (dur < SHORTEST_PRERENDERED) {
        playLive(ev, when, dur);
        return;
      }
      const buffer = cache.get(ev.midi, dur + RELEASE + 0.02);
      if (!buffer) {
        request(ev.midi, dur);
        playLive(ev, when, dur);
        return;
      }
      const level = LEVEL * ev.velocity;
      const end = when + dur + RELEASE;
      playBuffer(ctx, input, buffer, when, end + 0.02, (gain) => {
        gain.setValueAtTime(level, when);
        gain.setValueAtTime(level, when + dur);
        gain.linearRampToValueAtTime(0, end);
      });
    },
  };
}
