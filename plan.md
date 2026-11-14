# Review and clean-up plan

This plan comes from reading every source file, test and document in the
repository. It lists the bugs found, the main pain points for whoever
maintains the code, and a plan for each. Nothing here is implemented yet.

The original design document and build log is now `original-plan.md`.

## 1. Summary

The codebase is in good shape. It's small, every module has one job, the
music code is pure and well tested, and the hard part (timing) follows the
standard lookahead pattern. Four real bugs turned up, all in the code that
sits between the user, the browser and the audio clock. Everything else is
duplication or leftovers from earlier versions.

**Bugs, most serious first**

1. **Clicking Play twice quickly the first time can start two copies of the
   band.** One of them can never be stopped.
2. **Playback after a stall comes out as a burst of notes.** A stall is any
   time the timer stops running for a while, such as when a laptop sleeps or
   the browser pauses the tab.
3. **Play stays silent if the browser has paused the audio system.** This
   happens on iPhones and in Safari after a phone call, a lock screen or a
   headphone change.
4. **Short links don't work, and the comment says they do.** A link with only
   a preset name, like `#celtic-jig`, is thrown away and the page opens the
   default preset. The comment at the top of `link.js` says a link without a
   tune number starts a fresh random tune.

**Pain points**

5. **Guitar, banjo and bass build each new note in the middle of playback.**
   The three plucked instruments generate the sound of each pitch the first
   time it plays, inside the scheduler's tight loop. Every other instrument
   now prepares its notes ahead of time. This one exception breaks the rule
   that `CODE.md` asks maintainers to follow.
6. **The app state stores the key and the style twice.** They're stored once
   on their own and once inside the tune. Nothing reads the separate copy of
   the key. The separate style is read, but it always equals the tune's style.
7. **The fiddle and flute files are near copies.** They share the same
   request, live fallback and playback code, with different numbers.
8. **Small duplications.** Two identical helpers that find the chord at a
   given moment. Beats-per-loop arithmetic written out by hand in the UI.
   The list of instrument names copied into `presets.js`. The noise
   generator living in the percussion file while the piano and flute use it
   too.
9. **Dead code.** Several functions and fields that nothing uses (listed in
   §4.9).
10. **The scheduler has no tests.** It's the most intricate stateful code in
    the project: it switches tunes at the next bar line, hands over between
    medley tunes, and records beats for the lamps. Bugs 1 and 2 live right
    next to it.

## 2. Constraints every change must respect

- **Don't change what any seed generates.** A link is just a seed, so any
  change to the order or number of random draws in `js/music/` changes what
  old links play. Every change below that touches `js/music/` is a pure
  refactor. The existing test "same seed gives the same tune" isn't enough to
  prove that, so step 0 adds a fixture that records exact output and checks
  it before and after.
- **No build step, no dependencies.** Plain ES modules and `node --test`.
- **Audio changes must sound identical.** The fiddle and flute refactor
  (§4.7) is checked by rendering notes offline before and after and comparing
  them, the same way the crackle fix was checked.
- No `target="_blank"` on any link.

## 3. Approach

The work is ordered so that safety nets come first and riskier refactors
last:

1. **Safety nets.** Record exact generator output for a set of seeds. Add a
   test for the scheduler, using a fake audio clock.
2. **Bug fixes** (1–4), each with a test where the logic can be tested
   outside a browser.
3. **Pain points 5–9**, smallest risk first.
4. **Docs.** Update `CODE.md` and the README where behaviour or file
   locations changed.

## 4. Detailed changes

### 4.0 Safety net: a fixture of exact generator output

A new test generates tunes and arrangements for a handful of seeds (every
style, two keys each) and compares them with a saved JSON fixture. A hash of
each would hide what changed, so the fixture stores the full output. It's
roughly a hundred kilobytes, which is fine for a test file. A small script
regenerates the fixture when the music is changed *on purpose*. The test
then makes any accidental change to old links fail loudly.

- **New** `test/fixtures/tunes.json`: the recorded output.
- **New** `test/golden.test.js`: compares freshly generated tunes and
  arrangements with the fixture.
- **New** `scripts/record-golden.js`: rewrites the fixture. Run it with
  `node scripts/record-golden.js`. A comment says it's only for deliberate
  changes to the music.

### 4.1 Bug: double Play click starts two schedulers

**What happens.** `ensureAudio()` in `main.js` checks `if (scheduler)
return` and then waits for the audio system to start. A second Play during
that wait, from a double click or the space bar, passes the same check. Both
calls then create a scheduler, and the second replaces the first in the
variable. The first is already running on its own timer, and nothing can
stop it any more. Starting the audio system usually takes a few
milliseconds, but on a slow device or when Safari is waking up the output it
can take hundreds.

**Fix.** Keep the start-up *promise* rather than the result, so every caller
waits for the same start-up:

```js
let audioReady = null;
function ensureAudio() {
  audioReady ??= (async () => { /* existing body */ })();
  return audioReady;
}
```

`togglePlay` must also read `store.get().playing` *after* the wait, which it
already does.

- `js/main.js`: as above.

### 4.2 Bug: a burst of notes after a stall

**What happens.** `Scheduler.pump()` books every tick whose time is earlier
than "now + 100 ms". If the timer doesn't run for a second or more, because
the laptop slept, the tab was frozen or the page was paused in the debugger,
the next wake-up finds dozens of ticks already in the past. It books them all
at once, and the audio system plays every overdue note immediately, in a
pile. The beat lamps flash through the backlog the same way.

**Fix.** At the start of `pump()`, if the next tick is already in the past by
more than a small margin (`MAX_LATE_SECONDS = 0.05`), skip forward without
playing. Advance the tick counter (and the loop counter, and the medley
handover) one tick at a time until the next tick is in the future again, so
the music resumes at the right place in the tune, in time. Skipped ticks
don't play notes and don't push beats.

So that skipping and playing never drift apart, `processTick()` gains a
`silent` flag. Bar-line tune switches and end-of-loop handling still run,
and only the note booking and beat recording are skipped:

```js
pump() {
  const now = this.engine.ctx.currentTime;
  while (this.running && this.nextTime < now - MAX_LATE_SECONDS) this.processTick({ silent: true });
  const horizon = now + LOOKAHEAD_SECONDS;
  while (this.running && this.nextTime < horizon) this.processTick({ silent: false });
}
```

*Alternative rejected:* restarting the tune from the top after a stall. It's
simpler, but a dancer mid-figure loses their place in the music.

- `js/audio/scheduler.js`: as above. Remove the generic `push(queue, item)`
  helper while there. It has exactly one caller, so the queue limit can sit
  inline in `pushBeat`.

### 4.3 Bug: Play stays silent after the browser pauses the audio

**What happens.** `ensureAudio()` resumes the audio system only on the very
first Play. Some browsers pause it again later: iOS Safari after a phone
call, a lock screen or another app taking the audio, and Safari when
headphones are plugged in. After that, the scheduler books notes on a clock
that isn't moving. The page shows "playing", but nothing sounds, and the
lamps don't light.

**Fix.** Every time Play starts playback, call `engine.start()`, which
already resumes the audio system if it isn't running and does nothing
otherwise. Browsers allow a resume because Play is a user click.

- `js/main.js`: in `togglePlay`, on the "start" branch, `await engine.start()`
  before `scheduler.start()`.

### 4.4 Bug: short links, and a misleading comment

**What happens.** `parseHash` needs all three pieces: preset or style, key
and tune number. `#celtic-jig` and `#celtic-jig/E-dorian` are rejected, so
the page quietly opens the default New England Reel. The comment at the top
of `link.js` says a link without the tune number "simply starts a fresh
random tune", which isn't what the code does.

**Fix.** Make the key and the tune number optional, in that order:

| Link | Opens |
|---|---|
| `#celtic-jig/E-dorian/abc12` | that exact tune (unchanged) |
| `#celtic-jig/E-dorian` | the Celtic Jig preset, a fresh random tune in E dorian |
| `#celtic-jig` | the Celtic Jig preset, a fresh random tune in its usual key |
| `#jig` | the first jig preset, a fresh random tune |
| anything else | ignored, as now |

Once the tune is generated, the address bar fills in the full link as usual.
This is a small change to the link format. Full links keep working exactly as
before.

**Data model change.** `parseHash` returns `{ preset, key, seed }`, where
`key` and `seed` may now be `null`. `applyLink` uses the preset's key when
`key` is null and a random seed when `seed` is null.

- `js/link.js`: optional pieces; correct the header comment.
- `js/state.js`: `applyLink` handles the null fields.
- `test/link.test.js`: move `#reel` and `#reel/D-major` from the "ignored"
  list to a new test for short links. Keep `#`, `''`, bad keys, bad seeds and
  extra pieces in the "ignored" list.

### 4.5 Plucked strings: prepare notes ahead of time

**What happens.** `pluck.js` renders a pitch's buffer with the string
simulation (Karplus-Strong) the first time `play()` meets it. That's tens of
thousands of loop iterations per pitch, inside the scheduler's pump. A strum
with several new pitches does it several times in one pump. The 100 ms of
lookahead usually hides it, but it's exactly the kind of main-thread spike the
scheduler is meant to avoid. It also breaks the rule in `CODE.md`: "voices
pre-render notes".

**Fix.** Add `prepare(events)` to the pluck voice. It renders every pitch the
tune uses, using `longestByPitch` from `prerender.js`. The scheduler already
calls `prepare` when a tune is loaded and a loop before a medley handover.
`play()` keeps the existing render-on-demand as a fallback, so nothing can
be silent.

The plucked buffers don't depend on tempo, because their length is fixed by
the instrument, so the tempo margin doesn't apply.

- `js/audio/voices/pluck.js`: add `prepare`.

### 4.6 One source of truth for key and style

**What happens.** The app state has `key` and `style` fields, and the tune
has its own `key` and `style`. Nothing reads `state.key`; every reader uses
`state.tune.key`. `state.style` is read in three places, but it always equals
`state.tune.style`. Keeping two copies in step is a trap for the next person
to add a feature: for example, a key picker that updates one copy and not
the other.

**Fix.** Remove both fields from the state. Read `tune.style` and `tune.key`
everywhere.

**Data model change.** The app state becomes:

```js
{
  playing, masterVolume, medley,
  presetId, bpm, swing, mixer,
  tune,          // carries style and key
}
```

- `js/state.js`:
  - drop `style` and `key` from `presetFields` and `applyLink`;
  - `withNewTune` uses `state.tune.style`;
  - `initialState` takes an optional link instead of generating a random tune
    that `main.js` then throws away.
- `js/main.js`: the medley callback becomes `store.update({ tune })`.
  `createStore(initialState(startLink))`.
- `js/ui.js`: compare `state.tune.style` with `prev.tune.style`.
  `idlePosition` reads the tune's style.
- `test/state.test.js`: drop the `change.key` assertion. Assert on
  `change.tune.key` instead.

### 4.7 Fiddle and flute: share the held-note logic

**What happens.** `fiddle.js` and `flute.js` each have the same four pieces:
`request` (pre-render a pitch), `playLive` (the fallback), a short-note cut-off,
and `play` (choose a buffer or the fallback, then shape the release). Only
the numbers and the tone recipe differ. A fix to one is easy to forget in the
other.

**Fix.** A new helper in `prerender.js`, `createHeldNoteVoice`, takes the
parts that differ:

```js
createHeldNoteVoice(ctx, input, {
  level, release, shortest,      // numbers
  renderNote(c, out, midi, seconds),     // the pre-render recipe at velocity 1
  playLive(ev, when, dur),               // the full live note (fallback)
})
// returns { prepare(events, secondsPerTick), play(ev, when, secondsPerTick) }
```

`fiddle.js` and `flute.js` keep their tone recipes (`bowedTone`, `pipeTone`,
`breathPuff`) and their live envelopes, and shrink to the recipe plus one call.
Nothing audible should change.

**Check.** Before and after, render a short phrase for each voice in an
offline audio context, with the fallback forced off, and compare loudness.
That's the method used for the crackle fix. The difference should be zero, or
within the run-to-run noise of the breath. `CODE.md` notes that the old
comparison harness lived in a temporary folder. Recreate it in the
scratchpad; don't add it to the repo.

*Alternative rejected:* merging the piano in too. Its damper and ring-out
are different enough that a shared helper would need options just for the
piano, and that would be more confusing than the duplication it saves.

- `js/audio/voices/prerender.js`: add `createHeldNoteVoice`.
- `js/audio/voices/fiddle.js`, `js/audio/voices/flute.js`: use it.

### 4.8 Small duplications

- **Chord at a given moment.** `chordAt` exists in both `tune.js` (taking a
  list of chords) and `patterns.js` (taking a bar), plus a copy in
  `tune.test.js`. Keep one, taking the chord list, in `theory.js`. Callers
  in `patterns.js` pass `bar.chords`.
- **Beats per loop in the UI.** `idlePosition` works out
  `barsPerPart × beatsPerBar × 4` by hand. Use `loopBeats(style)` from
  `styles.js`, which already exists but is unused. The scheduler's
  `loopTicks / TICKS_PER_BEAT` becomes the same call.
- **Instrument names in presets.** `presets.js` repeats the list of
  instrument names, because importing `instruments.js` would pull the audio
  code into the music tests. Keep the list where it is, and add a test that
  it matches the instrument registry exactly. Then adding an instrument and
  forgetting the presets fails a test rather than crashing the mixer at run
  time.
- **The noise buffer.** `noiseBuffer` lives in `percussion.js`, but the piano
  and flute import it from there. Move it to `prerender.js`, the shared
  audio helpers.
- **Fiddle-friendly keys.** `KEY_FAMILIES` is musical data, but it lives in
  `state.js`, so `link.js` imports the state module just to read it. Move it
  to `theory.js`, next to the modes.

Files:
- `js/music/theory.js`: add `chordAt`, `KEY_FAMILIES`.
- `js/music/tune.js`, `js/music/patterns.js`: import `chordAt`.
- `js/ui.js`, `js/audio/scheduler.js`: use `loopBeats`.
- `js/state.js`, `js/link.js`: import `KEY_FAMILIES` from `theory.js`.
- `js/audio/voices/percussion.js`, `piano.js`, `flute.js`, `prerender.js`:
  move `noiseBuffer`.
- `test/tune.test.js`: import `chordAt`.
- **New** `test/presets.test.js`: preset mixers cover exactly the
  registered instruments; every preset's style and key are valid; every
  preset's key is in its mode's key family. Without that last check,
  `nextKey` and links would misbehave.

### 4.9 Dead code to remove

Each of these has no callers outside its own definition (tests excepted where
noted):

| Where | What | Notes |
|---|---|---|
| `audio/engine.js` | `started` getter, `setMixer` | |
| `audio/voices/instructor.js` | `status` field | `ready` is what `main.js` uses |
| `instruments.js` | `role` on each instrument | never read |
| `music/styles.js` | `PART_LABELS` | the labels are written in `index.html` |
| `music/theory.js` | `isInScale`, `scaleMidis` | |
| `music/rng.js` | `int` | |
| `music/tune.js` | `export { partRange }` | still used inside the file |
| `audio/scheduler.js` | defaults `bpm = 116`, `medley = true` | always overwritten at once by `main.js`. Keep the fields, set neutral defaults (`medley = false`). |

`midiToNote` and `noteToMidi` are used only by tests, but they make those
tests readable. Keep them.

### 4.10 Tests for the scheduler

A new test file drives the scheduler with a fake engine:
- a `ctx` whose `currentTime` the test moves forward by hand;
- voices that record `(id, event, when)`;
- `fadeIn` and `fadeOut` that do nothing.

The test calls `pump()` directly and stops the scheduler at the end so its
timer doesn't keep the test process alive.

It covers:
- notes come out in tick order, at `start time + tick × seconds per tick`;
- a tune loaded while playing takes over exactly on a bar line;
- the medley prepares the next tune one loop early and hands over at the end
  of the last repeat;
- a disabled instrument books nothing;
- the beats taken for the lamps match the beats booked;
- after a simulated two-second stall, nothing is booked in the past, and
  playback resumes at the right place in the tune (bug 2);
- changing tempo mid-loop changes the spacing from the next tick.

- **New** `test/scheduler.test.js`.

### 4.11 Docs

- `CODE.md`:
  - file map: `original-plan.md` and the test fixture;
  - §3.2 state shape (no `key` or `style`);
  - §3.5 the stall rule;
  - §3.7 the pluck `prepare` and the held-note helper;
  - §3.9 short links;
  - §5 "Make melodies sound better": rerun the fixture script when you
    deliberately change the music;
  - §6 the new test suites;
  - §7: the background-tab bullet should mention that stalls are now skipped
    rather than burst.
- `README.md`: short links. Point to `original-plan.md` instead of
  `plan.md`.

## 5. Considered and rejected

- **Moving the scheduler's timer into a Web Worker.** It's the standard fix
  for background-tab throttling, but background playback already works and
  §4.2 removes the worst symptom of a long stall. Not worth the extra file
  and messaging.
- **Stopping the animation loop while the music is stopped.** It costs almost
  nothing, and the lamps need a few frames after Stop to switch off.
- **Accessible tooltips for the instrument descriptions.** The `title`
  attribute doesn't show on touch screens or to keyboard users. A proper
  disclosure is a UI design change, not a clean-up, and the user asked for
  mouseover specifically.
- **Merging repeated descriptions** (for example, the bass texts are the same
  for reels and jigs). It's data that a reader scans as a table. Sharing
  entries would make it harder to edit one style without the other.
- **Versioned links.** Only needed if links must survive changes to the
  music. The fixture in §4.0 makes such changes deliberate. That's enough for
  a site with two users.
- **Making the plucked strings use the offline audio context like the other
  voices.** Their string simulation already produces a buffer directly, so
  routing it through an offline context would add work for no gain.

## 6. Risks

- **Accidentally changing what links play.** Mitigated by the fixture (§4.0),
  which is written before any music file is touched.
- **The held-note refactor changing the sound.** Mitigated by the offline
  before/after comparison, and by listening in Firefox, the browser where the
  crackle showed up.
- **The stall skip misfiring on a slow machine.** The margin (50 ms) is half
  the lookahead. A pump that runs a little late still books its notes
  normally, a few milliseconds late as today. Only a real stall skips. The
  scheduler test covers both cases.
- **Resume on every Play (§4.3).** If the audio system can't resume, for
  example because Safari refuses outside a click, `engine.start()` waits
  forever on the play action. Space bar and click both count as user
  gestures, so this shouldn't arise. Worth trying on an iPhone if one is to
  hand.
- **No Safari or phone testing so far.** Bugs 1 and 3 are most likely there.
  The fixes are defensive, and correct whether or not the problem shows up.

## 7. Files touched

| File | Change |
|---|---|
| `original-plan.md` | renamed from `plan.md` (done) |
| `js/main.js` | shared audio start-up; resume on every Play; simpler state set-up |
| `js/state.js` | drop `key` and `style`; `initialState(link)`; short links |
| `js/link.js` | short links; correct comment; import keys from theory |
| `js/ui.js` | read style from the tune; use `loopBeats` |
| `js/presets.js` | none (now covered by a test) |
| `js/instruments.js` | drop `role` |
| `js/audio/scheduler.js` | stall skip; `silent` ticks; inline beat queue; `loopBeats`; neutral defaults |
| `js/audio/engine.js` | drop unused getter and method |
| `js/audio/voices/prerender.js` | `createHeldNoteVoice`; `noiseBuffer` moves here |
| `js/audio/voices/fiddle.js` | use the held-note helper |
| `js/audio/voices/flute.js` | use the held-note helper; new `noiseBuffer` import |
| `js/audio/voices/piano.js` | new `noiseBuffer` import |
| `js/audio/voices/percussion.js` | `noiseBuffer` moved out |
| `js/audio/voices/pluck.js` | `prepare` |
| `js/audio/voices/instructor.js` | drop `status` |
| `js/music/theory.js` | add `chordAt`, `KEY_FAMILIES`; drop `isInScale`, `scaleMidis` |
| `js/music/tune.js` | import `chordAt`; drop `partRange` export |
| `js/music/patterns.js` | import `chordAt` |
| `js/music/styles.js` | drop `PART_LABELS` |
| `js/music/rng.js` | drop `int` |
| `scripts/record-golden.js` | new: rewrites the fixture |
| `test/fixtures/tunes.json` | new: recorded tunes |
| `test/golden.test.js` | new |
| `test/scheduler.test.js` | new |
| `test/presets.test.js` | new |
| `test/link.test.js`, `test/state.test.js`, `test/tune.test.js` | updated as above |
| `CODE.md`, `README.md` | updated as above |

## Todo

### Phase 1: Safety nets
- [x] Write `scripts/record-golden.js`: generate tunes and arrangements for every style, two keys each, a few fixed seeds, and write them to `test/fixtures/tunes.json`
- [x] Run the script once on the current code and commit the fixture alongside it
  - Note: the full output came to 2 MB. The fixture now stores one short line per note and two seeds per case, which brings it to about 480 KB. The case list lives in `scripts/golden.js`, shared by the script and the test.
- [x] Write `test/golden.test.js`: regenerate the same tunes and arrangements and compare with the fixture
- [x] Build the fake engine for scheduler tests (hand-moved clock, recording voices, no-op fades)
- [x] Scheduler test: notes come out in tick order at the right times
- [x] Scheduler test: a tune loaded while playing takes over on a bar line
- [x] Scheduler test: medley prepares one loop early and hands over after the last repeat
- [x] Scheduler test: a disabled instrument books nothing; beats taken match beats booked
- [x] Scheduler test: a tempo change mid-loop changes spacing from the next tick
- [x] Run `npm test`; all existing and new tests pass before any other change

### Phase 2: Bug fixes
- [x] Main: keep the audio start-up promise so every Play waits for the same start-up (§4.1)
- [x] Main: resume the audio system on every Play that starts playback (§4.3)
- [x] Scheduler: add the `silent` flag to `processTick` and the stall skip in `pump` (§4.2)
- [x] Scheduler: inline the beat-queue limit in `pushBeat` and remove `push`
  - Note: catching up tick by tick after a long stall would build and pre-render a medley tune for every loop nobody heard. So `pump` first jumps over whole loops at once (`skipWholeLoops`), then skips the remaining overdue ticks silently. A second test covers a ten-minute stall.
  - Note: if the audio start-up fails, `ensureAudio` clears the shared promise so the next click can try again.
- [x] Scheduler test: after a two-second stall nothing is booked in the past and playback resumes at the right place
- [x] Links: make the key and tune number optional in `parseHash`; correct the header comment (§4.4)
- [x] State: `applyLink` uses the preset's key and a random seed when they're missing
- [x] Link tests: move short links out of the "ignored" list into a new short-link test
- [x] Run `npm test`

### Phase 3: Plucked strings prepare ahead
- [x] Add `prepare(events)` to the pluck voice, rendering every pitch the tune uses (§4.5)
- [x] Check in the browser that guitar, banjo and bass still sound and that nothing logs errors

### Phase 4: One source of truth for key and style
- [x] State: drop `key` and `style` from `presetFields` and `applyLink`; `withNewTune` reads the tune's style (§4.6)
- [x] State: `initialState` takes an optional link; main uses it instead of discarding a random tune
- [x] Main: medley callback updates only `tune`
- [x] UI: read the style from the tune in `render` and `idlePosition`
- [x] State test: assert on the tune's key instead of `change.key`
- [x] Run `npm test`, including the fixture test

### Phase 5: Small duplications
- [x] Move `chordAt` into `theory.js`; use it from `tune.js`, `patterns.js` and `tune.test.js` (§4.8)
- [x] Move `KEY_FAMILIES` into `theory.js`; update `state.js`, `link.js` and the tests that import it
- [x] Use `loopBeats` in the UI's idle position and in the scheduler's beat record
- [x] Move `noiseBuffer` into `prerender.js`; update the percussion, piano and flute imports
- [x] Write `test/presets.test.js`: mixers cover exactly the registered instruments; styles and keys are valid; each key is in its mode's family
- [x] Run `npm test`, including the fixture test

### Phase 6: Dead code
- [x] Engine: remove the `started` getter and `setMixer` (§4.9)
- [x] Instructor: remove the `status` field
- [x] Instruments: remove `role`
- [x] Music: remove `PART_LABELS`, `isInScale`, `scaleMidis`, the rng's `int`, and the `partRange` export
- [x] Scheduler: neutral defaults (`medley = false`)
- [x] Grep for any remaining references; run `npm test`

### Phase 7: Fiddle and flute share the held-note logic
- [x] Recreate the offline comparison harness in the scratchpad and record fiddle and flute phrases on the current code
- [x] Add `createHeldNoteVoice` to `prerender.js` (§4.7)
- [x] Rewrite `fiddle.js` to use it, keeping its tone recipe and live envelope
- [x] Rewrite `flute.js` to use it, keeping its tone recipe, breath and live envelope
- [x] Rerun the comparison; loudness matches within breath noise
- [x] Listen in Firefox: play each preset for a few minutes, with no crackle and no console errors
  - Note: checked in headless Firefox: jig, waltz and reel presets played with no errors and evenly stepping lamps. Claude can't hear, so the by-ear check for crackle is left to the user.

### Phase 8: Docs and wrap-up
- [x] `CODE.md`: file map, state shape, stall rule, pluck `prepare`, held-note helper, short links, fixture script, new test suites, background-tab note (§4.11)
- [x] `README.md`: short links; point to `original-plan.md`
- [x] Final `npm test` and a full-page browser check (play, New tune, change preset, medley handover, open a short link)
