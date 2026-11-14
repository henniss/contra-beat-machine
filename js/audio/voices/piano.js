// Synthesized piano: a handful of sine partials, each slightly sharp the way
// stiff piano strings are, each fading on its own curve, plus a short noise
// "hammer" click. Closer to a soft electric piano than a grand.
import { midiToFreq } from '../../music/theory.js';
import { noiseBuffer } from './percussion.js';

const PARTIALS = 6;
const STIFFNESS = 0.0004;

export function createPianoVoice(ctx, output) {
  function playNote(midi, velocity, when, dur) {
    const f = midiToFreq(midi);
    const baseDecay = Math.min(4, Math.max(0.4, 1.8 * Math.sqrt(262 / f)));
    const noteEnd = when + Math.max(dur, 0.08);
    const peak = 0.2 * velocity;

    for (let n = 1; n <= PARTIALS; n++) {
      const freq = n * f * Math.sqrt(1 + STIFFNESS * n * n);
      if (freq > ctx.sampleRate / 2.2) break;
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const env = ctx.createGain();
      const amp = peak / Math.pow(n, 1.4);
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(amp, when + 0.004);
      env.gain.setTargetAtTime(0, when + 0.004, baseDecay / Math.pow(n, 0.8) / 3);
      // Damper: the key is released at the end of the note.
      env.gain.setTargetAtTime(0, noteEnd, 0.05);
      osc.connect(env);
      env.connect(output);
      osc.start(when);
      osc.stop(noteEnd + 0.4);
    }

    const hammer = ctx.createBufferSource();
    hammer.buffer = noiseBuffer(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    const hEnv = ctx.createGain();
    hEnv.gain.setValueAtTime(0.04 * velocity, when);
    hEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.015);
    hammer.connect(lp);
    lp.connect(hEnv);
    hEnv.connect(output);
    hammer.start(when, Math.random() * 0.5);
    hammer.stop(when + 0.03);
  }

  return {
    play(ev, when, secondsPerTick) {
      const dur = ev.durationTicks * secondsPerTick;
      const notes = Array.isArray(ev.midi) ? ev.midi : [ev.midi];
      const scale = 1 / Math.sqrt(notes.length);
      for (const midi of notes) playNote(midi, ev.velocity * scale, when, dur);
    },
  };
}
