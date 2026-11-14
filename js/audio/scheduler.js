// Lookahead scheduler ("a tale of two clocks"): a coarse timer wakes every
// 25 ms and books every note due in the next 100 ms on the sample-accurate
// audio clock. Time advances one tick (1/12 beat) at a time at the current BPM,
// so tempo changes take effect immediately without re-timing anything.
//
// It also records when each beat will sound, so the UI can light the lamps in
// step with what you hear rather than with when notes were booked.

import {
  styleSpec, barTicks, partTicks, loopTicks, loopBeats, TICKS_PER_BEAT,
} from '../music/styles.js';

const WAKE_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;
const START_DELAY_SECONDS = 0.08;
const MAX_QUEUE = 256;
// A tick more overdue than this is skipped rather than played: after a stall
// (laptop asleep, tab frozen) the backlog would otherwise sound all at once.
const MAX_LATE_SECONDS = 0.05;

function indexByTick(arrangement, length) {
  const byTick = Array.from({ length }, () => []);
  for (const [id, events] of Object.entries(arrangement)) {
    for (const ev of events) byTick[ev.tick].push({ id, ev });
  }
  return byTick;
}

export class Scheduler {
  // bundle: { tune, arrangement }. nextMedley(tune) returns the next bundle.
  constructor(engine, { onTuneStart, nextMedley } = {}) {
    this.engine = engine;
    this.onTuneStart = onTuneStart;
    this.nextMedley = nextMedley;
    // bpm, swing and medley are set by main.js from the app state.
    this.bpm = 116;
    this.swing = 0;
    this.medley = false;
    this.enabled = {};
    this.running = false;
    this.timer = null;
    this.current = null;
    this.pending = null;
    this.prepared = null;
    this.beats = [];
  }

  // Plays `bundle` now if stopped, or from the next bar line if playing.
  load(bundle) {
    this.prepare(bundle);
    if (this.running && this.current) this.pending = bundle;
    else this.install(bundle, null);
  }

  // Let voices pre-render the notes this tune uses (see voices/prerender.js),
  // in the background and well before they're needed.
  prepare(bundle) {
    const secondsPerTick = 60 / this.bpm / TICKS_PER_BEAT;
    for (const [id, events] of Object.entries(bundle.arrangement)) {
      this.engine.voices[id]?.prepare?.(events, secondsPerTick);
    }
  }

  install(bundle, time) {
    const { tune, arrangement } = bundle;
    const spec = styleSpec(tune.style);
    this.current = {
      tune,
      spec,
      barTicks: barTicks(tune.style),
      partTicks: partTicks(tune.style),
      loopTicks: loopTicks(tune.style),
      byTick: indexByTick(arrangement, loopTicks(tune.style)),
    };
    this.tick = 0;
    this.loopCount = 0;
    this.prepared = null;
    this.onTuneStart?.(tune, time);
  }

  setEnabled(id, on) {
    this.enabled[id] = on;
  }

  start() {
    if (this.running || !this.current) return;
    if (this.pending) {
      this.install(this.pending, null);
      this.pending = null;
    }
    this.running = true;
    this.tick = 0;
    this.loopCount = 0;
    this.nextTime = this.engine.ctx.currentTime + START_DELAY_SECONDS;
    this.engine.fadeIn();
    this.pump();
    this.timer = setInterval(() => this.pump(), WAKE_MS);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
    this.engine.fadeOut();
    this.beats = [];
    if (this.pending) {
      this.install(this.pending, null);
      this.pending = null;
    }
  }

  pump() {
    const now = this.engine.ctx.currentTime;
    this.skipWholeLoops(now);
    while (this.running && this.nextTime < now - MAX_LATE_SECONDS) this.processTick({ silent: true });
    const horizon = now + LOOKAHEAD_SECONDS;
    while (this.running && this.nextTime < horizon) this.processTick({ silent: false });
  }

  // After a long stall, jump over whole loops at once, so catching up doesn't
  // build (and pre-render) a medley tune for every loop nobody heard.
  skipWholeLoops(now) {
    const loopSeconds = this.current.loopTicks * 60 / this.bpm / TICKS_PER_BEAT;
    const loops = Math.floor((now - MAX_LATE_SECONDS - this.nextTime) / loopSeconds);
    if (loops < 1) return;
    this.nextTime += loops * loopSeconds;
    this.loopCount += loops;
  }

  // A silent tick moves the music on (bar-line switches, medley handovers)
  // without booking notes or beats.
  processTick({ silent }) {
    if (this.pending && this.tick % this.current.barTicks === 0) {
      this.install(this.pending, this.nextTime);
      this.pending = null;
    }
    const cur = this.current;
    const time = this.nextTime;
    const secondsPerTick = 60 / this.bpm / TICKS_PER_BEAT;

    if (!silent) this.playTick(cur, time, secondsPerTick);

    this.nextTime += secondsPerTick;
    this.tick++;
    if (this.tick >= cur.loopTicks) this.endOfLoop();
  }

  playTick(cur, time, secondsPerTick) {
    if (this.tick % TICKS_PER_BEAT === 0) this.pushBeat(time);
    const swingOffset = cur.spec.swingAllowed && this.tick % 6 === 3 ? this.swing * 3 * secondsPerTick : 0;
    for (const { id, ev } of cur.byTick[this.tick]) {
      if (!this.enabled[id]) continue;
      this.engine.voices[id]?.play(ev, time + swingOffset, secondsPerTick);
    }
  }

  endOfLoop() {
    this.tick = 0;
    this.loopCount++;
    const repeats = this.current.spec.medleyRepeats;
    if (!this.medley || !this.nextMedley) return;
    if (this.loopCount === repeats - 1 && !this.prepared) {
      // Build the next tune a whole loop early, so the handover costs nothing.
      this.prepared = this.nextMedley(this.current.tune);
      this.prepare(this.prepared);
    }
    if (this.loopCount >= repeats) {
      const next = this.prepared ?? this.nextMedley(this.current.tune);
      this.install(next, this.nextTime);
    }
  }

  pushBeat(time) {
    const cur = this.current;
    const beatIndex = this.tick / TICKS_PER_BEAT;
    this.beats.push({
      time,
      style: cur.tune.style,
      lamps: cur.spec.lamps,
      lamp: beatIndex % cur.spec.lamps,
      partIndex: Math.floor(this.tick / cur.partTicks),
      beatInLoop: beatIndex + 1,
      loopBeats: loopBeats(cur.tune.style),
      barInPart: Math.floor((this.tick % cur.partTicks) / cur.barTicks) + 1,
      barsPerPart: cur.spec.barsPerPart,
    });
    if (this.beats.length > MAX_QUEUE) this.beats.shift();
  }

  // Remove and return the beats whose time has come.
  takeBeats(now) {
    let n = 0;
    while (n < this.beats.length && this.beats[n].time <= now) n++;
    return this.beats.splice(0, n);
  }
}
