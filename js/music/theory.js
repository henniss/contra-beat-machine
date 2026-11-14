// Pitch, scale, and chord helpers. Pitches are MIDI note numbers (middle C = 60).
// A key is { tonic: 'D', mode: 'major' }; a chord is { degree: 1..7, quality }.

const NOTE_INDEX = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const mod12 = (n) => ((n % 12) + 12) % 12;

export function pitchClass(name) {
  const pc = NOTE_INDEX[name];
  if (pc === undefined) throw new Error(`Unknown note name: ${name}`);
  return pc;
}

// "D4" -> 62
export function noteToMidi(note) {
  const match = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`Bad note: ${note}`);
  return pitchClass(match[1]) + (Number(match[2]) + 1) * 12;
}

export function midiToNote(midi) {
  return SHARP_NAMES[mod12(midi)] + (Math.floor(midi / 12) - 1);
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function keyName(key) {
  const modeName = { major: 'major', dorian: 'dorian', minor: 'minor' }[key.mode];
  return `${key.tonic} ${modeName}`;
}

export function scalePitchClasses(key) {
  const tonic = pitchClass(key.tonic);
  return MODES[key.mode].map((interval) => mod12(tonic + interval));
}

export function isInScale(midi, key) {
  return scalePitchClasses(key).includes(mod12(midi));
}

// The triad built from the scale on a degree, e.g. degree 5 of D major = A major.
export function diatonicChord(key, degree) {
  const pcs = scalePitchClasses(key);
  const root = pcs[degree - 1];
  const third = pcs[(degree + 1) % 7];
  return { degree, quality: mod12(third - root) === 4 ? 'maj' : 'min' };
}

export function chordPitchClasses(key, chord) {
  const pcs = scalePitchClasses(key);
  const root = pcs[chord.degree - 1];
  return [root, mod12(root + (chord.quality === 'maj' ? 4 : 3)), mod12(root + 7)];
}

export function chordRootPc(key, chord) {
  return scalePitchClasses(key)[chord.degree - 1];
}

export function isChordTone(midi, key, chord) {
  return chordPitchClasses(key, chord).includes(mod12(midi));
}

export function chordToneMidis(key, chord, low, high) {
  const pcs = chordPitchClasses(key, chord);
  const out = [];
  for (let m = low; m <= high; m++) if (pcs.includes(mod12(m))) out.push(m);
  return out;
}

export function scaleMidis(key, low, high) {
  const pcs = scalePitchClasses(key);
  const out = [];
  for (let m = low; m <= high; m++) if (pcs.includes(mod12(m))) out.push(m);
  return out;
}

// The lowest pitch with the given pitch class at or above `low`.
export function pcAtOrAbove(pc, low) {
  return low + mod12(pc - low);
}

export function nearestChordTone(midi, key, chord, low = 0, high = 127) {
  let best = null;
  for (const m of chordToneMidis(key, chord, low, high)) {
    if (best === null || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
  }
  return best;
}

// Move `steps` scale degrees up (positive) or down. Off-scale pitches snap down first.
export function scaleStep(midi, steps, key) {
  const pcs = scalePitchClasses(key);
  let m = midi;
  while (!pcs.includes(mod12(m))) m -= 1;
  const dir = Math.sign(steps);
  for (let i = 0; i < Math.abs(steps); i++) {
    m += dir;
    while (!pcs.includes(mod12(m))) m += dir;
  }
  return m;
}

// Signed number of scale degrees from `a` to `b`.
export function scaleDistance(a, b, key) {
  const pcs = scalePitchClasses(key);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  let count = 0;
  for (let m = lo + 1; m <= hi; m++) if (pcs.includes(mod12(m))) count++;
  return b >= a ? count : -count;
}
