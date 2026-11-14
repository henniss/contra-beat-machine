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

const def = (id, name, role, createVoice, trim, reverb) => ({
  id, name, role, icon: ICONS[id], createVoice, pattern: PATTERNS[id], trim, reverb,
});

export const INSTRUMENTS = [
  def('fiddle', 'Fiddle', 'melody', createFiddleVoice, 1, 0.3),
  def('flute', 'Flute', 'melody', createFluteVoice, 0.9, 0.3),
  def('piano', 'Piano', 'rhythm', createPianoVoice, 1, 0.2),
  def('guitar', 'Guitar', 'rhythm', createGuitarVoice, 2, 0.15),
  def('banjo', 'Banjo', 'rhythm', createBanjoVoice, 2.5, 0.1),
  def('bass', 'Upright bass', 'bass', createBassVoice, 1.25, 0.05),
  def('bodhran', 'Bodhrán', 'percussion', createBodhranVoice, 0.6, 0.1),
  def('feet', 'Feet', 'percussion', createFeetVoice, 0.75, 0.05),
  def('metronome', 'Metronome', 'count', createMetronomeVoice, 0.8, 0),
  def('instructor', 'Instructor', 'count', createInstructorVoice, 1, 0),
];

export const INSTRUMENT_IDS = INSTRUMENTS.map((i) => i.id);

export function arrangeTune(tune) {
  return buildArrangement(tune, Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i.pattern])));
}
