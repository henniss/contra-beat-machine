import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeInstrument, BACKING } from '../js/music/descriptions.js';
import { VARIANTS } from '../js/music/patterns.js';
import { INSTRUMENT_IDS } from '../js/instruments.js';
import { generateTune } from '../js/music/tune.js';
import { STYLES } from '../js/music/styles.js';

test('every rhythm variant has a description, and no description is orphaned', () => {
  for (const [id, styles] of Object.entries(VARIANTS)) {
    for (const [style, options] of Object.entries(styles)) {
      const names = options.map(([name]) => name).sort();
      assert.deepEqual(Object.keys(BACKING[id][style]).sort(), names, `${id} ${style}`);
    }
  }
});

test('every instrument gets a label and a tooltip in every style', () => {
  for (const style of Object.keys(STYLES)) {
    for (let seed = 1; seed < 40; seed++) {
      const tune = generateTune({ seed, style, key: { tonic: 'D', mode: 'major' } });
      for (const id of INSTRUMENT_IDS) {
        const { name, detail } = describeInstrument(tune, id);
        assert.ok(name && detail, `${style} ${id}`);
      }
    }
  }
});
