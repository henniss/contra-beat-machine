import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTune } from '../js/music/tune.js';
import { buildArrangement, PATTERNS, VARIANTS, pickVariants } from '../js/music/patterns.js';
import { loopTicks, STYLES } from '../js/music/styles.js';

const KEYS = [
  { tonic: 'D', mode: 'major' }, { tonic: 'E', mode: 'dorian' }, { tonic: 'G', mode: 'major' },
  { tonic: 'A', mode: 'major' }, { tonic: 'B', mode: 'minor' },
];

function* arrangements() {
  for (const style of Object.keys(STYLES)) {
    for (const key of KEYS) {
      for (const seed of [1, 2, 3, 99]) {
        const tune = generateTune({ seed, style, key });
        yield { tune, arrangement: buildArrangement(tune) };
      }
    }
  }
}

test('every pattern for every style stays within the loop and is sorted', () => {
  for (const { tune, arrangement } of arrangements()) {
    const length = loopTicks(tune.style);
    for (const id of Object.keys(PATTERNS)) {
      const events = arrangement[id];
      assert.ok(events.length > 0, `${id} has notes`);
      events.forEach((e, i) => {
        assert.ok(e.tick >= 0 && e.tick < length, `${tune.style} ${id} tick ${e.tick}`);
        assert.ok(e.durationTicks > 0);
        assert.ok(e.velocity > 0 && e.velocity <= 1);
        if (i > 0) assert.ok(e.tick >= events[i - 1].tick, `${id} sorted`);
      });
    }
  }
});

test('piano: bass on the beat, chords between beats (oom-pah-pah family in waltzes)', () => {
  const chordSpots = { reel: [6, 9], jig: [4, 8], waltz: [12, 18, 24, 30] };
  for (const { tune, arrangement } of arrangements()) {
    const waltz = tune.style === 'waltz';
    for (const e of arrangement.piano) {
      const low = !Array.isArray(e.midi) && e.midi < 55;
      const pos = e.tick % (waltz ? 36 : 12);
      if (low) assert.equal(pos, 0, `${tune.style} piano bass at ${pos}`);
      else assert.ok(chordSpots[tune.style].includes(pos), `${tune.style} piano chord at ${pos}`);
    }
  }
});

test('each backing instrument varies its rhythm from tune to tune', () => {
  const key = { tonic: 'D', mode: 'major' };
  for (const style of Object.keys(STYLES)) {
    for (const id of Object.keys(VARIANTS)) {
      const options = VARIANTS[id][style];
      const rhythms = new Set();
      const chosen = new Set();
      for (let seed = 0; seed < 60; seed++) {
        const tune = generateTune({ seed, style, key });
        const { A, B } = pickVariants(tune, id);
        chosen.add(A).add(B);
        assert.ok(options.some(([name]) => name === A) && options.some(([name]) => name === B));
        // When each note lands in the bar, and how it's played (single note or chord, stroke).
        const shape = PATTERNS[id](tune).map((e) => `${e.tick % (style === 'waltz' ? 36 : 24)}:${Array.isArray(e.midi) ? 'chord' : 'note'}:${e.articulation ?? ''}`);
        rhythms.add(JSON.stringify([...new Set(shape)].sort()));
      }
      assert.equal(chosen.size, options.length, `${style} ${id}: every variant gets used`);
      if (options.length > 1) assert.ok(rhythms.size > 1, `${style} ${id}: rhythm varies`);
    }
  }
});

test('drum accents land on beats', () => {
  for (const { tune, arrangement } of arrangements()) {
    const accents = arrangement.bodhran.filter((e) => e.articulation === 'accent');
    if (tune.style !== 'waltz') assert.equal(accents.length, loopTicks(tune.style) / 12);
    for (const e of accents) assert.equal(e.tick % 12, 0);
    for (const e of arrangement.feet.filter((x) => x.articulation === 'heel')) assert.equal(e.tick % 12, 0);
  }
});

test('the instructor counts every beat: 1-4 in reels and jigs, 1-3 in waltzes', () => {
  for (const { tune, arrangement } of arrangements()) {
    const counts = arrangement.instructor;
    const waltz = tune.style === 'waltz';
    assert.equal(counts.length, waltz ? 192 : 64);
    counts.forEach((e, i) => {
      assert.equal(e.tick, i * 12);
      assert.equal(e.word, (i % (waltz ? 3 : 4)) + 1);
    });
    assert.ok(!counts.some((e) => e.word === 4) || !waltz);
  }
});

test('the metronome plays the same click on every beat', () => {
  for (const { tune, arrangement } of arrangements()) {
    const clicks = arrangement.metronome;
    assert.equal(clicks.length, loopTicks(tune.style) / 12);
    clicks.forEach((e, i) => {
      assert.equal(e.tick, i * 12);
      assert.equal(e.velocity, clicks[0].velocity);
      assert.equal(e.articulation, undefined);
    });
  }
});
