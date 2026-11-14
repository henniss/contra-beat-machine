// The tunes that the golden test pins down: every style in two keys, two
// fixed seeds each. Shared by the test and by record-golden.js.
import { generateTune } from '../js/music/tune.js';
import { buildArrangement } from '../js/music/patterns.js';

const CASES = [
  ['reel', { tonic: 'D', mode: 'major' }], ['reel', { tonic: 'E', mode: 'dorian' }],
  ['jig', { tonic: 'G', mode: 'major' }], ['jig', { tonic: 'B', mode: 'minor' }],
  ['waltz', { tonic: 'A', mode: 'major' }], ['waltz', { tonic: 'E', mode: 'minor' }],
];
const SEEDS = [1, 4000000000];

// One short line per note keeps the fixture small and its diffs readable.
const compact = (e) => [e.tick, e.durationTicks, e.midi ?? e.word ?? '', e.velocity, e.articulation ?? ''].join(' ');

export function goldenOutput() {
  const out = [];
  for (const [style, key] of CASES) {
    for (const seed of SEEDS) {
      const tune = generateTune({ seed, style, key });
      const arrangement = Object.fromEntries(
        Object.entries(buildArrangement(tune)).map(([id, events]) => [id, events.map(compact)]),
      );
      const parts = Object.fromEntries(Object.entries(tune.parts).map(([name, bars]) => [name, bars.map((bar) => ({
        chords: bar.chords.map((c) => `${c.degree}${c.quality}`).join(' '),
        melody: bar.melody.map(compact),
      }))]));
      out.push({ seed, style, key, parts, arrangement });
    }
  }
  return out;
}
