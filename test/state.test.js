import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPreset } from '../js/presets.js';
import { KEY_FAMILIES } from '../js/music/theory.js';
import { nextKey, nextMedleyTune, makeTune, withNewTune, initialState } from '../js/state.js';

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
  assert.deepEqual(Object.keys(change), ['tune']);
  assert.equal(change.tune.style, state.tune.style);

  const waltz = makeTune('waltz', { tonic: 'D', mode: 'major' });
  const next = nextMedleyTune(waltz);
  assert.equal(next.style, 'waltz');
  assert.notEqual(next.key.tonic, 'D');
});

test('the starting state opens a link when there is one', () => {
  const plain = initialState();
  assert.equal(plain.presetId, 'new-england-reel');
  const linked = initialState({ preset: findPreset('last-waltz'), key: { tonic: 'G', mode: 'major' }, seed: 42 });
  assert.equal(linked.presetId, 'last-waltz');
  assert.equal(linked.tune.seed, 42);
  assert.deepEqual(linked.tune.key, { tonic: 'G', mode: 'major' });
  assert.equal(linked.tune.style, 'waltz');
  assert.ok(!('key' in linked) && !('style' in linked), 'the tune is the only copy of key and style');
});
