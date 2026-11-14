// A tiny state store (get, update, subscribe) plus the pure functions that
// turn one app state into the next: applying presets, switching to "Custom"
// when the user tweaks something, and making new tunes.

import { generateTune } from './music/tune.js';
import { randomSeed } from './music/rng.js';
import { DEFAULT_PRESET } from './presets.js';

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

export function initialState(preset = DEFAULT_PRESET) {
  return {
    playing: false,
    masterVolume: 0.8,
    medley: true,
    ...presetFields(preset),
  };
}

function presetFields(preset) {
  return {
    presetId: preset.id,
    style: preset.style,
    key: { ...preset.key },
    bpm: preset.bpm,
    swing: preset.swing,
    mixer: cloneMixer(preset.mixer),
    tune: makeTune(preset.style, preset.key),
  };
}

export const applyPreset = (preset) => () => presetFields(preset);

export const withNewTune = () => (state) => ({ tune: makeTune(state.style, state.key) });

// A medley continues in the same style and key.
export const nextMedleyTune = (tune) => makeTune(tune.style, tune.key);

export const setBpm = (bpm) => () => ({ bpm, presetId: 'custom' });

export const setChannel = (id, patch) => (state) => ({
  mixer: { ...state.mixer, [id]: { ...state.mixer[id], ...patch } },
  presetId: 'custom',
});
