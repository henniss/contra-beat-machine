// A tiny state store (get, update, subscribe) plus the pure functions that
// turn one app state into the next: applying presets, switching to "Custom"
// when the user tweaks something, and making new tunes.

import { generateTune } from './music/tune.js';
import { randomSeed, createRng } from './music/rng.js';
import { DEFAULT_PRESET } from './presets.js';
import { KEY_FAMILIES } from './music/theory.js';

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    update(change) {
      const prev = state;
      state = { ...state, ...(typeof change === 'function' ? change(state) : change) };
      for (const fn of listeners) fn(state, prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const cloneMixer = (mixer) =>
  Object.fromEntries(Object.entries(mixer).map(([id, ch]) => [id, { ...ch }]));

export const makeTune = (style, key) => generateTune({ seed: randomSeed(), style, key });

export function nextKey(key, rng = createRng(randomSeed())) {
  const others = KEY_FAMILIES[key.mode].filter((tonic) => tonic !== key.tonic);
  return { tonic: rng.pick(others), mode: key.mode };
}

// The tune carries its own style and key; the state doesn't keep copies.
// `link` (from parseHash) opens a shared tune instead of the default preset.
export function initialState(link = null) {
  return {
    playing: false,
    masterVolume: 0.8,
    medley: false,
    ...(link ? applyLink(link)() : presetFields(DEFAULT_PRESET)),
  };
}

function presetFields(preset) {
  return {
    presetId: preset.id,
    bpm: preset.bpm,
    swing: preset.swing,
    mixer: cloneMixer(preset.mixer),
    tune: makeTune(preset.style, preset.key),
  };
}

export const applyPreset = (preset) => () => presetFields(preset);

// Opens a shared link: its preset's band and tempo, playing the linked tune,
// or a fresh one when the link leaves out the key or tune number.
export const applyLink = ({ preset, key, seed }) => () => ({
  ...presetFields(preset),
  tune: generateTune({ seed: seed ?? randomSeed(), style: preset.style, key: key ?? preset.key }),
});

export const withNewTune = () => ({ tune }) => ({ tune: makeTune(tune.style, nextKey(tune.key)) });

// A medley continues in the same style, moving to a new key.
export const nextMedleyTune = (tune) => makeTune(tune.style, nextKey(tune.key));

export const setBpm = (bpm) => () => ({ bpm, presetId: 'custom' });

export const setChannel = (id, patch) => (state) => ({
  mixer: { ...state.mixer, [id]: { ...state.mixer[id], ...patch } },
  presetId: 'custom',
});
