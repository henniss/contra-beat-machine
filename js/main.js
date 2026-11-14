// Entry point: wires the state store, the UI, the audio engine, and the
// scheduler together. Audio is created on the first Play click, because
// browsers block sound until the user interacts with the page.

import { INSTRUMENTS, arrangeTune } from './instruments.js';
import { findPreset } from './presets.js';
import { AudioEngine } from './audio/engine.js';
import { Scheduler } from './audio/scheduler.js';
import {
  createStore, initialState, applyPreset, applyLink, withNewTune, nextMedleyTune, setBpm, setChannel,
} from './state.js';
import { tuneToHash, parseHash } from './link.js';
import { initUI } from './ui.js';

const store = createStore(initialState(parseHash(location.hash)));
const engine = new AudioEngine(INSTRUMENTS);
const unavailable = new Set();
let scheduler = null;

const bundle = (tune) => ({ tune, arrangement: arrangeTune(tune) });

function syncAudio(state, prev) {
  if (!prev || state.masterVolume !== prev.masterVolume) engine.setMasterVolume(state.masterVolume);
  if (!prev || state.mixer !== prev.mixer) {
    for (const [id, ch] of Object.entries(state.mixer)) {
      if (!prev || prev.mixer[id] !== ch) engine.setChannel(id, ch);
      scheduler?.setEnabled(id, ch.enabled && !unavailable.has(id));
    }
  }
  if (scheduler) {
    scheduler.bpm = state.bpm;
    scheduler.swing = state.swing;
    scheduler.medley = state.medley;
  }
}

// Shared by every caller, so a second Play during start-up waits for the same
// start-up instead of building a second scheduler that nothing could stop.
let audioReady = null;
function ensureAudio() {
  audioReady ??= (async () => {
    await engine.start();
    scheduler = new Scheduler(engine, {
      onTuneStart: (tune) => {
        if (store.get().tune !== tune) store.update({ tune });
      },
      nextMedley: (tune) => bundle(nextMedleyTune(tune)),
    });
    syncAudio(store.get(), null);
    scheduler.load(bundle(store.get().tune));

    engine.voices.instructor?.ready?.then((ok) => {
      if (ok) return;
      unavailable.add('instructor');
      scheduler.setEnabled('instructor', false);
      ui.markUnavailable('instructor', "The counting voice couldn't load.");
    });
  })().catch((err) => {
    audioReady = null; // let the next click try again
    throw err;
  });
  return audioReady;
}

const actions = {
  async togglePlay() {
    await ensureAudio();
    if (store.get().playing) {
      scheduler.stop();
      store.update({ playing: false });
    } else {
      // Browsers can pause the audio system later (iOS after a call or the
      // lock screen); a Play click is allowed to wake it again.
      await engine.start();
      scheduler.start();
      store.update({ playing: true });
    }
  },
  newTune() {
    store.update(withNewTune());
    scheduler?.load(bundle(store.get().tune));
  },
  openLink(link) {
    store.update(applyLink(link));
    scheduler?.load(bundle(store.get().tune));
  },
  selectPreset(id) {
    const preset = findPreset(id);
    if (!preset) return;
    store.update(applyPreset(preset));
    scheduler?.load(bundle(store.get().tune));
  },
  setBpm(bpm) {
    store.update(setBpm(bpm));
  },
  setMaster(volume) {
    store.update({ masterVolume: volume });
  },
  setMedley(on) {
    store.update({ medley: on });
  },
  toggleInstrument(id) {
    if (unavailable.has(id)) return;
    store.update(setChannel(id, { enabled: !store.get().mixer[id].enabled }));
  },
  setVolume(id, volume) {
    store.update(setChannel(id, { volume }));
  },
};

const ui = initUI({
  store,
  actions,
  clock: () => (scheduler && engine.ctx
    ? {
      now: () => engine.ctx.currentTime,
      takeBeats: (now) => scheduler.takeBeats(now),
    }
    : null),
});

syncAudio(store.get(), null);
store.subscribe(syncAudio);

// Keep the address bar pointing at the tune that's playing. replaceState
// doesn't add history entries, so Back still leaves the page.
function syncAddress(state, prev) {
  if (prev && state.tune === prev.tune && state.presetId === prev.presetId) return;
  const hash = tuneToHash(state);
  if (location.hash !== hash) history.replaceState(null, '', hash);
}
syncAddress(store.get(), null);
store.subscribe(syncAddress);

// A link pasted into the address bar of an open tab.
window.addEventListener('hashchange', () => {
  const link = parseHash(location.hash);
  if (link) actions.openLink(link);
});
