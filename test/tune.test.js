import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTune, MELODY_RANGE } from '../js/music/tune.js';
import { STYLES, barTicks } from '../js/music/styles.js';
import { isChordTone, pitchClass, chordAt } from '../js/music/theory.js';
import { createRng } from '../js/music/rng.js';
import { templatesFor, parseTemplate } from '../js/music/progressions.js';

const KEYS = [
  { tonic: 'D', mode: 'major' },
  { tonic: 'G', mode: 'major' },
  { tonic: 'A', mode: 'major' },
  { tonic: 'E', mode: 'dorian' },
  { tonic: 'A', mode: 'minor' },
  { tonic: 'A', mode: 'dorian' },
  { tonic: 'D', mode: 'dorian' },
  { tonic: 'B', mode: 'minor' },
];
const STYLE_IDS = Object.keys(STYLES);
const SEEDS = Array.from({ length: 12 }, (_, i) => 1000 + i * 7919);

function* allTunes() {
  for (const style of STYLE_IDS) {
    for (const key of KEYS) {
      for (const seed of SEEDS) yield generateTune({ seed, style, key });
    }
  }
}

const isStrong = (style, tick) => (style === 'reel' ? tick % 6 === 0 : tick % 12 === 0);

test('the same seed gives the same tune; different seeds differ', () => {
  const key = { tonic: 'D', mode: 'major' };
  for (const style of STYLE_IDS) {
    const a = generateTune({ seed: 42, style, key });
    const b = generateTune({ seed: 42, style, key });
    const c = generateTune({ seed: 43, style, key });
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.parts, c.parts);
  }
});

test('each part has the right number of bars, and notes stay in range and inside their bar', () => {
  for (const tune of allTunes()) {
    const spec = STYLES[tune.style];
    for (const part of ['A', 'B']) {
      const bars = tune.parts[part];
      assert.equal(bars.length, spec.barsPerPart);
      for (const bar of bars) {
        let end = 0;
        for (const note of bar.melody) {
          assert.ok(note.midi >= MELODY_RANGE.low && note.midi <= MELODY_RANGE.high, `note ${note.midi} out of range`);
          assert.ok(note.tick >= end, 'notes do not overlap');
          end = note.tick + note.durationTicks;
        }
        assert.equal(end, barTicks(tune.style), 'bar is filled exactly');
      }
    }
  }
});

test('strong positions are chord tones', () => {
  for (const tune of allTunes()) {
    for (const part of ['A', 'B']) {
      tune.parts[part].forEach((bar, i) => {
        for (const note of bar.melody) {
          if (note.articulation === 'roll' || !isStrong(tune.style, note.tick)) continue;
          assert.ok(
            isChordTone(note.midi, tune.key, chordAt(bar.chords, note.tick)),
            `${tune.style} ${part} bar ${i + 1} tick ${note.tick}: ${note.midi} is not a chord tone`,
          );
        }
      });
    }
  }
});

test('the last bar of each part lands on the home note and holds it', () => {
  for (const tune of allTunes()) {
    const tonic = pitchClass(tune.key.tonic);
    for (const part of ['A', 'B']) {
      const last = tune.parts[part].at(-1);
      const first = last.melody[0];
      assert.equal(first.tick, 0);
      assert.equal(first.midi % 12, tonic);
      assert.ok(first.durationTicks >= 12);
      if (tune.style === 'waltz') assert.equal(first.durationTicks, 36);
    }
  }
});

test('each style uses its own note grid', () => {
  for (const tune of allTunes()) {
    const step = STYLES[tune.style].stepTicks;
    for (const part of ['A', 'B']) {
      for (const bar of tune.parts[part]) {
        for (const note of bar.melody) {
          if (note.articulation === 'roll') continue;
          if (note.durationTicks === 1) continue; // first note of a roll
          assert.equal(note.tick % step, 0, `${tune.style} note at tick ${note.tick}`);
        }
      }
    }
  }
});

test('progression templates follow the phrase plan', () => {
  for (const style of STYLE_IDS) {
    const spec = STYLES[style];
    const unit = spec.barsPerPart / 4;
    for (const mode of ['major', 'dorian']) {
      for (const part of ['A', 'B']) {
        for (const [template] of templatesFor(style, mode, part)) {
          const bars = parseTemplate(template);
          assert.equal(bars.length, spec.barsPerPart, template);
          assert.deepEqual(bars.slice(2 * unit, 3 * unit), bars.slice(0, unit), `repeat: ${template}`);
          assert.ok([5, 7].includes(bars[2 * unit - 1].at(-1)), `half cadence: ${template}`);
          assert.deepEqual(bars.at(-1), [1], `ending: ${template}`);
          if (style === 'waltz') assert.ok(bars.every((b) => b.length === 1));
        }
      }
    }
  }
});

test('random number generator is deterministic', () => {
  const a = createRng(7);
  const b = createRng(7);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});
