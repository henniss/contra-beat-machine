# The Code: A Maintainer's Guide

This guide is for someone taking over the Contra Beat Machine. It explains how
the code is organised, how sound gets from a random number to your speakers,
and how to make the common kinds of change safely. For what the music does and
why, see `MUSIC.md`. `original-plan.md` is the original design document and
build log; `plan.md` is the most recent review and clean-up plan. Both are
useful history, but this guide describes the code as it is now.

## 1. At a glance

- **A static site.** Plain HTML, CSS and JavaScript modules: no framework, no
  build step, no runtime dependencies, no server code. About 3,000 lines in
  all.
- **Everything is generated in the browser.** The melody, the accompaniment,
  and the sound of every instrument are computed live with the Web Audio API.
  The only media files are four short spoken-count clips.
- **Tested with Node's built-in test runner** (Node 18 or later). The music
  logic is pure functions with no browser dependencies, so it's all testable
  from the command line. The audio and UI code isn't covered by automated
  tests.

```sh
npm run serve   # python3 -m http.server 8000, then open http://localhost:8000
npm test        # node --test test/
```

You need a server, not a double-clicked file: browsers won't load JavaScript
modules from `file://` URLs. Any static server works.

Hosting is covered in `aws.md`.

## 2. Map of the files

```
index.html                 the page skeleton; the UI fills in presets and instruments
css/style.css              all styling; light and dark themes via CSS custom properties
js/
  main.js                  entry point: wires store, audio engine, scheduler, UI, links
  state.js                 tiny state store + pure functions that produce state changes
  presets.js               the five presets (style, key, tempo, swing, mixer)
  instruments.js           instrument registry: voice + pattern + icon + loudness trim
  icons.js                 inline SVG icons, one per instrument
  link.js                  shareable tune links in the address bar (#preset/key/seed)
  ui.js                    builds controls, renders state, runs the beat-lamp loop
  music/                   PURE: no browser APIs, fully unit-tested
    rng.js                 seeded random numbers (mulberry32)
    styles.js              reel / jig / waltz: beats per bar, bars per part, lamps…
    theory.js              notes, scales, modes, chords (MIDI note numbers)
    progressions.js        chord-progression templates per style and mode
    tune.js                the melody generator
    patterns.js            each instrument's part, as timed note events
    descriptions.js        plain-language labels for what each instrument plays
  audio/                   BROWSER: Web Audio
    engine.js              mixer graph: channels, reverb, master, compressor
    scheduler.js           lookahead scheduler; feeds beats to the lamps
    voices/                one synthesizer per instrument
      fiddle.js flute.js piano.js pluck.js percussion.js instructor.js
      prerender.js         shared: pre-rendered notes, and prompt node clean-up
assets/voice/              "one".."four" clips, .ogg and .m4a
scripts/make-voice.sh      regenerates the clips (espeak-ng + ffmpeg)
scripts/golden.js          the tunes pinned down by the golden test
scripts/record-golden.js   rewrites the golden fixture (only after deliberate music changes)
test/                      node:test suites for music, scheduler, state, presets, and links
test/fixtures/tunes.json   recorded output of the generator for fixed seeds
```

The most useful split to keep in mind is **`js/music/` (pure, deterministic,
tested)** versus **`js/audio/` (browser-only, verified by ear and
measurement)**. Keep it that way: anything you can express as "given a tune,
produce data" belongs in `music/`, where it can be tested.

## 3. How a note gets played

```
seed + style + key
      │  generateTune()            js/music/tune.js
      ▼
tune  { seed, style, key, parts: { A: [bar…], B: [bar…] } }
      │  arrangeTune()             js/instruments.js → patterns.js
      ▼
arrangement  { fiddle: [event…], piano: [event…], … }   (one loop, AABB)
      │  Scheduler                 js/audio/scheduler.js
      ▼
voice.play(event, when, secondsPerTick)     js/audio/voices/*
      │
      ▼
channel gain → transport → master → compressor → speakers   (engine.js)
```

### 3.1 Time is measured in ticks

- **A tick is 1/12 of a beat** (`TICKS_PER_BEAT = 12` in `styles.js`). Twelve
  divides evenly into 4 (reel notes), 3 (jig notes) and 2, so every style's
  rhythm lands on whole ticks.
- **A beat is one dancer step**, the pulse the lamps show.
- **Bars:** reels and jigs have 2 beats (24 ticks), waltzes 3 (36 ticks).
- **One loop** is the whole tune played AABB: 768 ticks for a reel or jig,
  2,304 for a waltz.

Note events never contain seconds. The scheduler converts ticks to seconds at
play time using the current tempo, which is why the tempo slider takes effect
instantly without regenerating anything.

### 3.2 The data shapes

**Key:** `{ tonic: 'D', mode: 'major' | 'dorian' | 'minor' }`

**Chord:** `{ degree: 1..7, quality: 'maj' | 'min' }`. The degree counts up
the scale from the home note, so chords are key-independent until played.

**Pitches** are MIDI note numbers: middle C is 60, and each step up is one
semitone. `theory.js` does all the conversion.

**Tune** (from `generateTune`):

```js
{
  seed: 123456789, style: 'reel', key: { tonic: 'D', mode: 'major' },
  parts: {
    A: [ { chords: [chord] or [chord, chord], melody: [melodyNote…] }, …8 bars ],
    B: [ … ],
  },
}
// melodyNote: { tick (within the bar), durationTicks, midi, velocity, articulation? }
```

**Event** (what patterns produce and voices consume):

```js
{
  tick,            // from the start of the loop
  durationTicks,
  velocity,        // 0..1
  midi?,           // a number for one note, an array for a chord or strum
  articulation?,   // instrument-specific: 'down'/'up' strums, 'accent'/'ghost'
                   // drum strokes, 'heel'/'toe', 'roll'
  word?,           // instructor only: 1..4
}
```

**Voice** (what each synthesizer module returns):

```js
createXVoice(ctx, outputNode) → {
  play(event, whenSeconds, secondsPerTick),
  prepare?(events, secondsPerTick),  // optional: pre-render this tune's notes
  ready?,          // optional Promise<boolean>; only the instructor has one
}
```

`play` must schedule everything at `whenSeconds` on the audio clock and return
immediately. Nothing in a voice should depend on wall-clock time.

**Keep the number of live audio nodes per note small.** Each note used to be
built from fresh oscillators, filters and gains: up to about fifteen nodes for
a piano note, and hundreds of nodes per second for a full band. Firefox let
finished nodes pile up, and after a few minutes playback crackled and popped.
Now `voices/prerender.js` renders each note once in an `OfflineAudioContext`,
using the voice's own node recipe, and replays the cached buffer with just a
buffer source and a gain envelope. The scheduler calls `prepare` when a tune is
loaded (and a loop early for medley tunes), so buffers are usually ready
before they're needed. A voice falls back to building the note live until its
buffer is ready, and for notes too short for the pre-rendered attack (the
quick notes of a roll). Every live node is disconnected as soon as its sound
ends (`releaseWhenDone`). If you add a voice, follow the same pattern.
Held-note instruments can use `createHeldNoteVoice` from `prerender.js`, as
the fiddle and flute do: give it the pre-render recipe and the live fallback,
and it handles the cache, the short-note cut-off and the release.

**App state** (in `state.js`):

```js
{
  playing, masterVolume, medley,
  presetId,        // a preset id, or 'custom' once tempo or instruments change
  bpm, swing, mixer,
  tune,            // the only copy of the current style and key
}
```

### 3.3 Generating the melody (`tune.js`)

`generateTune({ seed, style, key })` builds each part in this order:

1. **Pick a chord progression** (`progressions.js`), one weighted template per
   part.
2. **Lay out rhythms bar by bar** following the phrase plan: phrase 3 repeats
   phrase 1, and phrases 2 and 4 reuse phrase 1's opening. The halfway bar
   gets a "half cadence" rhythm, and the last bar gets a held final note.
3. **Pitch the strong slots** (on the beat, plus mid-beat in reels) with chord
   tones, weighted by interval size and a pull toward the middle of the range.
4. **Fill the weak slots** by scale steps toward the next strong note, with an
   occasional leap.
5. **Copy repeated phrases**, shifted to fit the new chords where needed.

All the tunable weights are in the `RULES` object at the top of `tune.js`.
That's where to go if melodies sound wrong.

### 3.4 Accompaniment (`patterns.js`)

Each instrument has a pattern function, `tune → events for one loop`.
`expandTune(tune)` turns the two parts into the 32 (or 64) bars in playing
order, each with a `next` bar so patterns can lead into chord changes.

**Rhythm variants.** Backing instruments have several patterns per style,
listed with weights in `VARIANTS`. `pickVariants(tune, id)` chooses one for
the A part and one for the B part, using a random generator seeded from the
tune's seed plus the instrument name. That means:

- the choice is repeatable (the same tune always gets the same backing),
- each instrument's choice is independent of the others,
- adding a variant to one instrument doesn't change any other instrument's
  choices.

**Descriptions.** `descriptions.js` gives every variant a short name and a
one-sentence explanation. The UI shows the name under each instrument and the
explanation as a tooltip, via `describeInstrument(tune, id)`. When you add or
rename a variant, add its description too. A test fails if any variant is
missing one.

`buildArrangement` runs every pattern and sorts each instrument's events by
tick.

### 3.5 The scheduler (`audio/scheduler.js`)

This is a standard Web Audio lookahead scheduler (sometimes called "a tale of
two clocks"):

- A `setInterval` timer wakes every **25 ms** and books every tick that falls
  within the next **100 ms** on the audio clock (`ctx.currentTime`), which is
  sample-accurate. JavaScript timers are sloppy; the audio clock isn't. The
  lookahead absorbs the sloppiness.
- It walks **one tick at a time**, adding `60 / bpm / 12` seconds per tick.
  Changing the BPM just changes the step size from that moment on.
- **Swing** (reels only) delays the off-beat notes, the ones at tick 3 and 9
  of each beat, by `swing × 3` ticks' worth of time.
- **Muted instruments are skipped at play time**, so toggling an instrument
  is instant and costs nothing.
- **Tune changes while playing** (New tune, preset change) are held as
  `pending` and installed at the next bar line, so the music never stumbles
  mid-bar.
- **Medley:** after `medleyRepeats - 1` loops the next tune is generated in
  advance (`prepared`), and installed at the loop boundary.
- **Stalls are skipped, not replayed.** If the timer didn't run for a while
  (laptop asleep, tab frozen), ticks more than 50 ms overdue are passed over
  silently: whole loops at once, then single ticks. Bar-line switches and
  medley handovers still happen, so the music resumes in time at the right
  place instead of playing the backlog in one burst.
- **Beats for the lamps:** every time it books a beat, it records
  `{ time, lamp, partIndex, … }` in a queue. The UI's animation loop
  (`requestAnimationFrame` in `ui.js`) calls `takeBeats(now)` and lights the
  latest beat whose time has arrived. **This is what keeps the lamps in sync
  with the sound.** If the lamps were lit when beats are booked, they'd run
  about 100 ms early.

### 3.6 The audio engine (`audio/engine.js`)

```
voice → channel gain (per instrument) → transport → master → compressor → speakers
            └→ reverb send → shared reverb ┘
```

- **Channel gain** = `volume² × trim`. Squaring the 0–1 slider value makes it
  feel even to the ear. `trim` is the per-instrument balance in
  `instruments.js`.
- **Transport** is a separate gain used only for fading in on Play and out on
  Stop, so Stop is click-free without touching the mixer.
- **Reverb** is a convolver with a generated noise-decay impulse, so no
  impulse-response file is needed. Each instrument's send level is the
  `reverb` value in `instruments.js`.
- **The compressor** catches peaks when many instruments stack up. It's set
  fairly gently (threshold −14 dB, ratio 4:1).
- **The audio context is created on the first Play click**, because browsers
  block audio until the user interacts with the page.

### 3.7 The voices

| Voice | Technique | Notes |
|---|---|---|
| `fiddle.js` | Two detuned sawtooth oscillators through fixed peaking filters (violin body resonances), with vibrato that fades in on long notes | Each pitch's attack and sustain is pre-rendered; length and release are applied live. Body filters are shared. Pre-rendered notes use one fixed brightness (live ones vary it slightly with velocity). |
| `flute.js` | Sine plus a little triangle, with a burst of filtered noise for breath | Pre-rendered like the fiddle; both use `createHeldNoteVoice`. |
| `piano.js` | Six slightly sharp sine partials (stiff-string stretching) with individual decays, plus a noise "hammer" click | Each pitch's free ring is pre-rendered; the damper is applied live. Accepts a chord array. |
| `pluck.js` | Karplus-Strong plucked string, rendered once per pitch into a cached buffer, then replayed | Guitar, banjo and bass share it with different `PLUCK_CONFIGS`. `prepare` renders a tune's pitches up front; `play` renders on demand only as a fallback. Arrays become strums, with strings a few milliseconds apart. |
| `percussion.js` | Falling sine "thumps" plus filtered noise bursts | Bodhrán, feet, metronome. Each stroke is pre-rendered four times (different noise), and the takes rotate. |
| `prerender.js` | Shared helpers: the render cache, buffer playback, node clean-up, the held-note voice, the shared noise buffer | See "Keep the number of live audio nodes per note small" above |
| `instructor.js` | Decoded audio clips, started early by `CLIP_OFFSETS` so the vowel (not the consonant) lands on the beat | Loads Ogg, falls back to M4A for Safari; `ready` resolves false if loading fails, and the UI greys the card out |

### 3.8 State and UI

- **`state.js`** has a 15-line store (`get`, `update`, `subscribe`) and pure
  "change makers" such as `applyPreset`, `withNewTune`, `setBpm` and
  `setChannel`. Each returns a function `state → partial state`. Any tempo or
  instrument tweak sets `presetId` to `'custom'`.
- **`main.js`** defines `actions` (what the buttons do), starts the audio
  once (every caller shares one start-up promise, so a double click can't
  build two schedulers), wakes the audio system again on every Play (browsers
  can pause it, e.g. iOS after a phone call), keeps the audio side
  in step with the store (`syncAudio`), and keeps the address bar in step
  (`syncAddress`).
- **`ui.js`** builds the preset buttons and instrument cards from data, and a
  single `render(state, prev)` updates only what changed. It also handles the
  space-bar shortcut and the click-to-cover beat display, and runs the lamp
  animation loop.

### 3.9 Tune links (`link.js`)

The address bar always shows `#<preset or style>/<tonic>-<mode>/<seed in base 36>`,
e.g. `#celtic-jig/A-dorian/abc12`. The key and tune number are optional:
`#celtic-jig` or `#celtic-jig/A-dorian` open that preset with a fresh random
tune, after which the address bar shows the full link. On load (and on
`hashchange`) `parseHash` validates it strictly and returns `null` for
anything unexpected, in which case the page starts the default preset. Links use `history.replaceState`, so they
don't fill up the Back history. The `#` part never reaches the server, so
links need no hosting configuration.

## 4. Important rules to preserve

### Determinism, and why it matters for links

A tune link is just a seed. The page regenerates the tune from scratch, so
**old links only keep working while the generator gives the same output for
the same seed.** Any of these changes will make existing links play a
different tune:

- changing `RULES` weights or the logic in `tune.js`;
- adding, removing or reweighting progression templates;
- changing the order in which the generator draws random numbers;
- adding, removing or reweighting entries in `VARIANTS` (this changes the
  backing only, not the melody).

That's acceptable for a hobby site, but do it knowingly. If links ever need
to be permanent, add a version number to the link format and keep the old
generator around for old links.

**Never use `Math.random()` inside `js/music/`.** Always use the tune's seeded
generator (or one derived from the seed, as `pickVariants` does). The only
legitimate `Math.random()` calls are for picking a new seed (`randomSeed`),
picking the next key, and generating noise in the audio code.

### Timing

- **Schedule on the audio clock, never with `setTimeout`.** Every sound must
  be booked by the scheduler with an explicit `when`.
- **Drive visuals from `takeBeats`,** not from the scheduler's timer.
- **Keep every event on a whole tick** inside the loop (`0 ≤ tick < loopTicks`).
  A test checks this for every pattern.

### Progression templates

Every template must keep the phrase plan the melody generator relies on. The
tests enforce it:

- the opening bars come back exactly halfway through;
- the halfway bar ends on degree 5 or 7 (the half cadence);
- the last bar is degree 1;
- waltz templates have one chord per bar;
- no degree whose chord would be diminished (7 in major; 2 and 6 in dorian
  and minor).

## 5. Common changes

### Add a preset
Add an entry to `PRESETS` in `presets.js`. The id becomes part of tune links,
so pick a readable one and don't rename it later. The key's tonic must be in
`KEY_FAMILIES` for its mode (`theory.js`), or New tune and links won't handle
it. `presets.test.js` checks this.

### Rebalance an instrument's loudness
Change its `trim` in `instruments.js`. Trim multiplies the gain, so 2 is about
6 dB louder than 1. The preset `volume` values position the sliders; change
those only if you want a preset to start with a different mix.

### Add a rhythm variant
1. Add `['name', weight]` to the instrument's style list in `VARIANTS`.
2. Handle the new name in that instrument's pattern function.
3. Add its name and description to `BACKING` in `descriptions.js`.
4. Run the tests. The variety test checks that every variant is reachable and
   that the backing actually varies between tunes.

### Add an instrument
1. Write a voice in `js/audio/voices/` matching the voice interface (§3.2).
2. Write a pattern function in `patterns.js` and add it to `PATTERNS`.
   Give `describeInstrument` in `descriptions.js` a label for it.
3. Add an icon to `icons.js`.
4. Register it in `INSTRUMENTS` (`instruments.js`) with a trim and a reverb
   send.
5. Add its id to `ALL_IDS` in `presets.js` so every preset has a mixer entry
   for it. (`presets.test.js` fails until you do.)
6. Check the CSS grid still lays out sensibly (currently 5 columns on desktop,
   2 on narrow screens).
7. Balance its level against the others by ear, and adjust `trim`.

### Add a style (e.g. a hornpipe)
1. Add it to `STYLES` in `styles.js`. Everything that varies by style (beats,
   bars, lamps, note grid, tempo band, swing, medley length) is read from there.
2. Add progression templates in `progressions.js` (or reuse the reel ones, as
   jigs do).
3. Teach `tune.js` its beat rhythm (see `reelBeat` and `jigBeat`) and which
   positions are strong.
4. Give every instrument in `patterns.js` a branch, and add `VARIANTS` entries
   with matching descriptions in `descriptions.js`.
5. Add a preset that uses it.

The tests loop over every style automatically, so they'll quickly show what's
missing.

### Make melodies sound better
Turn the knobs in `RULES` at the top of `tune.js`, e.g. lower `leapChance`
for smoother lines, or reweight `reelBeat` for more or fewer rolls. Listen to
several tunes per change: one tune proves nothing. Any such change makes the
golden test fail, because old links now play different tunes. When the change
is deliberate, run `node scripts/record-golden.js` and commit the new fixture.

### Regenerate the counting voice
Install `espeak-ng` and `ffmpeg`, run `./scripts/make-voice.sh`, and copy the
printed offsets into `CLIP_OFFSETS` in `instructor.js`. The offsets matter:
they're what puts each word on the beat.

## 6. Testing

```sh
npm test
```

| Suite | What it guards |
|---|---|
| `theory.test.js` | Scales, modes, chord building, MIDI conversions, scale stepping |
| `tune.test.js` | Same seed gives the same tune; bar lengths; range; chord tones on strong beats; home-note endings; note grid per style; template rules |
| `patterns.test.js` | Every pattern stays inside the loop and is sorted; piano bass and chord placement; backing varies between tunes; drum accents on beats; the metronome clicks evenly on every beat; the instructor counts correctly |
| `descriptions.test.js` | Every rhythm variant has a description; every instrument gets a label in every style |
| `state.test.js` | New tune and medley change key within the right family and keep the style; the starting state opens a link; the tune is the only copy of key and style |
| `link.test.js` | Links round-trip to the identical tune; preset vs. style naming; short links; malformed links are rejected |
| `golden.test.js` | The generator still produces exactly the recorded tunes and backing for fixed seeds, so old links still play the same tune |
| `scheduler.test.js` | With a fake audio clock: notes on time and in order; tune switches on bar lines; medley preparation and handover; muting; lamp beats match booked beats; tempo changes; stalls skipped, not burst |
| `presets.test.js` | Every preset covers exactly the registered instruments, with a valid style, key and tempo |

The tunes in tests use fixed seeds across every style and several keys, so
failures are reproducible.

**What isn't automatically tested:** sound quality, loudness balance, and the
lamps lining up with the real audio output. These were checked during development by
running the page in headless Firefox, recording the output, and measuring beat
spacing, lamp timing, and instrument levels. That harness lived in a temporary
folder and isn't part of the repo. If you change the scheduler, the lamp loop,
or the instructor offsets, check by ear with the metronome and instructor on:
each click, each spoken number and each lamp should coincide.

## 7. Browsers and known gaps

- **Tested in Firefox only.** Chrome and Edge should behave the same. Safari is
  the likeliest to differ (it's why the M4A clips exist), so test there before
  relying on it.
- **Background tabs:** browsers slow timers in background tabs. The 100 ms
  lookahead copes in practice, and background playback was confirmed working.
  A long throttle now causes a gap rather than a burst of piled-up notes (the
  scheduler skips overdue ticks); moving the timer into a Web Worker is the
  standard fix if gaps ever become a problem.
- **Crackling after long play (fixed).** In Firefox on macOS, playback used
  to start crackling and popping after several minutes. The cause was the
  sheer number of short-lived audio nodes (see "Keep the number of live audio
  nodes per note small" in §3.2). Pre-rendering notes and disconnecting
  finished nodes fixed it, confirmed by ear. If crackling ever comes back,
  first check whether a new or changed voice is building notes live again:
  count the nodes it creates per second (wrapping the context's `create…`
  methods with a counter, in an `OfflineAudioContext`, works well).
- **Phones:** not yet checked on a mid-range phone. Pre-rendered notes keep the
  load low, but the worst case (all ten instruments in a fast reel) is worth
  trying. Each cached note is a few hundred kilobytes at most, and only the
  pitches a tune uses are rendered.
- **JavaScript MIME type:** hosts must serve `.js` as `text/javascript`, or
  browsers refuse to load modules. `aws.md` covers this for S3.

## 8. Style conventions

- ES modules, no transpiling: write code that current browsers run directly.
- Small modules, each with a header comment explaining its purpose. Comments
  explain why, not what.
- Pure functions for anything musical; side effects only in `main.js`, `ui.js`
  and `audio/`.
- Voices pre-render notes and disconnect finished nodes (`prerender.js`);
  don't build per-note node graphs on the live context except as a fallback.
- Links open in the same tab: no `target="_blank"`.
- Colours are CSS custom properties with light and dark values; add new colours
  the same way.
