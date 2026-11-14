import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextKey, KEY_FAMILIES, nextMedleyTune, makeTune, withNewTune, initialState } from '../js/state.js';

test('a new tune moves to a different key of the same kind', () => {
  for (const [mode, tonics] of Object.entries(KEY_FAMILIES)) {
    for (const tonic of tonics) {
      for (let i = 0; i < 20; i++) {
        const next = nextKey({ tonic, mode });
        assert.equal(next.mode, mode);
        assert.notEqual(next.tonic, tonic);
        assert.ok(tonics.includes(next.tonic));
      }
    }
  }
});

test('New tune and medley both change the key, keeping the style', () => {
  const state = initialState();
  const change = withNewTune()(state);
  assert.notEqual(change.tune.key.tonic, state.tune.key.tonic);
  assert.deepEqual(change.key, change.tune.key);
  assert.equal(change.tune.style, state.style);

  const waltz = makeTune('waltz', { tonic: 'D', mode: 'major' });
  const next = nextMedleyTune(waltz);
  assert.equal(next.style, 'waltz');
  assert.notEqual(next.key.tonic, 'D');
});
