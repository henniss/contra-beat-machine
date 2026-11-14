// Synthesized fiddle: two slightly detuned sawtooth waves (the raw buzz of a
// bowed string) shaped by fixed filters that imitate a violin body's
// resonances, with a soft bow attack and vibrato that fades in on long notes.
import { midiToFreq } from '../../music/theory.js';

const BODY_RESONANCES = [
  // [frequency Hz, Q, gain dB]
  [300, 1.4, 6],
  [1000, 1.8, 4],
  [3000, 2.0, 5],
];

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

  return {
    play(ev, when, secondsPerTick) {
      const dur = Math.max(0.03, ev.durationTicks * secondsPerTick);
      const attack = Math.min(0.03, dur * 0.3);
      const release = 0.05;
      const peak = 0.16 * ev.velocity;
      const freq = midiToFreq(ev.midi);
      const end = when + dur + release;

      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2400 + 3200 * ev.velocity;
      tone.Q.value = 0.6;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(peak, when + attack);
      if (dur > attack + 0.06) env.gain.linearRampToValueAtTime(peak * 0.8, when + attack + 0.06);
      env.gain.setValueAtTime(dur > attack + 0.06 ? peak * 0.8 : peak, when + dur);
      env.gain.linearRampToValueAtTime(0, end);
      tone.connect(env);
      env.connect(input);

      const oscs = [-5, 5].map((detune) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        osc.connect(tone);
        osc.start(when);
        osc.stop(end + 0.02);
        return osc;
      });

      if (dur > 0.25) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, when);
        depth.gain.linearRampToValueAtTime(12, when + Math.min(0.35, dur));
        lfo.connect(depth);
        for (const osc of oscs) depth.connect(osc.detune);
        lfo.start(when);
        lfo.stop(end + 0.02);
      }
    },
  };
}
