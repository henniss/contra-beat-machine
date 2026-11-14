// Builds the controls, keeps them in step with the app state, and runs the
// screen-refresh loop that lights the beat lamps at the moment the audio clock
// reaches each beat.

import { INSTRUMENTS } from './instruments.js';
import { PRESETS } from './presets.js';
import { STYLES } from './music/styles.js';
import { keyName } from './music/theory.js';

const LAMP_FLASH_MS = 140;

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) node.append(child);
  return node;
}

// actions: togglePlay, newTune, selectPreset, setBpm, setMaster, setMedley,
//          toggleInstrument, setVolume
// clock(): null before audio starts, else { now, takeBeats(now) }
export function initUI({ store, actions, clock }) {
  const playButton = $('play');
  const bpmInput = $('bpm');
  const bpmValue = $('bpm-value');
  const bpmBand = $('bpm-band');
  const bpmBandLabel = $('bpm-band-label');
  const lamps = [...$('lamps').querySelectorAll('.lamp')];
  const partItems = [...$('parts').querySelectorAll('li')];
  const position = $('position');
  const tuneInfo = $('tune-info');

  // ---------- transport ----------

  playButton.addEventListener('click', () => actions.togglePlay());
  $('new-tune').addEventListener('click', () => actions.newTune());
  bpmInput.addEventListener('input', () => actions.setBpm(Number(bpmInput.value)));
  $('master').addEventListener('input', (e) => actions.setMaster(Number(e.target.value) / 100));
  $('medley').addEventListener('change', (e) => actions.setMedley(e.target.checked));

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    const t = e.target;
    const typing = t.closest?.('button, textarea, select, input:not([type="range"])');
    if (typing) return;
    e.preventDefault();
    actions.togglePlay();
  });

  // ---------- beat display cover ----------
  // Clicking anywhere on the beat display covers it up (for practising keeping
  // time without the lamps); clicking again uncovers it. The corner button
  // does the same from the keyboard.

  const beatDisplay = $('beat-display');
  const beatToggle = $('beat-toggle');
  const beatContent = [...beatDisplay.children].filter((child) => child !== beatToggle);
  beatDisplay.addEventListener('click', () => {
    const obscured = beatDisplay.classList.toggle('obscured');
    beatToggle.textContent = obscured ? 'Show' : 'Hide';
    beatToggle.setAttribute('aria-pressed', String(obscured));
    beatDisplay.title = obscured ? 'Click to show the beat display' : 'Click to hide the beat display';
    for (const child of beatContent) {
      if (obscured) child.setAttribute('aria-hidden', 'true');
      else child.removeAttribute('aria-hidden');
    }
  });

  // ---------- presets ----------

  const presetGrid = $('presets');
  const presetButtons = PRESETS.map((preset) => {
    const button = el('button', {
      type: 'button',
      class: 'preset',
      'aria-pressed': 'false',
      onclick: () => actions.selectPreset(preset.id),
    }, [el('strong', {}, [preset.name]), el('span', {}, [preset.description])]);
    presetGrid.append(button);
    return [preset.id, button];
  });
  const customNote = el('p', { class: 'preset-custom-note', 'aria-live': 'polite' });
  presetGrid.append(customNote);

  // ---------- instruments ----------

  const grid = $('instruments');
  const cards = {};
  for (const inst of INSTRUMENTS) {
    const toggle = el('button', {
      type: 'button',
      class: 'instrument-toggle',
      'aria-pressed': 'false',
      'aria-label': inst.name,
      html: inst.icon,
      onclick: () => actions.toggleInstrument(inst.id),
    });
    const slider = el('input', {
      type: 'range', min: '0', max: '100', step: '1',
      'aria-label': `${inst.name} volume`,
      oninput: (e) => actions.setVolume(inst.id, Number(e.target.value) / 100),
    });
    const note = el('p', { class: 'instrument-note', hidden: '' });
    const card = el('div', { class: 'instrument' }, [toggle, el('span', { class: 'instrument-name' }, [inst.name]), slider, note]);
    grid.append(card);
    cards[inst.id] = { card, toggle, slider, note };
  }

  // ---------- state -> controls ----------

  function setLampCount(count) {
    lamps.forEach((lamp, i) => {
      const disabled = i >= count;
      lamp.classList.toggle('disabled', disabled);
      if (disabled) {
        lamp.classList.remove('lit');
        lamp.setAttribute('aria-hidden', 'true');
      } else {
        lamp.removeAttribute('aria-hidden');
      }
    });
  }

  function setBand(style) {
    const [lo, hi] = STYLES[style].typicalBpm;
    const min = Number(bpmInput.min);
    const span = Number(bpmInput.max) - min;
    bpmBand.style.left = `${((lo - min) / span) * 100}%`;
    bpmBand.style.width = `${((hi - lo) / span) * 100}%`;
    bpmBandLabel.textContent = `typical for a ${STYLES[style].name.toLowerCase()}: ${lo}–${hi}`;
  }

  function idlePosition(state) {
    partItems.forEach((li) => { li.classList.remove('current'); li.removeAttribute('aria-current'); });
    position.textContent = state.style === 'waltz'
      ? `bar – / ${STYLES.waltz.barsPerPart}`
      : `beat – / ${STYLES[state.style].barsPerPart * STYLES[state.style].beatsPerBar * 4}`;
    lamps.forEach((l) => l.classList.remove('lit'));
    setLampCount(STYLES[state.style].lamps);
  }

  function render(state, prev) {
    if (!prev || state.playing !== prev.playing) {
      playButton.setAttribute('aria-pressed', String(state.playing));
      playButton.querySelector('.play-label').textContent = state.playing ? 'Stop' : 'Play';
      if (!state.playing) idlePosition(state);
    }
    if (!prev || state.bpm !== prev.bpm) {
      bpmInput.value = state.bpm;
      bpmValue.textContent = state.bpm;
    }
    if (!prev || state.style !== prev.style) {
      setBand(state.style);
      if (!state.playing) idlePosition(state);
    }
    if (!prev || state.presetId !== prev.presetId) {
      for (const [id, button] of presetButtons) button.setAttribute('aria-pressed', String(id === state.presetId));
      customNote.textContent = state.presetId === 'custom' ? 'Custom: you changed the tempo or instruments.' : '';
    }
    if (!prev || state.mixer !== prev.mixer) {
      for (const inst of INSTRUMENTS) {
        const { card, toggle, slider } = cards[inst.id];
        const ch = state.mixer[inst.id];
        toggle.setAttribute('aria-pressed', String(ch.enabled));
        card.classList.toggle('on', ch.enabled);
        slider.value = Math.round(ch.volume * 100);
      }
    }
    if (!prev || state.tune !== prev.tune) {
      tuneInfo.textContent = `${STYLES[state.tune.style].name} in ${keyName(state.tune.key)} · tune #${state.tune.seed.toString(36)}`;
    }
    if (!prev || state.medley !== prev.medley) $('medley').checked = state.medley;
    if (!prev || state.masterVolume !== prev.masterVolume) $('master').value = Math.round(state.masterVolume * 100);
  }

  render(store.get(), null);
  store.subscribe(render);

  // ---------- beat lamps ----------

  let litUntil = 0;

  function showBeat(beat) {
    setLampCount(beat.lamps);
    lamps.forEach((lamp, i) => lamp.classList.toggle('lit', i === beat.lamp));
    litUntil = performance.now() + LAMP_FLASH_MS;
    partItems.forEach((li, i) => {
      const current = i === beat.partIndex;
      li.classList.toggle('current', current);
      if (current) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    position.textContent = beat.style === 'waltz'
      ? `bar ${beat.barInPart} / ${beat.barsPerPart}`
      : `beat ${beat.beatInLoop} / ${beat.loopBeats}`;
  }

  function frame() {
    const c = clock();
    if (c && store.get().playing) {
      const beats = c.takeBeats(c.now());
      if (beats.length) showBeat(beats[beats.length - 1]);
    }
    if (litUntil && performance.now() > litUntil) {
      lamps.forEach((l) => l.classList.remove('lit'));
      litUntil = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    markUnavailable(id, message) {
      const { card, toggle, note } = cards[id];
      card.classList.add('unavailable');
      toggle.setAttribute('aria-disabled', 'true');
      note.textContent = message;
      note.hidden = false;
    },
  };
}
