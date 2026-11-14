// Synthesized piano: a handful of sine partials, each slightly sharp the way
// stiff piano strings are, each fading on its own curve, plus a short noise
// "hammer" click. Closer to a soft electric piano than a grand.
//
// A live piano note needs about fifteen audio nodes, so each pitch's natural
// ring is pre-rendered once and replayed; the damper (the key being released)
// is applied live. See prerender.js.
import { midiToFreq } from '../../music/theory.js';
import { noiseBuffer } from './percussion.js';
import {
  createRenderCache, playBuffer, releaseWhenDone, longestByPitch, TEMPO_MARGIN,
} from './prerender.js';

const PARTIALS = 6;
const STIFFNESS = 0.0004;
const SHORTEST = 0.08;    // even a very short note sounds for this long
const RING_AFTER = 0.4;   // how long a note is allowed to ring after the damper
const DAMPER = 0.05;      // time constant of the damper

// One struck note at `velocity`, into `out`. With `damperAt` null it rings
// freely, for pre-rendering.
function strike(c, out, { midi, velocity, when, damperAt, stopAt }) {
  const f = midiToFreq(midi);
  const baseDecay = Math.min(4, Math.max(0.4, 1.8 * Math.sqrt(262 / f)));
  const peak = 0.2 * velocity;

  for (let n = 1; n <= PARTIALS; n++) {
    const freq = n * f * Math.sqrt(1 + STIFFNESS * n * n);
    if (freq > c.sampleRate / 2.2) break;
    const osc = c.createOscillator();
    osc.frequency.value = freq;
    const env = c.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak / Math.pow(n, 1.4), when + 0.004);
    env.gain.setTargetAtTime(0, when + 0.004, baseDecay / Math.pow(n, 0.8) / 3);
    if (damperAt !== null) env.gain.setTargetAtTime(0, damperAt, DAMPER);
    osc.connect(env);
    env.connect(out);
    osc.start(when);
    osc.stop(stopAt);
    releaseWhenDone(osc, env);
  }

  const hammer = c.createBufferSource();
  hammer.buffer = noiseBuffer(c);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  const hEnv = c.createGain();
  hEnv.gain.setValueAtTime(0.04 * velocity, when);
  hEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.015);
  hammer.connect(lp);
  lp.connect(hEnv);
  hEnv.connect(out);
  hammer.start(when, Math.random() * 0.5);
  hammer.stop(when + 0.03);
  releaseWhenDone(hammer, lp, hEnv);
}

export function createPianoVoice(ctx, output) {
  const cache = createRenderCache(ctx);
  const ringFor = (dur) => Math.max(dur, SHORTEST) + RING_AFTER;

  function request(midi, dur) {
    const seconds = ringFor(dur) * TEMPO_MARGIN;
    cache.request(midi, seconds, (c, out) => strike(c, out, { midi, velocity: 1, when: 0, damperAt: null, stopAt: seconds }));
  }

  function playNote(midi, velocity, when, dur) {
    const noteEnd = when + Math.max(dur, SHORTEST);
    const stopAt = noteEnd + RING_AFTER;
    const buffer = cache.get(midi, ringFor(dur));
    if (!buffer) {
      request(midi, dur);
      strike(ctx, output, { midi, velocity, when, damperAt: noteEnd, stopAt });
      return;
    }
    playBuffer(ctx, output, buffer, when, stopAt, (gain) => {
      gain.setValueAtTime(velocity, when);
      gain.setTargetAtTime(0, noteEnd, DAMPER);
    });
  }

  return {
    prepare(events, secondsPerTick) {
      for (const [midi, ticks] of longestByPitch(events)) request(midi, ticks * secondsPerTick);
    },

    play(ev, when, secondsPerTick) {
      const dur = ev.durationTicks * secondsPerTick;
      const notes = Array.isArray(ev.midi) ? ev.midi : [ev.midi];
      const scale = 1 / Math.sqrt(notes.length);
      for (const midi of notes) playNote(midi, ev.velocity * scale, when, dur);
    },
  };
}
