import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scheduler } from '../js/audio/scheduler.js';
import { generateTune } from '../js/music/tune.js';
import { arrangeTune, INSTRUMENT_IDS } from '../js/instruments.js';
import { barTicks, loopTicks, TICKS_PER_BEAT } from '../js/music/styles.js';

// An engine whose audio clock only moves when the test says so, and whose
// voices just record what they were asked to play.
function fakeEngine() {
  const played = [];
  const ctx = { currentTime: 0 };
  const voices = Object.fromEntries(INSTRUMENT_IDS.map((id) => [id, {
    prepared: 0,
    prepare() { this.prepared++; },
    play(ev, when) { played.push({ id, ev, when }); },
  }]));
  return { ctx, voices, played, fadeIn() {}, fadeOut() {} };
}

const bundle = (seed, style = 'reel') => {
  const tune = generateTune({ seed, style, key: { tonic: 'D', mode: 'major' } });
  return { tune, arrangement: arrangeTune(tune) };
};

// A started scheduler with only `ids` enabled. Its timer is stopped at once:
// the tests drive it by calling pump() after moving the clock.
function setup({ ids = ['metronome'], bpm = 120, style = 'reel', medley = false, nextMedley } = {}) {
  const engine = fakeEngine();
  const started = [];
  const scheduler = new Scheduler(engine, {
    onTuneStart: (tune, time) => started.push({ tune, time }),
    nextMedley,
  });
  scheduler.bpm = bpm;
  scheduler.medley = medley;
  for (const id of ids) scheduler.setEnabled(id, true);
  scheduler.load(bundle(7, style));
  scheduler.start();
  clearInterval(scheduler.timer);
  // start() has already booked the first lookahead; its first beat is tick 0.
  const t0 = scheduler.beats[0].time;
  return { engine, scheduler, started, t0 };
}

function advance({ engine, scheduler }, seconds, step = 0.025) {
  const end = engine.ctx.currentTime + seconds;
  while (engine.ctx.currentTime < end) {
    engine.ctx.currentTime = Math.min(end, engine.ctx.currentTime + step);
    scheduler.pump();
  }
}

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('notes come out in tick order, at start + tick × seconds per tick', () => {
  const s = setup({ ids: ['fiddle'] });
  const { t0 } = s;
  advance(s, 3);
  const spt = 60 / 120 / TICKS_PER_BEAT;
  const events = s.scheduler.current.byTick.flat().filter((x) => x.id === 'fiddle');
  assert.ok(s.engine.played.length > 20);
  s.engine.played.forEach((p, i) => {
    assert.equal(p.ev, events[i].ev);
    close(p.when, t0 + p.ev.tick * spt, `note ${i}`);
  });
  s.scheduler.stop();
});

test('a tune loaded while playing takes over exactly on a bar line', () => {
  const s = setup();
  advance(s, 1.3);
  const next = bundle(99);
  s.scheduler.load(next);
  advance(s, 2);
  const handover = s.started.at(-1);
  assert.equal(handover.tune, next.tune);
  const spt = 60 / 120 / TICKS_PER_BEAT;
  const bars = (handover.time - s.t0) / (barTicks('reel') * spt);
  close(bars, Math.round(bars), 'bars before handover');
  assert.ok(bars >= 1);
  s.scheduler.stop();
});

test('the medley prepares the next tune a loop early and hands over after the last repeat', () => {
  let made = 0;
  const nextMedley = () => { made++; return bundle(1000 + made); };
  const s = setup({ medley: true, bpm: 140, nextMedley });
  const spt = 60 / 140 / TICKS_PER_BEAT;
  const loop = loopTicks('reel') * spt;
  const { t0 } = s;
  const preparedBefore = s.engine.voices.metronome.prepared;

  advance(s, t0 + loop * 2 + 0.05 - s.engine.ctx.currentTime);
  assert.equal(made, 1, 'next tune built after the second loop');
  assert.equal(s.engine.voices.metronome.prepared, preparedBefore + 1, 'and its notes prepared');
  assert.equal(s.started.length, 1, 'but not playing yet');

  advance(s, loop);
  assert.equal(s.started.length, 2);
  close(s.started[1].time, t0 + loop * 3, 'handover time');
  assert.equal(made, 1, 'the prepared tune is the one used');
  s.scheduler.stop();
});

test('a disabled instrument books nothing', () => {
  const s = setup({ ids: ['metronome', 'piano'] });
  advance(s, 1);
  assert.ok(s.engine.played.some((p) => p.id === 'piano'));
  s.scheduler.setEnabled('piano', false);
  const before = s.engine.played.length;
  advance(s, 2);
  const later = s.engine.played.slice(before);
  assert.ok(later.length > 0);
  assert.ok(later.every((p) => p.id === 'metronome'));
  s.scheduler.stop();
});

test('the beats taken for the lamps match the beats booked', () => {
  const s = setup();
  advance(s, 2);
  const now = s.engine.ctx.currentTime;
  const beats = s.scheduler.takeBeats(now);
  const clicks = s.engine.played.filter((p) => p.when <= now);
  assert.equal(beats.length, clicks.length);
  beats.forEach((b, i) => {
    close(b.time, clicks[i].when, `beat ${i}`);
    assert.equal(b.lamp, i % 4);
    assert.equal(b.beatInLoop, i + 1);
  });
  assert.deepEqual(s.scheduler.takeBeats(now), [], 'taken beats are removed');
  s.scheduler.stop();
});

test('a tempo change takes effect from the next tick', () => {
  const s = setup();
  advance(s, 1);
  s.scheduler.bpm = 60;
  const before = s.engine.played.length;
  advance(s, 4);
  const after = s.engine.played.slice(before - 1);
  for (let i = 2; i < after.length; i++) close(after[i].when - after[i - 1].when, 1, `gap ${i}`);
  s.scheduler.stop();
});

test('after a stall nothing is booked in the past, and the music resumes in place', () => {
  const s = setup({ ids: ['metronome'] });
  advance(s, 1);
  s.scheduler.takeBeats(Infinity); // the lamps had already been given these
  const before = s.engine.played.length;
  s.engine.ctx.currentTime += 2; // the timer didn't run for two seconds
  s.scheduler.pump();
  const now = s.engine.ctx.currentTime;
  const later = s.engine.played.slice(before);
  assert.ok(later.length > 0);
  for (const p of later) assert.ok(p.when >= now - 0.05, `booked at ${p.when}, now ${now}`);
  // Still on the beat grid, and at the matching place in the tune.
  const spt = 60 / 120 / TICKS_PER_BEAT;
  for (const p of later) {
    const ticks = (p.when - s.t0) / spt;
    close(ticks, Math.round(ticks), 'on a tick');
    assert.equal(Math.round(ticks) % loopTicks('reel'), p.ev.tick);
  }
  assert.ok(s.scheduler.takeBeats(now).every((b) => b.time >= now - 0.05), 'no lamp backlog');
  s.scheduler.stop();
});

test('a stall longer than a loop skips whole loops, and the medley moves on once', () => {
  let made = 0;
  const nextMedley = () => { made++; return bundle(2000 + made); };
  const s = setup({ medley: true, nextMedley });
  s.engine.ctx.currentTime += 600; // ten minutes asleep
  s.scheduler.pump();
  assert.ok(made <= 1, 'at most one tune built while catching up');
  advance(s, loopTicks('reel') / TICKS_PER_BEAT * 0.5); // one more loop at 120 BPM
  assert.equal(made, 1);
  assert.equal(s.started.length, 2);
  s.scheduler.stop();
});
