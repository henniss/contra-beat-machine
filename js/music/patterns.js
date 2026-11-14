// Accompaniment: one function per instrument that turns a tune into every note
// that instrument plays during one time through (A, A, B, B), with ticks
// counted from the start of the loop. Each style gets its own feel:
// boom-chuck and strums for reels and jigs, oom-pah-pah for waltzes.
//
// So that a new tune doesn't bring back the same backing, each backing
// instrument has a few rhythm patterns ("variants"). The tune's seed picks one
// for the A part and one for the B part, so the choice is repeatable.

import { styleSpec, barTicks, PART_ORDER, TICKS_PER_BEAT, loopTicks } from './styles.js';
import {
  chordToneMidis, chordRootPc, pcAtOrAbove, scaleStep, pitchClass, chordAt,
} from './theory.js';
import { createRng } from './rng.js';

// The tune in playing order: [{ bar, part, partIndex, barInPart, startTick, next }],
// where `next` is the bar that follows (wrapping round to the start).
export function expandTune(tune) {
  const length = barTicks(tune.style);
  const out = [];
  let startTick = 0;
  PART_ORDER.forEach((part, partIndex) => {
    tune.parts[part].forEach((bar, barInPart) => {
      out.push({ bar, part, partIndex, barInPart, startTick });
      startTick += length;
    });
  });
  out.forEach((entry, i) => { entry.next = out[(i + 1) % out.length].bar; });
  return out;
}

const sameChord = (a, b) => a.degree === b.degree && a.quality === b.quality;
const sortByTick = (events) => events.sort((a, b) => a.tick - b.tick);
const rootAtOrAbove = (key, chord, low) => pcAtOrAbove(chordRootPc(key, chord), low);
const closeVoicing = (key, chord, low) => chordToneMidis(key, chord, low, low + 11).slice(0, 3);
// Does the chord change going into the next bar (from a one-chord bar)?
const changesNext = ({ bar, next }) => bar.chords.length === 1 && !sameChord(next.chords[0], bar.chords[0]);

const ev = (tick, durationTicks, midi, velocity, articulation) => ({
  tick, durationTicks, velocity,
  ...(midi !== undefined ? { midi } : {}),
  ...(articulation ? { articulation } : {}),
});

// ---------- variants ----------

export const VARIANTS = {
  piano: {
    reel: [['boomChuck', 3], ['boomChuckA', 2], ['walking', 2]],
    jig: [['boomChuck', 3], ['boomChickChick', 2], ['walking', 2]],
    waltz: [['oomPahPah', 3], ['rolled', 2], ['held', 2]],
  },
  guitar: {
    reel: [['downUp', 3], ['boomChuck', 2], ['sixteenths', 2]],
    jig: [['downUpDown', 3], ['boomChuck', 2]],
    waltz: [['bassStrumStrum', 3], ['picked', 2], ['strumAll', 1]],
  },
  banjo: {
    reel: [['bumDitty', 3], ['roll', 2]],
    jig: [['bumDitty', 3], ['roll', 2]],
    waltz: [['arpeggio', 3], ['slowRoll', 2]],
  },
  bass: {
    reel: [['rootFifth', 3], ['walking', 2], ['rootOctave', 1]],
    jig: [['rootFifth', 3], ['walking', 2], ['rootOctave', 1]],
    waltz: [['long', 2], ['twoPerBar', 2], ['walking', 2]],
  },
  bodhran: {
    reel: [['steady', 3], ['sparse', 2]],
    jig: [['steady', 3], ['sparse', 2]],
    waltz: [['brushes', 3], ['pulse', 2]],
  },
  feet: {
    reel: [['heelToe', 3], ['gallop', 2]],
    jig: [['heelToe', 3], ['triplet', 2]],
    waltz: [['heelToeToe', 1]],
  },
};

const B_PART_KEEPS_VARIANT = 0.6;

function seedFor(seed, salt) {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  for (const c of salt) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// The variant an instrument plays in each part of this tune: { A, B }.
export function pickVariants(tune, id) {
  const rng = createRng(seedFor(tune.seed, id));
  const options = VARIANTS[id][tune.style];
  const A = rng.weighted(options);
  const B = rng.chance(B_PART_KEEPS_VARIANT) ? A : rng.weighted(options);
  return { A, B };
}

// Calls fn(entry, variant) for every bar of the loop.
function eachBar(tune, id, fn) {
  const variants = pickVariants(tune, id);
  for (const entry of expandTune(tune)) fn(entry, variants[entry.part]);
}

// ---------- melody ----------

export function fiddlePattern(tune) {
  const out = [];
  for (const { bar, startTick } of expandTune(tune)) {
    for (const note of bar.melody) out.push({ ...note, tick: startTick + note.tick });
  }
  return out;
}

export function flutePattern(tune) {
  const out = [];
  for (const { bar, part, startTick } of expandTune(tune)) {
    const octaveUp = tune.style === 'waltz' || part === 'A';
    for (const note of bar.melody) {
      const up = note.midi + 12;
      out.push({ ...note, tick: startTick + note.tick, midi: octaveUp && up <= 93 ? up : note.midi, velocity: note.velocity * 0.9 });
    }
  }
  return out;
}

// ---------- rhythm section ----------

export function pianoPattern(tune) {
  const { key } = tune;
  const out = [];
  // Left-hand bass sits below 55; right-hand chords start at 55.
  const pianoBass = (chord) => rootAtOrAbove(key, chord, 43);

  eachBar(tune, 'piano', (entry, variant) => {
    const { bar, startTick: t } = entry;
    if (tune.style === 'waltz') {
      const chord = bar.chords[0];
      const voicing = closeVoicing(key, chord, 55);
      out.push(ev(t, 10, pianoBass(chord), 0.8));
      if (variant === 'rolled') {
        [0, 1, 2, 1].forEach((idx, i) => out.push(ev(t + 12 + i * 6, 6, voicing[idx], 0.45)));
      } else if (variant === 'held') {
        out.push(ev(t + 12, 22, voicing, 0.5));
      } else {
        out.push(ev(t + 12, 8, voicing, 0.5));
        out.push(ev(t + 24, 8, voicing, 0.45));
      }
      return;
    }
    for (let b = 0; b < 2; b++) {
      const tick = t + b * TICKS_PER_BEAT;
      const chord = chordAt(bar.chords, b * TICKS_PER_BEAT);
      const root = pianoBass(chord);
      const fifth = root + 7 >= 55 ? root - 5 : root + 7;
      let bass = b === 1 && sameChord(chord, chordAt(bar.chords, 0)) ? fifth : root;
      if (b === 1 && variant === 'walking' && changesNext(entry)) {
        bass = scaleStep(pianoBass(entry.next.chords[0]), -1, key);
      }
      out.push(ev(tick, 5, bass, b === 0 ? 0.9 : 0.8));
      const voicing = closeVoicing(key, chord, 55);
      if (tune.style === 'reel') {
        out.push(ev(tick + 6, 4, voicing, 0.6));
        if (variant === 'boomChuckA' && b === 1) out.push(ev(tick + 9, 3, voicing, 0.4));
      } else {
        if (variant === 'boomChickChick') out.push(ev(tick + 4, 3, voicing, 0.4));
        out.push(ev(tick + 8, 4, voicing, 0.6));
      }
    }
  });
  return out;
}

function guitarVoicing(key, chord) {
  return chordToneMidis(key, chord, 50, 66);
}

export function guitarPattern(tune) {
  const { key } = tune;
  const out = [];
  const guitarBass = (chord) => rootAtOrAbove(key, chord, 40);

  eachBar(tune, 'guitar', ({ bar, startTick: t }, variant) => {
    if (tune.style === 'waltz') {
      const chord = bar.chords[0];
      const voicing = guitarVoicing(key, chord);
      if (variant === 'strumAll') {
        out.push(ev(t, 10, voicing, 0.6, 'down'));
        out.push(ev(t + 12, 8, voicing.slice(-4), 0.4, 'down'));
        out.push(ev(t + 24, 8, voicing.slice(-4), 0.4, 'down'));
        return;
      }
      out.push(ev(t, 10, guitarBass(chord), 0.7));
      if (variant === 'picked') {
        const top = voicing.slice(-3);
        [0, 1, 2, 1].forEach((idx, i) => out.push(ev(t + 12 + i * 6, 6, top[idx], 0.45)));
      } else {
        out.push(ev(t + 12, 8, voicing.slice(-4), 0.45, 'down'));
        out.push(ev(t + 24, 8, voicing.slice(-4), 0.4, 'down'));
      }
      return;
    }
    for (let b = 0; b < 2; b++) {
      const tick = t + b * TICKS_PER_BEAT;
      const chord = chordAt(bar.chords, b * TICKS_PER_BEAT);
      const voicing = guitarVoicing(key, chord);
      const top = voicing.slice(-3);
      if (variant === 'boomChuck') {
        out.push(ev(tick, 5, guitarBass(chord), 0.7));
        out.push(ev(tick + (tune.style === 'reel' ? 6 : 8), 4, voicing, 0.6, 'down'));
      } else if (variant === 'sixteenths') {
        out.push(ev(tick, 3, voicing, 0.75, 'down'));
        out.push(ev(tick + 3, 3, top, 0.3, 'up'));
        out.push(ev(tick + 6, 3, voicing, 0.55, 'down'));
        out.push(ev(tick + 9, 3, top, 0.35, 'up'));
      } else if (tune.style === 'reel') {
        out.push(ev(tick, 6, voicing, 0.75, 'down'));
        out.push(ev(tick + 6, 5, top, 0.5, 'up'));
      } else {
        out.push(ev(tick, 4, voicing, 0.75, 'down'));
        out.push(ev(tick + 4, 4, top, 0.45, 'up'));
        out.push(ev(tick + 8, 4, voicing, 0.6, 'down'));
      }
    }
  });
  return out;
}

export function banjoPattern(tune) {
  const { key } = tune;
  const out = [];
  const drone = pcAtOrAbove(pitchClass(key.tonic), 67);
  let beatIndex = 0;

  eachBar(tune, 'banjo', ({ bar, startTick: t }, variant) => {
    if (tune.style === 'waltz') {
      const tones = chordToneMidis(key, bar.chords[0], 60, 76);
      if (variant === 'slowRoll') {
        [0, 1, 2].forEach((idx) => out.push(ev(t + idx * 12, 12, tones[idx % tones.length], 0.5)));
        out.push(ev(t + 30, 6, drone, 0.35));
      } else {
        [0, 1, 2, 3, 2, 1].forEach((idx, i) => out.push(ev(t + i * 6, 6, tones[idx % tones.length], 0.45)));
      }
      return;
    }
    for (let b = 0; b < 2; b++) {
      const tick = t + b * TICKS_PER_BEAT;
      const chord = chordAt(bar.chords, b * TICKS_PER_BEAT);
      const tones = chordToneMidis(key, chord, 60, 72);
      if (variant === 'roll') {
        // A "forward roll": low string, middle string, the drone, then high.
        const notes = [tones[0], tones[1], drone, tones[2]];
        const [step, count] = tune.style === 'reel' ? [3, 4] : [4, 3];
        const velocities = [0.7, 0.55, 0.45, 0.6];
        for (let i = 0; i < count; i++) out.push(ev(tick + i * step, step, notes[i], velocities[i]));
      } else {
        // Old-time "bum-ditty": a note, a brush across the strings, the thumb drone.
        const [brushAt, thumbAt, len] = tune.style === 'reel' ? [6, 9, 3] : [4, 8, 4];
        out.push(ev(tick, brushAt, tones[beatIndex % tones.length], 0.75));
        out.push(ev(tick + brushAt, len, chordToneMidis(key, chord, 62, 74).slice(-3), 0.5, 'down'));
        out.push(ev(tick + thumbAt, len, drone, 0.45));
      }
      beatIndex++;
    }
  });
  return out;
}

export function bassPattern(tune) {
  const { key } = tune;
  const rng = createRng(seedFor(tune.seed, 'bass-walk'));
  const out = [];
  const bassRoot = (chord) => rootAtOrAbove(key, chord, 36);
  let prevChord = null;
  let usedFifth = false;

  eachBar(tune, 'bass', (entry, variant) => {
    const { bar, startTick: t } = entry;
    const first = bar.chords[0];
    const root = bassRoot(first);

    if (tune.style === 'waltz') {
      usedFifth = prevChord && sameChord(prevChord, first) ? !usedFifth : false;
      prevChord = first;
      if (variant === 'long') {
        out.push(ev(t, 33, usedFifth ? root + 7 : root, 0.8));
        return;
      }
      out.push(ev(t, 22, root, 0.8));
      const second = variant === 'walking' && changesNext(entry)
        ? scaleStep(bassRoot(entry.next.chords[0]), -1, key)
        : root + 7;
      out.push(ev(t + 24, 10, second, 0.65));
      return;
    }

    out.push(ev(t, 10, root, 0.9));
    if (bar.chords.length > 1) {
      out.push(ev(t + 12, 10, bassRoot(bar.chords[1]), 0.75));
      return;
    }
    const walkChance = variant === 'walking' ? 0.75 : variant === 'rootFifth' ? 0.3 : 0;
    if (changesNext(entry) && rng.chance(walkChance)) {
      // Walk up into the next chord: two scale steps leading to its root.
      const target = bassRoot(entry.next.chords[0]);
      const [second, third] = tune.style === 'reel' ? [[12, 5], [18, 5]] : [[12, 7], [20, 4]];
      out.push(ev(t + second[0], second[1], scaleStep(target, -2, key), 0.75));
      out.push(ev(t + third[0], third[1], scaleStep(target, -1, key), 0.75));
    } else {
      out.push(ev(t + 12, 10, variant === 'rootOctave' ? root + 12 : root + 7, 0.75));
    }
  });
  return out;
}

// ---------- percussion ----------

export function bodhranPattern(tune) {
  const out = [];
  eachBar(tune, 'bodhran', ({ startTick: t }, variant) => {
    const beats = styleSpec(tune.style).beatsPerBar;
    for (let b = 0; b < beats; b++) {
      const tick = t + b * TICKS_PER_BEAT;
      if (tune.style === 'waltz') {
        if (b === 0) out.push(ev(tick, 12, undefined, 0.6, 'normal'));
        else if (variant === 'brushes') out.push(ev(tick, 12, undefined, 0.3, 'ghost'));
        continue;
      }
      const [offbeat, step] = tune.style === 'reel' ? [6, 3] : [8, 4];
      out.push(ev(tick, step, undefined, 1, 'accent'));
      if (variant === 'steady') {
        if (tune.style === 'reel') {
          out.push(ev(tick + 3, 3, undefined, 0.35, 'ghost'));
          out.push(ev(tick + 9, 3, undefined, 0.35, 'ghost'));
        } else {
          out.push(ev(tick + 4, 4, undefined, 0.4, 'ghost'));
        }
      }
      out.push(ev(tick + offbeat, step, undefined, tune.style === 'reel' ? 0.7 : 0.65, 'normal'));
    }
  });
  return sortByTick(out);
}

export function feetPattern(tune) {
  const out = [];
  eachBar(tune, 'feet', ({ startTick: t }, variant) => {
    const beats = styleSpec(tune.style).beatsPerBar;
    for (let b = 0; b < beats; b++) {
      const tick = t + b * TICKS_PER_BEAT;
      if (tune.style === 'waltz') {
        out.push(b === 0 ? ev(tick, 12, undefined, 0.8, 'heel') : ev(tick, 12, undefined, b === 1 ? 0.4 : 0.35, 'toe'));
      } else if (tune.style === 'reel') {
        out.push(ev(tick, 6, undefined, 0.9, 'heel'));
        out.push(ev(tick + 6, 3, undefined, 0.6, 'toe'));
        if (variant === 'gallop' || b === 1) out.push(ev(tick + 9, 3, undefined, 0.35, 'toe'));
      } else {
        out.push(ev(tick, variant === 'triplet' ? 4 : 8, undefined, 0.9, 'heel'));
        if (variant === 'triplet') out.push(ev(tick + 4, 4, undefined, 0.35, 'toe'));
        out.push(ev(tick + 8, 4, undefined, 0.6, 'toe'));
      }
    }
  });
  return out;
}

// The same click on every beat.
export function metronomePattern(tune) {
  const beats = loopTicks(tune.style) / TICKS_PER_BEAT;
  return Array.from({ length: beats }, (_, beat) => ev(beat * TICKS_PER_BEAT, 3, undefined, 0.85));
}

export function instructorPattern(tune) {
  const { lamps } = styleSpec(tune.style);
  const out = [];
  const beats = loopTicks(tune.style) / TICKS_PER_BEAT;
  for (let beat = 0; beat < beats; beat++) {
    const word = (beat % lamps) + 1;
    out.push({ tick: beat * TICKS_PER_BEAT, durationTicks: TICKS_PER_BEAT, word, velocity: word === 1 ? 1 : 0.8 });
  }
  return out;
}

export const PATTERNS = {
  fiddle: fiddlePattern,
  flute: flutePattern,
  piano: pianoPattern,
  guitar: guitarPattern,
  banjo: banjoPattern,
  bass: bassPattern,
  bodhran: bodhranPattern,
  feet: feetPattern,
  metronome: metronomePattern,
  instructor: instructorPattern,
};

// Every instrument's notes for one time through, sorted by tick.
export function buildArrangement(tune, patterns = PATTERNS) {
  const out = {};
  for (const [id, pattern] of Object.entries(patterns)) out[id] = sortByTick(pattern(tune));
  return out;
}
