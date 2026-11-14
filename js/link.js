// Shareable links. The part of the address after "#" names the tune, so a
// link plays the same tune again: "#old-time-breakdown/A-major/1x2k9f".
// The first piece is a preset, or just a style ("reel") once the instruments
// or tempo have been changed. The last piece is the "tune #" shown on the page.
//
// The key and tune number are optional: "#celtic-jig" or "#celtic-jig/A-dorian"
// open that preset with a fresh random tune.

import { PRESETS, findPreset } from './presets.js';
import { STYLES } from './music/styles.js';
import { KEY_FAMILIES } from './music/theory.js';

const MAX_SEED = 0xffffffff;

export function tuneToHash({ presetId, tune }) {
  const first = presetId !== 'custom' && findPreset(presetId)?.style === tune.style ? presetId : tune.style;
  return `#${first}/${tune.key.tonic}-${tune.key.mode}/${tune.seed.toString(36)}`;
}

// Returns { preset, key, seed } (key and seed may be null), or null if the
// hash isn't a tune link.
export function parseHash(hash) {
  const pieces = hash.replace(/^#/, '').split('/');
  if (pieces.length > 3) return null;
  const [first, keyText, seedText] = pieces;

  const preset = findPreset(first) ?? (STYLES[first] && PRESETS.find((p) => p.style === first));
  if (!preset) return null;

  let key = null;
  if (keyText !== undefined) {
    const [tonic, mode] = keyText.split('-');
    if (!KEY_FAMILIES[mode]?.includes(tonic)) return null;
    key = { tonic, mode };
  }

  let seed = null;
  if (seedText !== undefined) {
    if (!/^[0-9a-z]{1,7}$/.test(seedText)) return null;
    seed = parseInt(seedText, 36);
    if (seed > MAX_SEED) return null;
  }

  return { preset, key, seed };
}
