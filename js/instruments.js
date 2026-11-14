// The instrument registry: ties each instrument's name, icon, synthesized
// voice, and accompaniment pattern together. `trim` balances loudness between
// voices; `reverb` is how much of the instrument goes to the shared reverb.

import { ICONS } from './icons.js';
import { PATTERNS, buildArrangement } from './music/patterns.js';
import { createFiddleVoice } from './audio/voices/fiddle.js';
import { createFluteVoice } from './audio/voices/flute.js';
import { createPianoVoice } from './audio/voices/piano.js';
import { createGuitarVoice, createBanjoVoice, createBassVoice } from './audio/voices/pluck.js';
import { createBodhranVoice, createFeetVoice, createMetronomeVoice } from './audio/voices/percussion.js';
import { createInstructorVoice } from './audio/voices/instructor.js';

const def = (id, name, createVoice, trim, reverb) => ({
  id, name, icon: ICONS[id], createVoice, pattern: PATTERNS[id], trim, reverb,
});

export const INSTRUMENTS = [
  def('fiddle', 'Fiddle', createFiddleVoice, 1, 0.3),
  def('flute', 'Flute', createFluteVoice, 0.9, 0.3),
  def('piano', 'Piano', createPianoVoice, 1, 0.2),
  def('guitar', 'Guitar', createGuitarVoice, 2, 0.15),
  def('banjo', 'Banjo', createBanjoVoice, 2.5, 0.1),
  def('bass', 'Upright bass', createBassVoice, 1.25, 0.05),
  def('bodhran', 'Bodhrán', createBodhranVoice, 2, 0.1),
  def('feet', 'Feet', createFeetVoice, 2.5, 0.05),
  def('metronome', 'Metronome', createMetronomeVoice, 3, 0),
  def('instructor', 'Instructor', createInstructorVoice, 3, 0),
];

export const INSTRUMENT_IDS = INSTRUMENTS.map((i) => i.id);

export function arrangeTune(tune) {
  return buildArrangement(tune, Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i.pattern])));
}
