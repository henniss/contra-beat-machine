// Synthesized wooden flute: a mostly pure tone with a little edge, a puff of
// breath noise at the start of each note, and gentle vibrato on long notes.
import { midiToFreq } from '../../music/theory.js';
import { noiseBuffer } from './percussion.js';

export function createFluteVoice(ctx, output) {
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4000;
  tone.connect(output);

  return {
    play(ev, when, secondsPerTick) {
      const dur = Math.max(0.03, ev.durationTicks * secondsPerTick);
      const attack = Math.min(0.04, dur * 0.4);
      const release = 0.06;
      const end = when + dur + release;
      const freq = midiToFreq(ev.midi);
      const peak = 0.2 * ev.velocity;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(peak, when + attack);
      env.gain.setValueAtTime(peak, when + dur);
      env.gain.linearRampToValueAtTime(0, end);
      env.connect(tone);

      const sine = ctx.createOscillator();
      sine.frequency.value = freq;
      sine.connect(env);
      const edge = ctx.createOscillator();
      edge.type = 'triangle';
      edge.frequency.value = freq;
      const edgeLevel = ctx.createGain();
      edgeLevel.gain.value = 0.25;
      edge.connect(edgeLevel);
      edgeLevel.connect(env);
      for (const osc of [sine, edge]) {
        osc.start(when);
        osc.stop(end + 0.02);
      }

      if (dur > 0.25) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, when);
        depth.gain.linearRampToValueAtTime(8, when + Math.min(0.3, dur));
        lfo.connect(depth);
        depth.connect(sine.detune);
        depth.connect(edge.detune);
        lfo.start(when);
        lfo.stop(end + 0.02);
      }

      const breath = ctx.createBufferSource();
      breath.buffer = noiseBuffer(ctx);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = Math.min(9000, freq * 2);
      band.Q.value = 1.5;
      const breathEnv = ctx.createGain();
      breathEnv.gain.setValueAtTime(0.07 * ev.velocity, when);
      breathEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
      breath.connect(band);
      band.connect(breathEnv);
      breathEnv.connect(tone);
      breath.start(when, Math.random() * 0.5);
      breath.stop(when + 0.1);
    },
  };
}
