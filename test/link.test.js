import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tuneToHash, parseHash } from '../js/link.js';
import { applyLink, applyPreset, withNewTune } from '../js/state.js';
import { findPreset } from '../js/presets.js';

test('a link reopens exactly the same tune', () => {
  for (const presetId of ['new-england-reel', 'celtic-jig', 'last-waltz']) {
    const state = applyPreset(findPreset(presetId))();
    const { tune } = { ...state, ...withNewTune()(state) };
    const hash = tuneToHash({ presetId, tune });
    const link = parseHash(hash);
    assert.equal(link.preset.id, presetId);
    assert.deepEqual(applyLink(link)().tune, tune);
  }
});

test('the link names the preset, or just the style once the band is customised', () => {
  const { tune } = applyPreset(findPreset('old-time-breakdown'))();
  assert.match(tuneToHash({ presetId: 'old-time-breakdown', tune }), /^#old-time-breakdown\/A-major\/[0-9a-z]+$/);
  assert.match(tuneToHash({ presetId: 'custom', tune }), /^#reel\/A-major\//);
  assert.equal(parseHash('#reel/A-major/1x2k9f').preset.style, 'reel');
  assert.equal(parseHash('#waltz/G-major/0').seed, 0);
});

test('anything that is not a tune link is ignored', () => {
  for (const hash of ['', '#', '#polka', '#reel/', '#reel/D-major/', '#polka/D-major/abc', '#reel/C-major/abc',
    '#reel/D-lydian/abc', '#reel/D-major/ABC', '#reel/D-major/zzzzzzz', '#reel/D-major/abc/extra', '#%E0%A4%A']) {
    assert.equal(parseHash(hash), null, hash);
  }
});

test('short links open the preset with a fresh tune', () => {
  const jig = parseHash('#celtic-jig');
  assert.equal(jig.preset.id, 'celtic-jig');
  assert.equal(jig.key, null);
  assert.equal(jig.seed, null);
  assert.deepEqual(applyLink(jig)().tune.key, findPreset('celtic-jig').key);

  const keyed = parseHash('#celtic-jig/A-dorian');
  assert.deepEqual(keyed.key, { tonic: 'A', mode: 'dorian' });
  assert.equal(keyed.seed, null);
  const opened = applyLink(keyed)();
  assert.deepEqual(opened.tune.key, { tonic: 'A', mode: 'dorian' });
  assert.equal(opened.tune.style, 'jig');

  assert.equal(parseHash('#waltz').preset.style, 'waltz');
});
