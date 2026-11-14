// Synthesized wooden flute: a mostly pure tone with a little edge, a puff of
// breath noise at the start of each note, and gentle vibrato on long notes.
//
// Notes (attack, breath puff, endless sustain) are pre-rendered and replayed
// by createHeldNoteVoice (prerender.js).
import { midiToFreq } from '../../music/theory.js';
import { createHeldNoteVoice, releaseWhenDone, noiseBuffer } from './prerender.js';

const ATTACK = 0.04;
const RELEASE = 0.06;
const LEVEL = 0.2;
const BREATH = 0.07;      // the breath puff's level, relative to a velocity-1 note
const VIBRATO_RAMP = 0.3;
// Shorter notes get a faster attack than the pre-rendered one, so they're built live.
const SHORTEST_PRERENDERED = 0.1;

// Sine plus a little triangle, into `out`, with optional vibrato.
function pipeTone(c, out, { freq, when, stopAt, vibratoRamp }) {
  const sine = c.createOscillator();
  sine.frequency.value = freq;
  sine.connect(out);
  const edge = c.createOscillator();
  edge.type = 'triangle';
  edge.frequency.value = freq;
  const edgeLevel = c.createGain();
  edgeLevel.gain.value = 0.25;
  edge.connect(edgeLevel);
  edgeLevel.connect(out);
  for (const osc of [sine, edge]) {
    osc.start(when);
    osc.stop(stopAt);
  }
  const nodes = [edge, edgeLevel];
  if (vibratoRamp) {
    const lfo = c.createOscillator();
    lfo.frequency.value = 5;
    const depth = c.createGain();
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(8, when + vibratoRamp);
    lfo.connect(depth);
    depth.connect(sine.detune);
    depth.connect(edge.detune);
    lfo.start(when);
    lfo.stop(stopAt);
    nodes.push(lfo, depth);
  }
  return { first: sine, nodes };
}

// The breath puff at the start of a note, into `out`.
function breathPuff(c, out, { freq, when, level }) {
  const breath = c.createBufferSource();
  breath.buffer = noiseBuffer(c);
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = Math.min(9000, freq * 2);
  band.Q.value = 1.5;
  const env = c.createGain();
  env.gain.setValueAtTime(level, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
  breath.connect(band);
  band.connect(env);
  env.connect(out);
  breath.start(when, Math.random() * 0.5);
  breath.stop(when + 0.1);
  releaseWhenDone(breath, band, env);
}

export function createFluteVoice(ctx, output) {
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4000;
  tone.connect(output);

  // Rendered at velocity 1: LEVEL and BREATH are applied by the live gain.
  function renderNote(c, out, midi, seconds) {
    const freq = midiToFreq(midi);
    const env = c.createGain();
    env.gain.setValueAtTime(0, 0);
    env.gain.linearRampToValueAtTime(1, ATTACK);
    env.connect(out);
    pipeTone(c, env, { freq, when: 0, stopAt: seconds, vibratoRamp: VIBRATO_RAMP });
    breathPuff(c, out, { freq, when: 0, level: BREATH / LEVEL });
  }

  // The original, fully live note.
  function playLive(ev, when, dur) {
    const attack = Math.min(ATTACK, dur * 0.4);
    const end = when + dur + RELEASE;
    const freq = midiToFreq(ev.midi);
    const peak = LEVEL * ev.velocity;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + attack);
    env.gain.setValueAtTime(peak, when + dur);
    env.gain.linearRampToValueAtTime(0, end);
    env.connect(tone);
    const { first, nodes } = pipeTone(ctx, env, {
      freq, when, stopAt: end + 0.02, vibratoRamp: dur > 0.25 ? Math.min(VIBRATO_RAMP, dur) : 0,
    });
    releaseWhenDone(first, ...nodes, env);
    breathPuff(ctx, tone, { freq, when, level: BREATH * ev.velocity });
  }

  return createHeldNoteVoice(ctx, tone, {
    level: LEVEL, release: RELEASE, shortest: SHORTEST_PRERENDERED, renderNote, playLive,
  });
}
