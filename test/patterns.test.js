import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTune } from '../js/music/tune.js';
import { buildArrangement, PATTERNS } from '../js/music/patterns.js';
import { loopTicks, STYLES } from '../js/music/styles.js';

const KEYS = [{ tonic: 'D', mode: 'major' }, { tonic: 'E', mode: 'dorian' }, { tonic: 'G', mode: 'major' }];

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

test('piano: boom-chuck in reels and jigs, oom-pah-pah in waltzes', () => {
  for (const { tune, arrangement } of arrangements()) {
    for (const e of arrangement.piano) {
      const isChord = Array.isArray(e.midi);
      if (tune.style === 'waltz') {
        const pos = e.tick % 36;
        if (isChord) assert.ok(pos === 12 || pos === 24, `waltz chord at ${pos}`);
        else assert.equal(pos, 0, 'waltz bass on beat 1');
      } else {
        const pos = e.tick % 12;
        if (isChord) assert.equal(pos, tune.style === 'reel' ? 6 : 8, 'chord on the off-beat');
        else assert.equal(pos, 0, 'bass on the beat');
      }
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
