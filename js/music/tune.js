// Rule-based fiddle-tune generator.
//
// A tune is two parts (A and B). Each part is built from four phrases:
//   1. a motif,
//   2. the motif's opening (moved to fit the chords), then a new ending that
//      stops on a "half cadence",
//   3. the motif again, unchanged,
//   4. the motif's opening again, then an ending that lands on the home note.
// Strong positions get chord tones; the notes between them walk by scale step.
// The weights in RULES are the knobs to turn when tuning by ear.

import { createRng } from './rng.js';
import { styleSpec, TICKS_PER_BEAT } from './styles.js';
import { pickProgression } from './progressions.js';
import {
  pitchClass, pcAtOrAbove, chordToneMidis, nearestChordTone, isChordTone,
  scaleStep, scaleDistance, scalePitchClasses, chordAt,
} from './theory.js';

export const MELODY_RANGE = { low: 55, high: 88 };

export const RULES = {
  reelBeat: [['run', 78], ['mergeFirst', 9], ['mergeLast', 7], ['roll', 6]],
  jigBeat: [['run', 80], ['longShort', 20]],
  waltzBar: [
    [[12, 12, 12], 3],
    [[6, 6, 12, 12], 3],
    [[12, 6, 6, 12], 3],
    [[18, 6, 12], 3],
    [[24, 12], 2],
    [[12, 12, 6, 6], 2],
    [[6, 6, 6, 6, 12], 1],
  ],
  // How much each interval (in semitones, 0..9) is favoured between strong notes.
  strongIntervalWeights: [0.5, 3, 4, 4, 3.5, 2.5, 1.5, 1.2, 0.8, 0.4],
  // Waltzes move more by step and leap less.
  waltzIntervalWeights: [0.6, 4, 4.5, 3.5, 2.5, 1.5, 0.8, 0.5, 0.3, 0.1],
  gravityWidth: 7,           // how strongly notes are pulled back to the middle of the range
  leapChance: 0.08,          // a weak note jumps to another chord tone instead of stepping
  waltzLeapChance: 0.03,
  towardTargetChance: 0.7,   // with spare notes, step toward the next strong note (else away)
};

// ---------- rhythm ----------

function isStrong(spec, tick) {
  return spec.id === 'reel' ? tick % 6 === 0 : tick % TICKS_PER_BEAT === 0;
}

function slotsFromDurations(offset, durations) {
  const out = [];
  let t = offset;
  for (const dur of durations) {
    out.push({ tick: t, dur });
    t += dur;
  }
  return out;
}

function reelBeat(rng, offset) {
  switch (rng.weighted(RULES.reelBeat)) {
    case 'mergeFirst': return slotsFromDurations(offset, [6, 3, 3]);
    case 'mergeLast': return slotsFromDurations(offset, [3, 3, 6]);
    case 'roll': return [
      { tick: offset, dur: 1, roll: 'start' },
      { tick: offset + 1, dur: 1, roll: 'mid' },
      { tick: offset + 2, dur: 1, roll: 'end' },
      ...slotsFromDurations(offset + 3, [3, 3, 3]),
    ];
    default: return slotsFromDurations(offset, [3, 3, 3, 3]);
  }
}

function jigBeat(rng, offset) {
  return rng.weighted(RULES.jigBeat) === 'longShort'
    ? slotsFromDurations(offset, [8, 4])
    : slotsFromDurations(offset, [4, 4, 4]);
}

// role: 'normal' | 'half' (ends a phrase on the half cadence) | 'final' (ends the part)
function barRhythm(rng, spec, role) {
  if (spec.id === 'waltz') {
    if (role === 'half') return [{ tick: 0, dur: 24, cadence: 'half' }, { tick: 24, dur: 12 }];
    if (role === 'final') return [{ tick: 0, dur: 36, cadence: 'home' }];
    return slotsFromDurations(0, rng.weighted(RULES.waltzBar));
  }
  const beat = spec.id === 'reel' ? reelBeat : jigBeat;
  if (role === 'final') {
    const pickup = spec.id === 'reel' ? [3, 3, 3, 3] : [4, 4, 4];
    return [{ tick: 0, dur: 12, cadence: 'home' }, ...slotsFromDurations(12, pickup)];
  }
  if (role === 'half') {
    const tail = spec.id === 'reel' ? [6, 3, 3] : [8, 4];
    const second = slotsFromDurations(12, tail);
    second[0].cadence = 'half';
    return [...beat(rng, 0), ...second];
  }
  return [...beat(rng, 0), ...beat(rng, 12)];
}

// ---------- pitch ----------

function clampToRange(midi, range) {
  let m = midi;
  while (m > range.high) m -= 12;
  while (m < range.low) m += 12;
  return m;
}

function createPitchPicker(rng, spec, key, range) {
  const intervalWeights = spec.id === 'waltz' ? RULES.waltzIntervalWeights : RULES.strongIntervalWeights;
  const leapChance = spec.id === 'waltz' ? RULES.waltzLeapChance : RULES.leapChance;
  const tonicPc = pitchClass(key.tonic);

  function gravity(m) {
    const d = (m - range.center) / RULES.gravityWidth;
    return Math.exp(-d * d);
  }

  function chooseStrong(prev, chord, cadence) {
    let candidates = chordToneMidis(key, chord, range.low, range.high);
    if (cadence === 'home') {
      candidates = candidates.filter((m) => m % 12 === tonicPc);
      return candidates.reduce((best, m) => (Math.abs(m - prev) < Math.abs(best - prev) ? m : best));
    }
    if (cadence === 'half') {
      const nonTonic = candidates.filter((m) => m % 12 !== tonicPc);
      if (nonTonic.length) candidates = nonTonic;
    }
    const weighted = candidates
      .map((m) => {
        const d = Math.abs(m - prev);
        return [m, d < intervalWeights.length ? intervalWeights[d] * gravity(m) : 0];
      })
      .filter(([, w]) => w > 0);
    if (!weighted.length) return nearestChordTone(prev, key, chord, range.low, range.high);
    return rng.weighted(weighted);
  }

  function step(m, dir) {
    let next = scaleStep(m, dir, key);
    if (next > range.high || next < range.low) next = scaleStep(m, -dir, key);
    return next;
  }

  // Fill `slots` (all weak) between pitch `from` and pitch `to` (or null).
  function fillWeak(slots, from, to) {
    let cur = from;
    slots.forEach((slot, i) => {
      const slotsLeft = slots.length - i;
      if (rng.chance(leapChance)) {
        const leaps = chordToneMidis(key, slot.chord, Math.max(range.low, cur - 7), Math.min(range.high, cur + 7))
          .filter((m) => Math.abs(m - cur) >= 3);
        if (leaps.length) {
          cur = rng.pick(leaps);
          slot.midi = cur;
          return;
        }
      }
      let dir;
      if (to === null) {
        dir = cur > range.center + 4 ? -1 : cur < range.center - 4 ? 1 : rng.pick([1, -1]);
      } else {
        const remain = scaleDistance(cur, to, key);
        if (Math.abs(remain) >= slotsLeft) {
          dir = Math.sign(remain);
        } else if (remain === 0) {
          dir = rng.pick([1, -1]);
        } else {
          dir = rng.chance(RULES.towardTargetChance) ? Math.sign(remain) : -Math.sign(remain);
          // Stepping away must still leave enough notes to come back.
          if (dir !== Math.sign(remain) && Math.abs(remain) + 1 > slotsLeft - 1) dir = Math.sign(remain);
        }
      }
      cur = step(cur, dir);
      slot.midi = cur;
    });
  }

  // Give every slot without a pitch one: strong slots first, then the walks between them.
  function assign(slots, prevPitch, nextTarget) {
    const primary = slots.filter((s) => s.roll !== 'mid' && s.roll !== 'end');
    let prev = prevPitch;
    for (const slot of primary) {
      if (slot.midi === undefined && (slot.strong || slot.cadence)) {
        slot.midi = chooseStrong(prev, slot.chord, slot.cadence);
      }
      if (slot.midi !== undefined) prev = slot.midi;
    }
    let i = 0;
    while (i < primary.length) {
      if (primary[i].midi !== undefined) { i++; continue; }
      let j = i;
      while (j < primary.length && primary[j].midi === undefined) j++;
      const from = i > 0 ? primary[i - 1].midi : prevPitch;
      const to = j < primary.length ? primary[j].midi : nextTarget;
      fillWeak(primary.slice(i, j), from, to ?? null);
      i = j;
    }
    resolveRolls(slots);
  }

  // A roll is main note, the note above (below, at the top of the range), main note.
  function resolveRolls(slots) {
    slots.forEach((slot, i) => {
      if (slot.roll === 'mid') slot.midi = step(slots[i - 1].midi, 1);
      if (slot.roll === 'end') slot.midi = slots[i - 2].midi;
    });
  }

  // Copy pitches from `source` slots onto `target` slots (same rhythm), moved by
  // `steps` scale degrees, with strong notes nudged onto the new chords.
  function copyInto(source, target, steps) {
    target.forEach((slot, i) => {
      let m = clampToRange(scaleStep(source[i].midi, steps, key), range);
      if (slot.strong && slot.roll !== 'mid' && slot.roll !== 'end' && !isChordTone(m, key, slot.chord)) {
        m = nearestChordTone(m, key, slot.chord, range.low, range.high);
      }
      slot.midi = m;
    });
    resolveRolls(target);
  }

  return { chooseStrong, assign, copyInto };
}

// ---------- parts ----------

function partRange(key, part) {
  const tonicRef = pcAtOrAbove(pitchClass(key.tonic), 62);
  const center = tonicRef + (part === 'A' ? 5 : 10);
  return {
    center,
    low: Math.max(MELODY_RANGE.low, center - 10),
    high: Math.min(MELODY_RANGE.high, center + 9),
  };
}

const cloneRhythm = (bar) => bar.map((s) => ({ ...s, cadence: undefined }));

function degreeShift(fromChord, toChord) {
  let d = (toChord.degree - fromChord.degree) % 7;
  if (d > 3) d -= 7;
  if (d < -3) d += 7;
  return d;
}

function generatePart(rng, spec, key, part) {
  const chords = pickProgression(rng, spec.id, key, part);
  const range = partRange(key, part);
  const picker = createPitchPicker(rng, spec, key, range);
  const unitLen = spec.barsPerPart / 4;
  const halfLen = unitLen / 2;

  const rhythms = [];
  for (let u = 0; u < 4; u++) {
    for (let b = 0; b < unitLen; b++) {
      const isLast = b === unitLen - 1;
      if (u === 2 || (u > 0 && b < halfLen)) {
        rhythms.push(cloneRhythm(rhythms[b]));
      } else {
        const role = isLast && u === 1 ? 'half' : isLast && u === 3 ? 'final' : 'normal';
        rhythms.push(barRhythm(rng, spec, role));
      }
    }
  }

  const barSlots = rhythms.map((rhythm, bar) => rhythm.map((s) => ({
    ...s,
    bar,
    strong: isStrong(spec, s.tick),
    chord: chordAt(chords[bar], s.tick),
  })));
  const unitSlots = (u) => barSlots.slice(u * unitLen, (u + 1) * unitLen).flat();
  const halfSlots = (u) => barSlots.slice(u * unitLen, u * unitLen + halfLen).flat();
  const tailSlots = (u) => barSlots.slice(u * unitLen + halfLen, (u + 1) * unitLen).flat();

  // Phrase 1: the motif.
  picker.assign(unitSlots(0), range.center, null);
  const firstPitch = barSlots[0][0].midi;

  // Phrases 2 and 4: the motif's opening, then a new ending.
  for (const u of [1, 3]) {
    const steps = degreeShift(chords[0][0], chords[u * unitLen][0]);
    picker.copyInto(halfSlots(0), halfSlots(u), steps);
    const lead = halfSlots(u);
    picker.assign(tailSlots(u), lead[lead.length - 1].midi, firstPitch);
  }

  // Phrase 3: the motif again.
  picker.copyInto(unitSlots(0), unitSlots(2), 0);

  return barSlots.map((slots, bar) => ({
    chords: chords[bar],
    melody: slots.map((s) => ({
      tick: s.tick,
      durationTicks: s.dur,
      midi: s.midi,
      velocity: noteVelocity(rng, s),
      ...(s.roll === 'mid' || s.roll === 'end' ? { articulation: 'roll' } : {}),
    })),
  }));
}

function noteVelocity(rng, slot) {
  let v = slot.tick % TICKS_PER_BEAT === 0 ? 0.9 : slot.strong ? 0.8 : 0.68;
  if (slot.cadence) v = 0.9;
  if (slot.roll === 'mid' || slot.roll === 'end') v = 0.55;
  return Math.min(1, Math.max(0.3, v + (rng.next() - 0.5) * 0.1));
}

export function generateTune({ seed, style, key }) {
  const spec = styleSpec(style);
  scalePitchClasses(key); // validates the key early
  const rng = createRng(seed);
  return {
    seed,
    style,
    key: { ...key },
    parts: {
      A: generatePart(rng, spec, key, 'A'),
      B: generatePart(rng, spec, key, 'B'),
    },
  };
}
