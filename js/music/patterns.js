// Accompaniment: one function per instrument that turns a tune into every note
// that instrument plays during one time through (A, A, B, B), with ticks
// counted from the start of the loop. Each style gets its own feel:
// boom-chuck and strums for reels and jigs, oom-pah-pah for waltzes.

import { styleSpec, barTicks, PART_ORDER, TICKS_PER_BEAT, loopTicks } from './styles.js';
import {
  chordToneMidis, chordRootPc, pcAtOrAbove, scaleStep, pitchClass,
} from './theory.js';
import { createRng } from './rng.js';

// The tune in playing order: [{ bar, part, partIndex, barInPart, startTick }].
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
  return out;
}

function chordAt(bar, tick) {
  return bar.chords.length === 1
    ? bar.chords[0]
    : bar.chords[Math.min(bar.chords.length - 1, Math.floor(tick / TICKS_PER_BEAT))];
}

const sameChord = (a, b) => a.degree === b.degree && a.quality === b.quality;
const sortByTick = (events) => events.sort((a, b) => a.tick - b.tick);
const rootAtOrAbove = (key, chord, low) => pcAtOrAbove(chordRootPc(key, chord), low);
const closeVoicing = (key, chord, low) => chordToneMidis(key, chord, low, low + 11).slice(0, 3);

const ev = (tick, durationTicks, midi, velocity, articulation) => ({
  tick, durationTicks, velocity,
  ...(midi !== undefined ? { midi } : {}),
  ...(articulation ? { articulation } : {}),
});

// Calls fn(beatTick, beatInBar, entry) for every beat of the loop.
function eachBeat(tune, fn) {
  const spec = styleSpec(tune.style);
  for (const entry of expandTune(tune)) {
    for (let b = 0; b < spec.beatsPerBar; b++) fn(entry.startTick + b * TICKS_PER_BEAT, b, entry);
  }
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
  if (tune.style === 'waltz') {
    for (const { bar, startTick } of expandTune(tune)) {
      const chord = bar.chords[0];
      out.push(ev(startTick, 10, rootAtOrAbove(key, chord, 43), 0.8));
      const voicing = closeVoicing(key, chord, 55);
      out.push(ev(startTick + 12, 8, voicing, 0.5));
      out.push(ev(startTick + 24, 8, voicing, 0.45));
    }
    return out;
  }
  const chuckOffset = tune.style === 'reel' ? 6 : 8;
  eachBeat(tune, (tick, b, { bar }) => {
    const chord = chordAt(bar, b * TICKS_PER_BEAT);
    const root = rootAtOrAbove(key, chord, 43);
    const useFifth = b === 1 && sameChord(chord, chordAt(bar, 0));
    const fifth = root + 7 > 55 ? root - 5 : root + 7;
    out.push(ev(tick, 5, useFifth ? fifth : root, b === 0 ? 0.9 : 0.8));
    out.push(ev(tick + chuckOffset, 4, closeVoicing(key, chord, 55), 0.6));
  });
  return out;
}

function guitarVoicing(key, chord) {
  return chordToneMidis(key, chord, 50, 66);
}

export function guitarPattern(tune) {
  const { key } = tune;
  const out = [];
  if (tune.style === 'waltz') {
    for (const { bar, startTick } of expandTune(tune)) {
      const chord = bar.chords[0];
      out.push(ev(startTick, 10, rootAtOrAbove(key, chord, 40), 0.7));
      const strum = guitarVoicing(key, chord).slice(-4);
      out.push(ev(startTick + 12, 8, strum, 0.45, 'down'));
      out.push(ev(startTick + 24, 8, strum, 0.4, 'down'));
    }
    return out;
  }
  eachBeat(tune, (tick, b, { bar }) => {
    const voicing = guitarVoicing(key, chordAt(bar, b * TICKS_PER_BEAT));
    const top = voicing.slice(-3);
    if (tune.style === 'reel') {
      out.push(ev(tick, 6, voicing, 0.75, 'down'));
      out.push(ev(tick + 6, 5, top, 0.5, 'up'));
    } else {
      out.push(ev(tick, 4, voicing, 0.75, 'down'));
      out.push(ev(tick + 4, 4, top, 0.45, 'up'));
      out.push(ev(tick + 8, 4, voicing, 0.6, 'down'));
    }
  });
  return out;
}

export function banjoPattern(tune) {
  const { key } = tune;
  const out = [];
  const drone = pcAtOrAbove(pitchClass(key.tonic), 67);
  if (tune.style === 'waltz') {
    const order = [0, 1, 2, 3, 2, 1];
    for (const { bar, startTick } of expandTune(tune)) {
      const tones = chordToneMidis(key, bar.chords[0], 60, 76);
      order.forEach((idx, i) => out.push(ev(startTick + i * 6, 6, tones[idx % tones.length], 0.45)));
    }
    return out;
  }
  // Old-time "bum-ditty": a note, a brush across the strings, the thumb drone.
  const [brushAt, thumbAt, len] = tune.style === 'reel' ? [6, 9, 3] : [4, 8, 4];
  let beatIndex = 0;
  eachBeat(tune, (tick, b, { bar }) => {
    const chord = chordAt(bar, b * TICKS_PER_BEAT);
    const tones = chordToneMidis(key, chord, 60, 72);
    out.push(ev(tick, brushAt, tones[beatIndex % tones.length], 0.75));
    out.push(ev(tick + brushAt, len, chordToneMidis(key, chord, 62, 74).slice(-3), 0.5, 'down'));
    out.push(ev(tick + thumbAt, len, drone, 0.45));
    beatIndex++;
  });
  return out;
}

export function bassPattern(tune) {
  const { key } = tune;
  const rng = createRng((tune.seed ^ 0x9e3779b9) >>> 0);
  const entries = expandTune(tune);
  const out = [];
  const bassRoot = (chord) => rootAtOrAbove(key, chord, 36);

  if (tune.style === 'waltz') {
    let prevChord = null;
    let usedFifth = false;
    for (const { bar, startTick } of entries) {
      const chord = bar.chords[0];
      const root = bassRoot(chord);
      usedFifth = prevChord && sameChord(prevChord, chord) ? !usedFifth : false;
      out.push(ev(startTick, 33, usedFifth ? root + 7 : root, 0.8));
      prevChord = chord;
    }
    return out;
  }

  entries.forEach(({ bar, startTick }, i) => {
    const first = bar.chords[0];
    const root = bassRoot(first);
    out.push(ev(startTick, 10, root, 0.9));
    if (bar.chords.length > 1) {
      out.push(ev(startTick + 12, 10, bassRoot(bar.chords[1]), 0.75));
      return;
    }
    const nextChord = entries[(i + 1) % entries.length].bar.chords[0];
    if (!sameChord(nextChord, first) && rng.chance(0.3)) {
      // Walk up into the next chord: two scale steps leading to its root.
      const target = bassRoot(nextChord);
      const [second, third] = tune.style === 'reel' ? [[12, 5], [18, 5]] : [[12, 7], [20, 4]];
      out.push(ev(startTick + second[0], second[1], scaleStep(target, -2, key), 0.75));
      out.push(ev(startTick + third[0], third[1], scaleStep(target, -1, key), 0.75));
    } else {
      out.push(ev(startTick + 12, 10, root + 7, 0.75));
    }
  });
  return out;
}

// ---------- percussion ----------

export function bodhranPattern(tune) {
  const out = [];
  eachBeat(tune, (tick, b) => {
    if (tune.style === 'reel') {
      out.push(ev(tick, 3, undefined, 1, 'accent'));
      out.push(ev(tick + 3, 3, undefined, 0.35, 'ghost'));
      out.push(ev(tick + 6, 3, undefined, 0.7, 'normal'));
      out.push(ev(tick + 9, 3, undefined, 0.35, 'ghost'));
    } else if (tune.style === 'jig') {
      out.push(ev(tick, 4, undefined, 1, 'accent'));
      out.push(ev(tick + 4, 4, undefined, 0.4, 'ghost'));
      out.push(ev(tick + 8, 4, undefined, 0.65, 'normal'));
    } else {
      out.push(b === 0 ? ev(tick, 12, undefined, 0.6, 'normal') : ev(tick, 12, undefined, 0.3, 'ghost'));
    }
  });
  return out;
}

export function feetPattern(tune) {
  const out = [];
  eachBeat(tune, (tick, b) => {
    if (tune.style === 'reel') {
      out.push(ev(tick, 6, undefined, 0.9, 'heel'));
      out.push(ev(tick + 6, 3, undefined, 0.6, 'toe'));
      if (b === 1) out.push(ev(tick + 9, 3, undefined, 0.35, 'toe'));
    } else if (tune.style === 'jig') {
      out.push(ev(tick, 8, undefined, 0.9, 'heel'));
      out.push(ev(tick + 8, 4, undefined, 0.6, 'toe'));
    } else {
      out.push(b === 0 ? ev(tick, 12, undefined, 0.8, 'heel') : ev(tick, 12, undefined, b === 1 ? 0.4 : 0.35, 'toe'));
    }
  });
  return out;
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
  instructor: instructorPattern,
};

// Every instrument's notes for one time through, sorted by tick.
export function buildArrangement(tune, patterns = PATTERNS) {
  const out = {};
  for (const [id, pattern] of Object.entries(patterns)) out[id] = sortByTick(pattern(tune));
  return out;
}
