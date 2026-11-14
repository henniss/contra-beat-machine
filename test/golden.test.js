import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { goldenOutput } from '../scripts/golden.js';

// If this fails after a deliberate change to the music, rerun
// `node scripts/record-golden.js`. Otherwise old tune links have changed.
test('the generator still produces exactly the recorded tunes and backing', () => {
  const recorded = JSON.parse(readFileSync(new URL('./fixtures/tunes.json', import.meta.url), 'utf8'));
  const current = JSON.parse(JSON.stringify(goldenOutput()));
  assert.equal(current.length, recorded.length);
  current.forEach((entry, i) => assert.deepEqual(entry, recorded[i], `case ${i}: ${entry.style} seed ${entry.seed}`));
});
