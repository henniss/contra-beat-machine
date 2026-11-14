// Lookahead scheduler ("a tale of two clocks"): a coarse timer wakes every
// 25 ms and books every note due in the next 100 ms on the sample-accurate
// audio clock. Time advances one tick (1/12 beat) at a time at the current BPM,
// so tempo changes take effect immediately without re-timing anything.
//
// It also records when each beat will sound, so the UI can light the lamps in
// step with what you hear rather than with when notes were booked.

import { styleSpec, barTicks, partTicks, loopTicks, TICKS_PER_BEAT } from '../music/styles.js';

const WAKE_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;
const START_DELAY_SECONDS = 0.08;
const MAX_QUEUE = 256;

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
    this.bpm = 116;
    this.swing = 0;
    this.medley = true;
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
    if (this.running && this.current) this.pending = bundle;
    else this.install(bundle, null);
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
    const horizon = this.engine.ctx.currentTime + LOOKAHEAD_SECONDS;
    while (this.running && this.nextTime < horizon) this.processTick();
  }

  processTick() {
    if (this.pending && this.tick % this.current.barTicks === 0) {
      this.install(this.pending, this.nextTime);
      this.pending = null;
    }
    const cur = this.current;
    const time = this.nextTime;
    const secondsPerTick = 60 / this.bpm / TICKS_PER_BEAT;

    if (this.tick % TICKS_PER_BEAT === 0) this.pushBeat(time);

    const swingOffset = cur.spec.swingAllowed && this.tick % 6 === 3 ? this.swing * 3 * secondsPerTick : 0;
    for (const { id, ev } of cur.byTick[this.tick]) {
      if (!this.enabled[id]) continue;
      const voice = this.engine.voices[id];
      if (!voice) continue;
      voice.play(ev, time + swingOffset, secondsPerTick);
    }

    this.nextTime += secondsPerTick;
    this.tick++;
    if (this.tick >= cur.loopTicks) this.endOfLoop();
  }

  endOfLoop() {
    this.tick = 0;
    this.loopCount++;
    const repeats = this.current.spec.medleyRepeats;
    if (!this.medley || !this.nextMedley) return;
    if (this.loopCount === repeats - 1 && !this.prepared) {
      // Build the next tune a whole loop early, so the handover costs nothing.
      this.prepared = this.nextMedley(this.current.tune);
    }
    if (this.loopCount >= repeats) {
      const next = this.prepared ?? this.nextMedley(this.current.tune);
      this.install(next, this.nextTime);
    }
  }

  pushBeat(time) {
    const cur = this.current;
    const beatIndex = this.tick / TICKS_PER_BEAT;
    this.push(this.beats, {
      time,
      style: cur.tune.style,
      lamps: cur.spec.lamps,
      lamp: beatIndex % cur.spec.lamps,
      partIndex: Math.floor(this.tick / cur.partTicks),
      beatInLoop: beatIndex + 1,
      loopBeats: cur.loopTicks / TICKS_PER_BEAT,
      barInPart: Math.floor((this.tick % cur.partTicks) / cur.barTicks) + 1,
      barsPerPart: cur.spec.barsPerPart,
    });
  }

  push(queue, item) {
    queue.push(item);
    if (queue.length > MAX_QUEUE) queue.shift();
  }

  // Remove and return the beats whose time has come.
  takeBeats(now) {
    let n = 0;
    while (n < this.beats.length && this.beats[n].time <= now) n++;
    return this.beats.splice(0, n);
  }
}
