// Chord progression templates, written as scale degrees, one entry per bar.
// "4-5" means two chords in one bar (one per beat; reels and jigs only).
//
// Every template follows the phrase plan the melody generator relies on:
//   - the opening phrase comes back unchanged halfway through the part
//     (bars 1–2 = bars 5–6 in 8 bars; bars 1–4 = bars 9–12 in 16 bars),
//   - the halfway bar ends on a "half cadence" chord (V, or VII in modal keys),
//   - the last bar is the home chord (I).
// Chord quality comes from the key (diatonicChord), so templates avoid degrees
// whose triad would be diminished (7 in major; 2 and 6 in dorian and minor).

import { diatonicChord } from './theory.js';

const REEL_MAJOR = {
  A: [
    ['1 1 4 5 1 1 4-5 1', 4],
    ['1 4 1 5 1 4 5 1', 3],
    ['1 1 5 5 1 1 5 1', 2],
    ['1 6 4 5 1 6 4-5 1', 2],
    ['1 4 1 1-5 1 4 5 1', 2],
  ],
  B: [
    ['4 4 1 5 4 4 5 1', 3],
    ['4 1 4 5 4 1 5 1', 3],
    ['6 6 4 5 6 6 4-5 1', 2],
    ['1 4 1 5 1 4 5-1 1', 2],
    ['5 5 1 5 5 5 4-5 1', 1],
  ],
};

const REEL_MODAL = {
  A: [
    ['1 1 7 7 1 1 7 1', 3],
    ['1 7 1 5 1 7 1-5 1', 2],
    ['1 1 4 5 1 1 7 1', 2],
    ['1 7 4 7 1 7 4-7 1', 2],
  ],
  B: [
    ['3 7 1 5 3 7 1-7 1', 2],
    ['7 7 1 5 7 7 4-5 1', 2],
    ['4 4 1 7 4 4 7 1', 2],
    ['3 3 7 7 3 3 7 1', 2],
  ],
};

const WALTZ_MAJOR = {
  A: [
    ['1 1 4 4 1 1 5 5 1 1 4 4 1 5 1 1', 3],
    ['1 4 1 5 1 4 5 5 1 4 1 5 2 5 1 1', 2],
    ['1 6 4 5 1 6 2 5 1 6 4 5 4 5 1 1', 2],
    ['1 1 5 5 5 5 1 5 1 1 5 5 4 5 1 1', 2],
  ],
  B: [
    ['4 4 1 1 4 4 5 5 4 4 1 1 2 5 1 1', 3],
    ['5 5 1 1 4 4 5 5 5 5 1 1 4 5 1 1', 2],
    ['6 6 4 4 1 1 5 5 6 6 4 4 1 5 1 1', 2],
    ['4 5 1 6 4 1 2 5 4 5 1 6 4 5 1 1', 2],
  ],
};

const WALTZ_MODAL = {
  A: [
    ['1 1 7 7 1 1 4 5 1 1 7 7 1 7 1 1', 3],
    ['1 7 1 7 1 4 7 7 1 7 1 7 4 7 1 1', 2],
    ['1 1 3 7 1 1 5 5 1 1 3 7 4 7 1 1', 2],
  ],
  B: [
    ['3 3 7 7 4 4 5 5 3 3 7 7 4 7 1 1', 3],
    ['7 7 1 1 7 7 4 5 7 7 1 1 4 7 1 1', 2],
    ['4 4 1 1 4 4 7 7 4 4 1 1 7 7 1 1', 2],
  ],
};

const LIBRARY = {
  reel: { major: REEL_MAJOR, modal: REEL_MODAL },
  jig: { major: REEL_MAJOR, modal: REEL_MODAL },
  waltz: { major: WALTZ_MAJOR, modal: WALTZ_MODAL },
};

export function parseTemplate(template) {
  return template.trim().split(/\s+/).map((bar) => bar.split('-').map(Number));
}

export function templatesFor(style, mode, part) {
  const family = mode === 'major' ? 'major' : 'modal';
  return LIBRARY[style][family][part];
}

// Returns one chord list per bar, e.g. [[{degree:1,quality:'maj'}], ...].
export function pickProgression(rng, style, key, part) {
  const template = rng.weighted(templatesFor(style, key.mode, part));
  return parseTemplate(template).map((bar) => bar.map((degree) => diatonicChord(key, degree)));
}
