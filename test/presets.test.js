import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, DEFAULT_PRESET } from '../js/presets.js';
import { INSTRUMENT_IDS } from '../js/instruments.js';
import { STYLES } from '../js/music/styles.js';
import { KEY_FAMILIES } from '../js/music/theory.js';

test('every preset sets every registered instrument, and nothing else', () => {
  for (const preset of PRESETS) {
    assert.deepEqual(Object.keys(preset.mixer).sort(), [...INSTRUMENT_IDS].sort(), preset.id);
    for (const ch of Object.values(preset.mixer)) {
      assert.equal(typeof ch.enabled, 'boolean');
      assert.ok(ch.volume >= 0 && ch.volume <= 1);
    }
  }
});

test('every preset has a known style and a key from its mode\'s family', () => {
  // New tunes and links only move between the keys of a family.
  for (const preset of PRESETS) {
    assert.ok(STYLES[preset.style], preset.id);
    assert.ok(KEY_FAMILIES[preset.key.mode]?.includes(preset.key.tonic), `${preset.id} key`);
    assert.ok(preset.bpm >= 70 && preset.bpm <= 140, `${preset.id} tempo inside the slider`);
  }
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length, 'ids are unique');
  assert.ok(PRESETS.includes(DEFAULT_PRESET));
});
