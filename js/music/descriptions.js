// Plain-language descriptions of what each instrument is playing in the
// current tune, shown under its name on the instrument card. The short `name`
// is the visible label; `detail` is the longer explanation in the tooltip.

import { pickVariants } from './patterns.js';
import { styleSpec } from './styles.js';

const MELODY = {
  reel: {
    name: '4 notes per beat',
    detail: 'Reel: mostly four quick, even notes per step, with an occasional longer note or a roll (a quick three-note flourish).',
  },
  jig: {
    name: '3 notes per beat',
    detail: 'Jig: three notes per step, sometimes a long-short "dum-da" pair. That gives the jig its bounce.',
  },
  waltz: {
    name: '1–2 notes per beat',
    detail: 'Waltz: a slow, singing line of one or two notes per beat, with longer held notes.',
  },
};

// [name, detail] for every variant in VARIANTS, per instrument and style.
export const BACKING = {
  piano: {
    reel: {
      boomChuck: ['Boom-chuck', 'A low note on each beat ("boom"), then a short chord halfway to the next beat ("chuck").'],
      boomChuckA: ['Boom-chuck with a push', 'Boom-chuck, plus a soft extra chord just before each new bar that pushes the music forward.'],
      walking: ['Walking boom-chuck', 'Boom-chuck, but before a chord change the low note steps toward the next chord.'],
    },
    jig: {
      boomChuck: ['Boom-chuck', 'A low note on each beat, then a short chord on the last third of the beat.'],
      boomChickChick: ['Boom-chick-chick', 'A low note on each beat, then two short chords, filling out the jig\'s three-part beat.'],
      walking: ['Walking boom-chuck', 'Boom-chuck, but before a chord change the low note steps toward the next chord.'],
    },
    waltz: {
      oomPahPah: ['Oom-pah-pah', 'A low note on beat 1, then soft chords on beats 2 and 3.'],
      rolled: ['Rippled chords', 'A low note on beat 1, then the chord\'s notes played one at a time.'],
      held: ['Held chord', 'A low note on beat 1, then a chord held through beats 2 and 3.'],
    },
  },
  guitar: {
    reel: {
      downUp: ['Down-up strum', 'Strums down on each beat and up halfway between.'],
      boomChuck: ['Boom-chuck', 'A low string on each beat, then a strum halfway to the next beat.'],
      sixteenths: ['Busy strum', 'Down-up-down-up: four strums per beat, following the fiddle\'s four notes.'],
    },
    jig: {
      downUpDown: ['Down-up-down strum', 'Three strums per beat, following the jig\'s three notes.'],
      boomChuck: ['Boom-chuck', 'A low string on each beat, then a strum on the last third of the beat.'],
    },
    waltz: {
      bassStrumStrum: ['Bass-strum-strum', 'A low string on beat 1, then light strums on beats 2 and 3.'],
      picked: ['Picked', 'A low string on beat 1, then the chord\'s notes picked one at a time.'],
      strumAll: ['Strum every beat', 'A full strum on beat 1, then lighter strums on beats 2 and 3.'],
    },
  },
  banjo: {
    reel: {
      bumDitty: ['Bum-ditty', 'Old-time style: a note on the beat, a brush across the strings, then the high "thumb" string.'],
      roll: ['Forward roll', 'Single notes rolling across the strings, four per beat, including the high thumb string.'],
    },
    jig: {
      bumDitty: ['Bum-ditty', 'Old-time style: a note on the beat, a brush across the strings, then the high "thumb" string.'],
      roll: ['Forward roll', 'Single notes rolling across the strings, three per beat, including the high thumb string.'],
    },
    waltz: {
      arpeggio: ['Rolling arpeggio', 'The chord\'s notes up and down, two per beat.'],
      slowRoll: ['Slow roll', 'One chord note per beat, with the high thumb string at the end of the bar.'],
    },
  },
  bass: {
    reel: {
      rootFifth: ['Root and fifth', 'The chord\'s main note on beat 1 and its fifth on beat 2. Sometimes walks up into a chord change.'],
      walking: ['Walking', 'The chord\'s main note, then usually two steps walking up into each chord change.'],
      rootOctave: ['Root and octave', 'The chord\'s main note, then the same note an octave higher.'],
    },
    jig: {
      rootFifth: ['Root and fifth', 'The chord\'s main note on beat 1 and its fifth on beat 2. Sometimes walks up into a chord change.'],
      walking: ['Walking', 'The chord\'s main note, then usually two steps walking up into each chord change.'],
      rootOctave: ['Root and octave', 'The chord\'s main note, then the same note an octave higher.'],
    },
    waltz: {
      long: ['One long note', 'One note per bar, switching between the chord\'s main note and its fifth when a chord repeats.'],
      twoPerBar: ['Two per bar', 'The chord\'s main note on beat 1 and its fifth on beat 3.'],
      walking: ['Walking', 'The chord\'s main note on beat 1, then on beat 3 a step toward the next chord when it changes (otherwise the fifth).'],
    },
  },
  bodhran: {
    reel: {
      steady: ['Steady', 'An accent on each beat, a stroke halfway, and light strokes filling the gaps.'],
      sparse: ['Sparse', 'An accent on each beat and a stroke halfway, nothing in between.'],
    },
    jig: {
      steady: ['Steady', 'An accent on each beat, then two lighter strokes, following the jig\'s three notes.'],
      sparse: ['Sparse', 'An accent on each beat and a stroke on its last third.'],
    },
    waltz: {
      brushes: ['Stroke and brushes', 'A soft stroke on beat 1, light brushes on beats 2 and 3.'],
      pulse: ['Pulse', 'A soft stroke on beat 1 only.'],
    },
  },
  feet: {
    reel: {
      heelToe: ['Heel-toe', 'A heel stomp on each beat and a toe tap halfway, with an extra tap at the end of each bar.'],
      gallop: ['Gallop', 'Heel-toe-toe on every beat.'],
    },
    jig: {
      heelToe: ['Heel-toe', 'A heel stomp on each beat and a toe tap on its last third.'],
      triplet: ['Triplet', 'Heel-toe-toe: three taps per beat, following the jig\'s three notes.'],
    },
    waltz: {
      heelToeToe: ['Heel-toe-toe', 'A heel stomp on beat 1, toe taps on beats 2 and 3.'],
    },
  },
};

function melody(tune, id) {
  const { name, detail } = MELODY[tune.style];
  if (id === 'fiddle') return { name, detail: `${detail} The fiddle plays the tune.` };
  const octave = tune.style === 'waltz'
    ? 'The flute plays the same tune an octave higher (the same notes, higher up).'
    : 'The flute plays the same tune: an octave higher in the A part, at the fiddle\'s pitch in the B part.';
  return { name, detail: `${detail} ${octave}` };
}

// { name, detail } for one instrument in this tune.
export function describeInstrument(tune, id) {
  if (id === 'fiddle' || id === 'flute') return melody(tune, id);
  if (id === 'metronome') return { name: 'Click every beat', detail: 'The same click on every beat (every dancer step).' };
  if (id === 'instructor') {
    const n = styleSpec(tune.style).lamps;
    return { name: `Counts 1–${n}`, detail: `Says "one" to "${n === 3 ? 'three' : 'four'}" on each beat, matching the lamps.` };
  }

  const table = BACKING[id][tune.style];
  const { A, B } = pickVariants(tune, id);
  const [nameA, detailA] = table[A];
  if (A === B) return { name: nameA, detail: detailA };
  const [nameB, detailB] = table[B];
  return {
    name: `A: ${nameA} · B: ${nameB}`,
    detail: `A part: ${nameA}. ${detailA}\nB part: ${nameB}. ${detailB}`,
  };
}
