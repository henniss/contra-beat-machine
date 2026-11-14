import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  noteToMidi, midiToNote, scalePitchClasses, diatonicChord, chordPitchClasses,
  nearestChordTone, scaleStep, scaleDistance, pitchClass,
} from '../js/music/theory.js';
import { barTicks, loopTicks, STYLES } from '../js/music/styles.js';

const pcs = (...names) => names.map(pitchClass);

test('note names convert to and from pitch numbers', () => {
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('D4'), 62);
  assert.equal(noteToMidi('F#5'), 78);
  assert.equal(midiToNote(69), 'A4');
});

test('scales for each key and mode', () => {
  assert.deepEqual(scalePitchClasses({ tonic: 'D', mode: 'major' }), pcs('D', 'E', 'F#', 'G', 'A', 'B', 'C#'));
  assert.deepEqual(scalePitchClasses({ tonic: 'G', mode: 'major' }), pcs('G', 'A', 'B', 'C', 'D', 'E', 'F#'));
  assert.deepEqual(scalePitchClasses({ tonic: 'A', mode: 'major' }), pcs('A', 'B', 'C#', 'D', 'E', 'F#', 'G#'));
  assert.deepEqual(scalePitchClasses({ tonic: 'E', mode: 'dorian' }), pcs('E', 'F#', 'G', 'A', 'B', 'C#', 'D'));
  assert.deepEqual(scalePitchClasses({ tonic: 'A', mode: 'minor' }), pcs('A', 'B', 'C', 'D', 'E', 'F', 'G'));
});

test('diatonic chord qualities and tones', () => {
  const D = { tonic: 'D', mode: 'major' };
  assert.deepEqual(diatonicChord(D, 1), { degree: 1, quality: 'maj' });
  assert.deepEqual(diatonicChord(D, 2), { degree: 2, quality: 'min' });
  assert.deepEqual(diatonicChord(D, 5), { degree: 5, quality: 'maj' });
  assert.deepEqual(chordPitchClasses(D, diatonicChord(D, 5)), pcs('A', 'C#', 'E'));
  assert.deepEqual(chordPitchClasses(D, diatonicChord(D, 6)), pcs('B', 'D', 'F#'));

  const Edor = { tonic: 'E', mode: 'dorian' };
  assert.deepEqual(diatonicChord(Edor, 1).quality, 'min');
  assert.deepEqual(chordPitchClasses(Edor, diatonicChord(Edor, 4)), pcs('A', 'C#', 'E'));
  assert.deepEqual(chordPitchClasses(Edor, diatonicChord(Edor, 7)), pcs('D', 'F#', 'A'));

  const G = { tonic: 'G', mode: 'major' };
  assert.deepEqual(chordPitchClasses(G, diatonicChord(G, 4)), pcs('C', 'E', 'G'));
});

test('nearest chord tone', () => {
  const D = { tonic: 'D', mode: 'major' };
  const I = diatonicChord(D, 1);
  assert.equal(nearestChordTone(noteToMidi('E4'), D, I), noteToMidi('D4'));
  assert.equal(nearestChordTone(noteToMidi('G4'), D, I), noteToMidi('F#4'));
  assert.equal(nearestChordTone(noteToMidi('B4'), D, I), noteToMidi('A4'));
  assert.equal(nearestChordTone(noteToMidi('B4'), D, I, 72, 90), noteToMidi('D5'));
});

test('scale steps and scale distance', () => {
  const G = { tonic: 'G', mode: 'major' };
  assert.equal(scaleStep(noteToMidi('G4'), 1, G), noteToMidi('A4'));
  assert.equal(scaleStep(noteToMidi('E4'), 2, G), noteToMidi('G4'));
  assert.equal(scaleStep(noteToMidi('G4'), -1, G), noteToMidi('F#4'));
  assert.equal(scaleStep(noteToMidi('F4'), 1, G), noteToMidi('F#4'), 'off-scale snaps down to E, then steps');
  assert.equal(scaleDistance(noteToMidi('G4'), noteToMidi('D5'), G), 4);
  assert.equal(scaleDistance(noteToMidi('D5'), noteToMidi('G4'), G), -4);
  assert.equal(scaleDistance(noteToMidi('A4'), noteToMidi('A4'), G), 0);
});

test('bar and loop lengths in ticks for each style', () => {
  assert.equal(barTicks('reel'), 24);
  assert.equal(loopTicks('reel'), 768);
  assert.equal(barTicks('jig'), 24);
  assert.equal(loopTicks('jig'), 768);
  assert.equal(barTicks('waltz'), 36);
  assert.equal(loopTicks('waltz'), 2304);
  assert.equal(STYLES.waltz.lamps, 3);
});
