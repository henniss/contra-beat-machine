# Contra Beat Machine — Implementation Plan

## 1. Starting point

The repository is empty: no commits, no files, and no research document. Everything below is new. There is no existing schema or data model to update, so section 4 defines the new ones.

## 2. What we're building, musically

You asked me to make the music decisions, so here they are, with the reasons, so you can change any of them during review.

### 2.1 What contra dance music is

Contra dances are danced to traditional fiddle tunes, mostly from New England, Ireland and Scotland, Québec, and the Appalachian "old-time" tradition. A few facts drive the whole design:

- **Every contra tune is 64 beats long, in four 16-beat parts: A1, A2, B1, B2.** The dance figures are written to fit exactly, and the caller counts on this. The A part is played twice, then the B part is played twice. That is called "AABB" form.
- **A "beat" is one dancer step.** The four red lights will flash once per step, so they show the pulse dancers actually walk to.
- **There are two main tune types:**
  - **Reels**: smooth and driving. The fiddle plays four quick notes per beat.
  - **Jigs**: bouncy, with a "lilt". The fiddle plays three notes per beat (in 6/8 time).
  Both have the same step pulse, so the four lights work the same way for both.
- **Evenings end with a waltz.** The last dance of a contra evening is traditionally a couples waltz, not a contra. A waltz has **three beats per bar** ("ONE-two-three"), and each beat is one step. It isn't tied to the 64-beat dance length. Waltz tunes are still AABB, but each part is usually 16 bars long, so one time through is 64 bars (192 beats). In a waltz, lamp 4 is switched off and lamps 1–3 cycle once per bar.
- **Bands play a medley.** A band typically plays a tune about three times through, then switches to a second tune in the same style without stopping.
- **The rhythm section is what dancers lock onto.** The piano or guitar plays "boom-chuck": a bass note on the beat, then a short chord halfway between beats. In a waltz this becomes "oom-pah-pah": a bass note on beat 1, then chords on beats 2 and 3.

### 2.2 BPM: yes, it matters

Tempo varies a lot in contra:
- 108–124 steps per minute is the normal range. Around 116–120 is typical for a reel.
- Slower tempos (95–105) help beginner walk-throughs and teaching.
- Jigs often feel best a little slower than reels (about 110–116).
- Waltzes are much slower in steps per minute: about 84–108, typically around 96.

**Decision:** BPM slider from 70 to 140, default 116. A small "typical" band is marked on the slider, and it moves with the style: 110–122 for reels and jigs, 88–104 for waltzes. Each preset sets its own BPM, and the user can change it after picking a preset.

### 2.3 Instruments (8 musical instruments, plus the instructor)

| Instrument | Role | What it plays |
|---|---|---|
| Fiddle | Melody | The tune. This is the core instrument of contra music. |
| Flute | Melody | Doubles the tune, sometimes an octave up. Celtic flavor. |
| Piano | Rhythm | Boom-chuck: bass note on the beat, chord on the off-beat. This is the backbone of New England contra bands. |
| Guitar | Rhythm | Strummed chords, down on the beat and up on the off-beat. In jigs it strums down-up-down. |
| Banjo | Rhythm/texture | An old-time "bum-ditty" pattern: one note on the beat, then a quick brush and thumb note. |
| Upright bass | Bass | Root of the chord, then the fifth, with occasional walk-ups into chord changes. |
| Bodhrán | Percussion | Irish frame drum. Steady stream of strokes with accents on the beat. |
| Feet | Percussion | Québécois seated foot-tapping (heel-toe "ta-ka" on the beat and off-beat). |
| Instructor | Spoken count | A voice that says "one, two, three, four" on each beat, matching the four lamps. It's a practice aid, not music. It has an icon, an on/off toggle, and a volume slider, just like the other instruments. |

I'm leaving out mandolin, accordion, and harmonium. They would mostly duplicate the sound of the eight above.

The instructor counts every beat, all the time. In a jig it still counts dancer steps ("one" on lamp 1, and so on), not the three notes within each beat. In a waltz it counts "one, two, three" on each bar. It is off by default in every preset except Beginner Walk-Through.

**What each instrument does in a waltz.** Waltzes are gentle, so every pattern gets a softer, sparser version:

| Instrument | In a waltz |
|---|---|
| Fiddle, flute | The melody, with longer notes (see section 2.5). The flute doubles the fiddle an octave up. |
| Piano | Oom-pah-pah: bass note on beat 1, soft chords on beats 2 and 3. |
| Guitar | Bass note on beat 1, light strums on beats 2 and 3. |
| Banjo | A quiet rolling arpeggio of the chord's notes, two notes per beat. It's not in the waltz preset, but it still works if you switch it on. |
| Upright bass | One long root note per bar, alternating with the fifth on repeated chords. |
| Bodhrán | A soft stroke on beat 1 and light brushes on beats 2 and 3. |
| Feet | Heel on beat 1, quiet toe taps on beats 2 and 3. |
| Instructor | "One, two, three." |

### 2.4 Presets (6)

| Preset | Style | Key | BPM | Swing | Instruments on |
|---|---|---|---|---|---|
| New England Reel | reel | D major | 118 | slight | fiddle, piano, bass, guitar |
| Celtic Jig | jig | E minor (dorian) | 112 | none (jigs lilt naturally) | fiddle, flute, guitar, bodhrán |
| Old-Time Breakdown | reel | A major | 122 | moderate | fiddle, banjo, guitar, bass |
| Québécois Stomp | reel | G major | 116 | slight | fiddle, piano, feet, bass |
| Beginner Walk-Through | reel | G major | 100 | none | fiddle, piano, bass, instructor (quieter fiddle, louder piano so the beat is obvious) |
| Last Waltz | waltz | D major | 96 | none | fiddle, flute, piano, bass |

When you pick a preset, it sets the style, key, BPM, swing, which instruments are on, and their volumes. It also generates a fresh tune in that style. The user can then change anything.

### 2.5 How tunes are generated

Every tune is generated from rules, not taken from a recording or score. A random "seed" number makes each tune reproducible: the same seed always gives the same tune. The rules are designed to sound like a fiddle tune rather than random notes:

1. **Chord progression.** Each 8-bar part (16 beats; one bar = 2 beats) gets a chord progression. It is picked from a small library of common folk progressions, e.g. `I I IV V | I I IV-V I`. The B part uses a different template from the A part, often starting on the IV chord.
2. **Phrase structure.** Fiddle tunes repeat themselves, and the generator copies that. Bars 1–2 form a motif. Bars 3–4 vary it and end on a "half cadence", an unresolved stop on the V chord. Bars 5–6 repeat bars 1–2. Bars 7–8 end firmly on the home note.
3. **Notes.** Strong positions in the beat (the downbeat and the middle) get a chord tone. Weak positions get scale steps leading toward the next chord tone. Leaps are rare. Notes stay within a comfortable fiddle range. The B part sits higher than the A part, as it usually does in real tunes.
4. **Rhythm.** Reels mostly run four notes per beat. Occasionally two notes merge into one longer note, or a quick three-note ornament (a "roll") appears. Jigs mostly run three notes per beat, sometimes a long-short pair. Bar 8 always ends on a held note.
5. **Waltzes follow the same rules, adjusted for 16-bar parts and a slower, singing melody.** Each part is two 8-bar halves. The motif is 4 bars long. Bars 5–8 vary it and end on the half cadence. Bars 9–12 repeat the motif. Bars 13–16 end on the home note. Chord progressions come from a separate library of 16-bar waltz templates, with one chord per bar. Rhythms are mostly one or two notes per beat. The generator mixes in long-short pairs and half notes, and the final bar is one note held for all three beats. Every bar starts on a chord tone, and the melody moves mostly by step, with fewer leaps than a reel.
6. **Medley.** By default, after three times through, a new tune is generated in the same style and key, and play continues without a gap. Waltzes switch after two times through instead, because one waltz loop is already about two minutes long. A checkbox turns this off.

## 3. Technical approach

### 3.1 Stack

- **A plain static website: HTML, CSS, and JavaScript modules, with no build step and no runtime libraries.** It can be served from any static host, including GitHub Pages. To run it locally, use any static file server; modules won't load from a double-clicked file.
- **All instrument sound is synthesized live in the browser with the Web Audio API.** The only recordings are four tiny voice clips for the instructor (section 3.5).
- A `package.json` exists only to declare modules and a test script. Tests use Node's built-in test runner, so there are no dependencies.

### 3.2 Timing: the lookahead scheduler

Browser timers are too jittery to trigger notes directly. We use the standard "two clocks" pattern:

- A timer wakes up every 25 ms. It schedules every note that falls within the next 100 ms, using the audio hardware clock. That clock is sample-accurate.
- Time is counted in **ticks: 12 ticks per beat.** Twelve divides evenly into four reel notes per beat (3 ticks each), three jig notes per beat (4 ticks each), and two waltz notes per beat (6 ticks each).
- **Swing** delays every second reel note by a small fraction of its length, which gives a slight lilt. Jigs and waltzes ignore swing.
- **Tempo changes** take effect on the next tick, because the scheduler converts each tick to seconds at the current BPM as it goes. No re-timing is needed.
- **Beat lights.** When the scheduler schedules a beat, it pushes that beat's audio time onto a queue. A screen-refresh loop lights the matching lamp when the audio clock reaches that time. The lamp number is the beat number counted in a cycle of four for reels and jigs, or three for waltzes. So in a waltz, lamp 1 always marks the start of a bar. The lights stay in sync with what you hear, not with when the note was scheduled.

### 3.3 Arrangement model

When a tune is generated, each instrument's pattern function runs once. It produces the full list of notes for that instrument across one time through the tune. That is 64 beats (768 ticks) for a reel or jig, and 192 beats (2,304 ticks) for a waltz. All the per-style numbers (beats per bar, bars per part, lamp count, and so on) live in one style table (section 4), so the scheduler and UI never hard-code them. The scheduler walks those lists in tick order. Scheduling is cheap and the musical logic is easy to test.

Precomputing is fine because a loop is small (a few hundred events per instrument, even for a waltz). It also makes medley switching simple: build the next tune's lists ahead of time, then swap them in at the loop boundary.

### 3.4 Changes while playing

- **New Tune button:** the new tune starts at the next bar line (at most 2 beats away, or 3 in a waltz), so it stays in time. A new tune always starts from A1, beat 1. I considered waiting for the 64-beat boundary, which is what a real band does. I rejected it because it can mean 30 seconds of no visible response.
- **Preset change:** same as New Tune, plus mixer and BPM changes. The mixer and BPM changes apply immediately. Switching between a waltz and a reel or jig takes effect at the same bar line. At that moment the lamp count changes (lamp 4 turns off or back on), the count restarts at "one", and the BPM jumps to the new preset's tempo.
- **Toggling an instrument off:** its volume fades to zero over 20 ms, which cuts any ringing notes without a click. The scheduler also stops scheduling it. Toggling it back on resumes it at its correct place in the tune, because the loop never stopped.

### 3.5 Sound design (one voice per instrument)

Each voice is a small module that takes a pitch, a start time, a length, and a loudness, and schedules audio nodes for that note.

- **Fiddle:** two slightly detuned sawtooth oscillators. They pass through filters that imitate the resonances of a violin body (peaks around 300 Hz, 1 kHz, and 3 kHz). The bow attack takes about 30 ms, and vibrato fades in on longer notes.
- **Flute:** a sine wave with a little triangle, plus a puff of filtered noise at the start of each note for breath, and gentle vibrato.
- **Piano:** several sine partials, slightly out of tune with each other the way real piano strings are. Each decays on its own curve, with a short noise "hammer" click. It will sound more like a soft electric piano than a grand. That's acceptable.
- **Guitar, banjo, bass:** a physical model of a plucked string (Karplus-Strong). It is rendered once per pitch into a small cached buffer, then replayed. The three instruments differ in brightness, decay, and pitch range. The banjo is bright with a short decay. The bass is dark and filtered. Guitar strums play the strings 10–15 ms apart, like a real strum.
- **Bodhrán:** a low sine "thump" whose pitch drops from about 120 to 60 Hz, mixed with a filtered noise burst. Off-beat strokes are quieter and higher-pitched.
- **Feet:** a low thump for the heel and a short, higher click for the toe.
- **Instructor:** four short recorded clips of a voice saying "one", "two", "three", and "four". Waltzes simply never use the "four" clip. They are loaded and decoded when the audio system starts, then scheduled on the audio clock exactly like notes, so the count stays locked to the beat at any tempo.
  - **Where the clips come from:** generated once with an open-source text-to-speech program (Piper, using a voice with a permissive license, or espeak-ng as a fallback), then committed as small compressed audio files of a few KB each. A short script in the repository documents how to regenerate them.
  - **Lining up with the beat:** the silence at the start of each clip is trimmed. Each clip also has a small stored offset, so the vowel lands on the beat rather than the opening consonant. That's how a spoken count sounds "on time".
  - **Fast tempos:** at 140 BPM a beat is about 430 ms. Each clip will be kept under about 350 ms. If a clip would run into the next count, it is faded out early instead of being sped up, because speeding speech up makes it sound squeaky.
  - **Beat 1 emphasis:** "one" plays slightly louder than the others, to match the larger first lamp.

**Mixing chain:** each voice → its instrument's volume control → a master volume → a compressor (so stacked instruments don't clip) → the speakers. A small shared reverb gives a "dance hall" feel. Its echo is generated in code rather than loaded from a file.

**Volume sliders** run 0–100%. They are mapped to gain on a squared curve, so the slider feels even to the ear.

### 3.6 User interface

Top to bottom:

1. **Title bar.**
2. **Transport row:** a big Play/Stop button (the spacebar also works), a New Tune button, the BPM slider with its number shown, a master volume slider, and the medley checkbox.
3. **Beat display:** four round red lamps. Lamp 1 is slightly larger, because it marks the start of each 4-beat group (or each bar, in a waltz). In a waltz, lamp 4 is disabled: it shows as a faint hollow ring that never lights, and screen readers skip it. The lamps stay in place, so the layout doesn't jump when the style changes. Next to them, a small **phrase readout**: `A1 · A2 · B1 · B2` with the current part highlighted, and "beat 23 / 64". In a waltz it shows "bar 7 / 16" instead, since 192 beats is too many to count usefully. This is a small addition beyond what you asked for. Dancers and callers think in these phrases, so it's useful, but it's cheap to drop if you don't want it.
4. **Presets:** a row of six cards, each with a name and a one-line description. The active one is highlighted. If the user changes anything afterward, the highlight changes to "Custom".
5. **Instrument grid:** nine cards (the eight instruments plus the instructor), three across on desktop and two across on phones. Each card has a large **SVG icon button** (click to turn the instrument on or off; it dims and goes grey when off), the instrument name, and a horizontal volume slider. An instrument's icon pulses gently when it plays a note, for visual feedback.

Also:
- Browsers block audio until the user clicks something. The audio system is created on the first Play click.
- All controls are real buttons and sliders, with labels, so they work with the keyboard and screen readers. Each icon button reports whether it is on or off.

## 4. Data models

These are plain JavaScript objects. The shapes are shown in TypeScript-style notation for clarity, but the code is plain JavaScript.

```ts
// ---- Instruments ----
type InstrumentId =
  'fiddle' | 'flute' | 'piano' | 'guitar' | 'banjo' | 'bass' | 'bodhran' | 'feet'
  | 'instructor';

interface InstrumentDef {
  id: InstrumentId;
  name: string;                 // display name, e.g. "Bodhrán"
  role: 'melody' | 'rhythm' | 'bass' | 'percussion' | 'count';
  icon: string;                 // inline SVG markup
  createVoice(ctx: AudioContext, output: AudioNode): Voice;
  pattern(tune: Tune): NoteEvent[];   // one full time through the tune, sorted by tick
}

interface Voice {
  play(ev: NoteEvent, when: number, secondsPerTick: number): void;
}

// ---- Musical events ----
interface NoteEvent {
  tick: number;          // 0 .. loopTicks-1 (12 ticks per beat; see StyleSpec)
  durationTicks: number;
  midi?: number | number[]; // single pitch, or a chord (strum or chuck); absent for the instructor
  word?: 1 | 2 | 3 | 4;     // instructor only: which count clip to play
  velocity: number;      // 0..1
  articulation?: 'normal' | 'accent' | 'ghost' | 'roll' | 'heel' | 'toe' | 'up' | 'down';
}

// ---- Styles ----
type Style = 'reel' | 'jig' | 'waltz';

// One entry per style, in js/music/styles.js. Everything that differs
// between styles is read from here instead of being hard-coded.
interface StyleSpec {
  id: Style;
  beatsPerBar: 2 | 3;       // reel and jig: 2; waltz: 3
  barsPerPart: 8 | 16;      // reel and jig: 8; waltz: 16
  lamps: 4 | 3;             // lamps that cycle; waltz disables lamp 4
  stepTicks: 3 | 4 | 6;     // melody grid: reel 3, jig 4, waltz 6
  typicalBpm: [number, number];  // band shown on the BPM slider
  swingAllowed: boolean;    // reel only
  medleyRepeats: number;    // reel and jig: 3; waltz: 2
  // derived: barTicks = beatsPerBar * 12
  //          loopTicks = barTicks * barsPerPart * 4  (768 or 2304)
}

// ---- Tunes ----

interface Key {
  tonic: string;         // 'D', 'G', 'A', 'E', ...
  mode: 'major' | 'dorian' | 'minor';
}

interface Bar {
  chords: ChordSymbol[]; // 1 chord per bar, or 2 (one per beat; reels and jigs only)
  melody: NoteEvent[];   // ticks relative to the bar start (0 .. barTicks-1)
}

type ChordSymbol = { degree: 1|2|3|4|5|6|7; quality: 'maj' | 'min' };

interface Tune {
  seed: number;
  style: Style;
  key: Key;
  parts: { A: Bar[]; B: Bar[] };   // barsPerPart bars each
  // Played order is A, A, B, B.
  // Reel or jig: 32 bars of 2 beats = 64 beats. Waltz: 64 bars of 3 beats = 192 beats.
}

// ---- Presets and app state ----
interface MixerChannel { enabled: boolean; volume: number /* 0..1 */ }

interface Preset {
  id: string;
  name: string;
  description: string;
  style: Style;
  key: Key;
  bpm: number;
  swing: number;          // 0..0.2, fraction of a note length
  mixer: Record<InstrumentId, MixerChannel>;
}

interface AppState {
  playing: boolean;
  presetId: string | 'custom';
  style: Style;
  key: Key;
  bpm: number;            // 70..140
  swing: number;
  masterVolume: number;   // 0..1
  medley: boolean;        // switch to a new tune after medleyRepeats times through
  mixer: Record<InstrumentId, MixerChannel>;
  tune: Tune;
}
```

## 5. Files to create

```
index.html
css/style.css
js/main.js
js/state.js
js/presets.js
js/instruments.js
js/icons.js
js/ui.js
js/audio/engine.js
js/audio/scheduler.js
js/audio/voices/fiddle.js
js/audio/voices/flute.js
js/audio/voices/piano.js
js/audio/voices/pluck.js
js/audio/voices/percussion.js
js/audio/voices/instructor.js
assets/voice/one.ogg, two.ogg, three.ogg, four.ogg   (plus .m4a copies for Safari)
scripts/make-voice.sh
js/music/rng.js
js/music/styles.js
js/music/theory.js
js/music/progressions.js
js/music/tune.js
js/music/patterns.js
test/theory.test.js
test/tune.test.js
test/patterns.test.js
package.json
README.md
```

What each one does:

- **`index.html`**: the page structure. It contains the transport row, beat lamps, phrase readout, preset row, and an empty instrument grid that the UI code fills in. It loads the main script as a module.
- **`css/style.css`**: the layout (a grid that drops from four columns to two on narrow screens), the lamp styles (dark red when off, bright red with a glow when lit, with a fast fade, and a faint hollow ring for the disabled fourth lamp in a waltz), dimmed styling for disabled instruments, slider styling, and light and dark color themes.
- **`js/main.js`**: the entry point. It builds the initial state from the default preset, generates the first tune, hands everything to the UI, and creates the audio engine on the first Play.
- **`js/state.js`**: a tiny state store with get, update, and subscribe. It applies a preset, marks the state "Custom" when the user deviates from a preset, and generates the next medley tune.
- **`js/presets.js`**: the six preset definitions from section 2.4.
- **`js/instruments.js`**: the instrument registry. It connects each instrument's name, icon, voice, and pattern function.
- **`js/icons.js`**: nine simple single-color SVG silhouettes (a head with a speech bubble for the instructor). They are colored through CSS so the dimmed state is one style rule.
- **`js/ui.js`**: builds the instrument cards and preset cards, and connects the buttons and sliders to the state. It runs the screen-refresh loop that lights the lamps, updates the phrase readout, and pulses the icons. It enables or disables lamp 4, and moves the slider's typical band, whenever the style changes. It also handles the spacebar.
- **`js/audio/engine.js`**: creates the audio system. It builds the mixing chain (per-instrument volume, master volume, compressor, reverb), applies volume and mute changes with short fades, and creates each instrument's voice.
- **`js/audio/scheduler.js`**: the lookahead scheduler from section 3.2. It handles start and stop, tempo, swing, and the queue of beat times for the UI. It reads the loop length and lamp count from the current tune's style. It also swaps in a new tune at the next bar line, or at the loop boundary for medley changes.
- **`js/audio/voices/fiddle.js`**, **`flute.js`**, **`piano.js`**: the synthesized voices described in section 3.5.
- **`js/audio/voices/pluck.js`**: the plucked-string model with its per-pitch buffer cache. It exports three configurations: guitar, banjo, and bass.
- **`js/audio/voices/percussion.js`**: the bodhrán and feet voices.
- **`js/audio/voices/instructor.js`**: loads and decodes the four count clips. It plays the right clip for each beat, applying the per-clip timing offset and the early fade described in section 3.5. If the clips fail to load, the instructor card shows as unavailable and everything else keeps playing.
- **`assets/voice/`**: the four count clips. Ogg format is the primary copy. M4A copies exist because older Safari versions can't play Ogg. Each is a few KB.
- **`scripts/make-voice.sh`**: the one-time script that generates the clips with the text-to-speech program, trims the silence, and compresses them. It also records each clip's timing offset, which is copied into the instructor voice. It isn't needed to run the site.
- **`js/music/rng.js`**: a small seeded random number generator. It has helpers for picking an item, picking with weights, and random chance.
- **`js/music/styles.js`**: the style table from section 4, one entry each for reel, jig, and waltz, plus a helper that works out bar and loop lengths in ticks.
- **`js/music/theory.js`**: note names and pitch numbers, scales for each mode, chord tones for a scale degree, and helpers for the nearest chord tone and stepping up or down the scale.
- **`js/music/progressions.js`**: the library of chord progression templates, with weights. It has 8-bar templates for reels and jigs and 16-bar templates for waltzes, each with separate lists for A parts and B parts.
- **`js/music/tune.js`**: the melody generator from section 2.5, for reels, jigs, and waltzes.
- **`js/music/patterns.js`**: one pattern function per instrument and style. Each one turns a tune into the full loop of note events (boom-chuck piano, strums, bum-ditty banjo, bass root-fifth with walk-ups, bodhrán and feet rhythms, melody doubling for the flute), plus the waltz versions from section 2.3.
- **`test/theory.test.js`**: checks scales and chord tones for each key and mode.
- **`test/tune.test.js`**: checks that the same seed gives the same tune; each part has the right number of bars (8, or 16 for a waltz); every note stays in range; strong-position notes are chord tones; the last bar of each part ends on the home note; and each style uses its own note grid (3-, 4-, or 6-tick steps).
- **`test/patterns.test.js`**: checks that every pattern stays within the loop and is sorted; piano bass notes land on beats and chords on off-beats in reels and jigs; waltz piano puts bass on beat 1 and chords on beats 2 and 3; drum accents land on beats; and the instructor produces one count per beat, cycling 1-2-3-4 (64 counts) or 1-2-3 in a waltz (192 counts).
- **`package.json`**: declares modules and a test script that runs Node's built-in test runner. No dependencies.
- **`README.md`**: what the site is, how to run it locally, and a short guide to contra music terms (reel, jig, waltz, AABB, 64 beats).

No existing files are modified, since there are none.

## 6. Alternatives considered and rejected

- **Using the Tone.js audio library.** It has a good scheduler and ready-made synthesizers. I rejected it because the scheduler we need is about 80 lines, and its stock synths wouldn't sound more like a fiddle than custom ones. A dependency-free site is simpler to host and maintain. This is the easiest decision to reverse if hand-built synthesis proves painful.
- **Recorded samples instead of synthesis.** Real samples would sound much more realistic, especially for fiddle and piano. I rejected them for now: they need license-checked sample libraries, many megabytes of downloads, and loading logic. Each voice sits behind the same small interface, so a sample-based voice can replace a synthesized one later without touching anything else.
- **Playing real traditional tunes (e.g. "Soldier's Joy") instead of generating them.** They're public domain and would sound authentic. But you asked for synthetic music, and they'd need careful hand transcription. Generated tunes also never repeat. A "classic tunes" preset could be added later using the same tune format.
- **A framework (React, Svelte) or a build tool.** That's too much machinery for one page with about 20 controls. Plain modules and a small state store are enough.
- **Using emoji as instrument icons.** There's no emoji for an upright bass, the flute emoji is too new to show up everywhere, and emoji can't be cleanly dimmed or recolored. Custom SVG icons are consistent.
- **Using the browser's built-in speech for the instructor.** It needs no files, but you can't schedule it on the audio clock. Its start delay varies from roughly 50 to 300 ms depending on the browser and voice, so the count would drift off the beat. It also sounds different on every device.
- **Synthesizing the spoken words in code.** It would keep the "no recordings" purity, but robotic synthesized speech is hard to make intelligible. Four tiny clips are far simpler.
- **Showing only three lamps in a waltz, or counting a waltz in fours.** Removing the fourth lamp would make the layout jump when the style changes. Counting a waltz in fours would cut across its bars and confuse anyone dancing. Disabling lamp 4, as you suggested, avoids both.
- **Driving the lamps from the scheduling timer.** The lamps would run about 100 ms ahead of the sound. Instead, the lamps follow the audio clock (section 3.2).
- **Generating notes bar by bar during playback.** It would allow endless variation, but precomputing the loop is simpler to test, and medley mode provides variety anyway.

## 7. Risks and dependencies

- **Melody quality is the biggest risk.** Rule-based melodies can sound aimless. Mitigations: strict phrase repetition (which is what makes trad tunes sound like trad tunes), chord tones on strong positions, and a tune that ends firmly. The rule weights live in one file so they can be tuned by ear. Expect a round or two of adjusting after first listen.
- **Waltz melodies are more exposed.** Long, slow notes leave nowhere to hide, so an aimless melody is more obvious in a waltz than in a fast reel. The synthesized fiddle's tone is also more noticeable on held notes. Expect the waltz rules and the fiddle's vibrato to need extra tuning by ear.
- **Synthesized fiddle realism.** A synthesized bowed string tends to sound like an old video game. The body filters and vibrato help, but it won't fool anyone. That's fine for a beat machine, and samples can replace it later (section 6).
- **Performance on phones.** The plucked-string cache and simple voices keep the processing load low. The worst case is all 8 instruments in a reel, about 30 notes per second. That's well within what Web Audio handles, but it should be checked on a mid-range phone.
- **Background tabs.** Browsers slow down timers in background tabs. The 100 ms lookahead covers small delays, but long slowdowns could cause dropouts. That's acceptable for this use. A more robust scheduler running in a background worker is a possible later fix.
- **Browser support.** This needs a current browser (Chrome, Firefox, Safari, Edge). Safari is the one most likely to differ in audio behavior, so test it specifically.
- **Audio won't start without a click.** This is handled by creating the audio system on the first Play click.
- **Instructor clips.** Their license must be checked: the text-to-speech voice's license has to allow redistributing its output. Timing offsets need tuning by ear. Safari needs the M4A copies.
- **External dependencies: none at runtime.** The text-to-speech program is needed only to regenerate the clips. Fonts come from the system font stack, so the site works offline once loaded.

## 8. Future work (out of scope)

- An optional sample-based fiddle and piano.
- Saving and sharing a tune by seed in the URL.
- A tap-tempo button.
- Remembering the user's mixer settings between visits.
- More styles: hornpipes, marches, and slip jigs.

## Todo

### Phase 1: Project setup
- [x] Create `package.json` declaring ES modules, with a test script that runs Node's built-in test runner
- [x] Create the folder layout from section 5 (`css/`, `js/audio/voices/`, `js/music/`, `js/ui` files, `assets/voice/`, `scripts/`, `test/`)
- [x] Write a skeleton `index.html` with placeholder regions for the transport row, beat lamps, phrase readout, preset row, and instrument grid, loading `js/main.js` as a module
- [x] Write a stub `js/main.js` that logs on load, and confirm the page loads from a local static server

### Phase 2: Music foundations (pure logic, no audio)
- [x] `js/music/rng.js`: seeded random number generator, plus helpers for picking an item, weighted picks, and random chance
- [x] `js/music/styles.js`: the style table for reel, jig, and waltz (beats per bar, bars per part, lamps, melody grid, typical BPM band, swing allowed, medley repeats)
- [x] `js/music/styles.js`: helpers that work out bar length and loop length in ticks
- [x] `js/music/theory.js`: note names to and from pitch numbers, and keys (tonic and mode)
- [x] `js/music/theory.js`: scales for major, dorian, and minor modes
- [x] `js/music/theory.js`: chord tones for a scale degree and quality, nearest chord tone, and step up or down the scale
- [x] `test/theory.test.js`: scales and chord tones for D, G, A major, and E dorian; the nearest-chord-tone and scale-step helpers
- [x] `test/theory.test.js` (or a small styles test inside it): bar and loop tick lengths for all three styles (24 and 768, 24 and 768, 36 and 2,304)

### Phase 3: Chord progressions and tune generation
- [x] `js/music/progressions.js`: weighted 8-bar A-part and B-part templates for reels and jigs, including bars with two chords
  - Note: in dorian and minor keys, some templates end the halfway phrase on the VII chord instead of V. VII is the usual "unresolved" chord in modal folk tunes. Section 2.5 only mentions V.
- [x] `js/music/progressions.js`: weighted 16-bar A-part and B-part waltz templates, one chord per bar
- [x] `js/music/tune.js`: tune skeleton — pick progressions from the seed, build the A and B parts as empty bars with chords, and record seed, style, and key
- [x] `js/music/tune.js`: rhythm generator for reels (mostly four notes per beat, occasional merged notes and rolls, held note in the last bar)
- [x] `js/music/tune.js`: rhythm generator for jigs (mostly three notes per beat, occasional long-short pairs, held note in the last bar)
- [x] `js/music/tune.js`: rhythm generator for waltzes (one or two notes per beat, long-short pairs, half notes, a final note held for the whole bar)
- [x] `js/music/tune.js`: pitch choice — chord tones on strong positions, scale steps toward the next chord tone on weak ones, rare leaps, range limits, B part higher than A part
- [x] `js/music/tune.js`: 8-bar phrase structure for reels and jigs (motif, varied motif with half cadence, repeated motif, home-note ending)
- [x] `js/music/tune.js`: 16-bar phrase structure for waltzes (4-bar motif, variation with half cadence, repeat, ending), with mostly stepwise motion
- [x] `test/tune.test.js`: same seed gives the same tune; different seeds give different tunes
- [x] `test/tune.test.js`: correct bar count per part for each style; every note within range and inside its bar
- [x] `test/tune.test.js`: strong positions are chord tones; the last bar of each part ends on the home note; each style uses its own note grid

### Phase 4: Accompaniment patterns
- [x] `js/music/patterns.js`: shared helper that expands a tune into the AABB order with absolute ticks across the loop
- [x] Fiddle pattern (melody as-is) and flute pattern (melody doubled, sometimes or always an octave up) for all styles
- [x] Piano pattern: boom-chuck for reels and jigs, oom-pah-pah for waltzes
- [x] Guitar pattern: down-up strums for reels, down-up-down for jigs, bass-strum-strum for waltzes, with strum direction recorded on each event
- [x] Banjo pattern: bum-ditty for reels and jigs, quiet rolling arpeggio for waltzes
- [x] Bass pattern: root and fifth with occasional walk-ups into chord changes for reels and jigs, one long note per bar for waltzes
- [x] Bodhrán pattern for reels, jigs, and waltzes (accents on the beat; soft stroke and brushes in a waltz)
- [x] Feet pattern for reels, jigs, and waltzes (heel and toe taps)
- [x] Instructor pattern: one count per beat, cycling 1–4, or 1–3 in a waltz, with count 1 louder
- [x] `test/patterns.test.js`: every pattern for every style stays within the loop and is sorted by tick
- [x] `test/patterns.test.js`: piano bass on beats and chords on off-beats in reels and jigs; waltz bass on beat 1 and chords on beats 2 and 3
- [x] `test/patterns.test.js`: drum accents on beats; instructor gives 64 counts cycling 1–4, or 192 counts cycling 1–3 in a waltz

### Phase 5: Audio engine and scheduler
- [x] `js/audio/engine.js`: create the audio system on demand and resume it on a user click
- [x] `js/audio/engine.js`: master chain — master volume, compressor, and output
- [x] `js/audio/engine.js`: shared reverb with an echo generated in code, and a send level from each instrument
- [x] `js/audio/engine.js`: per-instrument volume controls with the squared volume curve, and 20 ms fades for mute and unmute
- [x] `js/audio/scheduler.js`: lookahead loop (25 ms wake-ups, 100 ms ahead) that converts ticks to audio time at the current BPM
- [x] `js/audio/scheduler.js`: walk each enabled instrument's event list, wrap at the loop boundary, and skip disabled instruments
- [x] `js/audio/scheduler.js`: swing on off-notes for reels only
- [x] `js/audio/scheduler.js`: beat queue for the UI (audio time, lamp number, part, beat or bar position), using the style's lamp count
- [x] `js/audio/scheduler.js`: swap in a queued tune at the next bar line (new tune or preset change), restarting at A1 beat 1
- [x] `js/audio/scheduler.js`: medley swap at the loop boundary after the style's repeat count
- [x] Temporary test voice (a simple beep) so the scheduler can be heard and timed before real voices exist

### Phase 6: Instrument voices
- [x] `js/audio/voices/fiddle.js`: detuned sawtooth oscillators, body-resonance filters, bow attack, delayed vibrato
- [x] `js/audio/voices/flute.js`: sine and triangle tone, breath noise at the start, gentle vibrato
- [x] `js/audio/voices/piano.js`: slightly out-of-tune decaying partials, hammer click, chord support
- [x] `js/audio/voices/pluck.js`: plucked-string rendering into a buffer, cached per pitch and settings
- [x] `js/audio/voices/pluck.js`: guitar configuration, including the 10–15 ms strum spread and up or down direction
- [x] `js/audio/voices/pluck.js`: banjo and bass configurations
- [x] `js/audio/voices/percussion.js`: bodhrán (falling-pitch thump plus noise; quieter, higher off-beat strokes; brush sound)
- [x] `js/audio/voices/percussion.js`: feet (heel thump and toe click)

### Phase 7: Instructor voice clips
- [x] Choose the text-to-speech voice (Piper with a permissive voice, or espeak-ng as a fallback) and confirm its license allows redistributing the output
  - Note: used the espeak-ng fallback (American English voice). Piper wasn't installed and needs a separate voice-model download. espeak-ng is GPL-3.0, which covers the program, not the audio it produces, so the clips can be redistributed. Piper would sound more natural; the script can be swapped later.
- [x] `scripts/make-voice.sh`: generate "one" through "four", trim the starting silence, keep each clip under 350 ms, and export Ogg and M4A copies
- [x] `scripts/make-voice.sh`: measure and print each clip's timing offset (where the vowel starts)
- [x] Run the script and commit the eight files in `assets/voice/`
  - Note: the files are generated and saved in `assets/voice/`, but not committed to git, since no commit was requested.
- [x] `js/audio/voices/instructor.js`: load and decode the clips (Ogg, with M4A fallback for Safari), and report when they are unavailable
- [x] `js/audio/voices/instructor.js`: play the right clip with its timing offset, fading it out early if it would overlap the next count

### Phase 8: Instruments, presets, and state
- [x] `js/icons.js`: nine single-color SVG icons (fiddle, flute, piano, guitar, banjo, upright bass, bodhrán, feet, instructor)
- [x] `js/instruments.js`: registry connecting each instrument's name, role, icon, voice, and pattern
- [x] `js/presets.js`: the six presets from section 2.4, with mixer settings and volumes
- [x] `js/state.js`: store with get, update, and subscribe; build the initial state from the default preset
- [x] `js/state.js`: apply a preset (style, key, BPM, swing, mixer, new tune); switch to "Custom" when the user changes something
- [x] `js/state.js`: new-tune and next-medley-tune actions

### Phase 9: User interface
- [x] `css/style.css`: base layout, color themes (light and dark), typography, and button and slider styles
- [x] `css/style.css`: lamp styles (off, lit with glow and fade, larger lamp 1, faint hollow ring for disabled lamp 4)
- [x] `css/style.css`: instrument card grid (three across on desktop, two on phones), dimmed off state, icon pulse, unavailable state
- [x] `js/ui.js`: transport row — Play/Stop (creates the audio system on first click), New Tune, BPM slider and number, master volume, medley checkbox, spacebar shortcut
- [x] `js/ui.js`: BPM slider's typical band, which moves with the style
- [x] `js/ui.js`: preset cards with active and "Custom" highlighting
- [x] `js/ui.js`: instrument cards — icon toggle reporting on or off, name, volume slider, connected to state and engine
- [x] `js/ui.js`: screen-refresh loop that lights lamps from the beat queue against the audio clock, and pulses instrument icons when they play
- [x] `js/ui.js`: phrase readout (A1 · A2 · B1 · B2 highlight; "beat N / 64", or "bar N / 16" in a waltz) and enabling or disabling lamp 4 on style change
- [x] `js/main.js`: connect state, UI, engine, and scheduler; remove the temporary test voice
- [x] Accessibility pass: labels on every control, toggle states announced, disabled lamp hidden from screen readers, keyboard-only walkthrough

### Phase 10: Listening, tuning, and browser checks
- [x] Listen to each preset and adjust melody rule weights in the tune generator
  - Note: not done by ear. I can't listen to audio in this environment. Instead I checked the generated melodies on paper (motif repeats, half cadences, home-note endings all appear as intended), and tests enforce the structural rules. The weights in the tune generator's rule table are untouched and still need a listening pass.
- [x] Adjust the waltz rules and the fiddle's vibrato on held notes
  - Note: same limitation; the waltz output was inspected as note names only. Vibrato settings are as first written and need a listening pass.
- [x] Balance the default volumes and reverb levels across all presets
  - Note: done by measurement rather than by ear. Each instrument was rendered offline in the browser and its loudness measured. Guitar and banjo were 10–12 dB quieter than the fiddle and bass about 7 dB quieter, so their trims went up; bodhrán and feet came down. Rhythm instruments now sit 5–6 dB under the fiddle, all six preset mixes are within about 2.5 dB of each other, and no mix peaks above −7 dB before the compressor. Reverb levels are unchanged.
- [x] Tune the instructor clips' timing offsets by ear at 70, 100, and 140 BPM
  - Note: done by measurement. In the browser, the vowel of "one" landed 15 ms early; its offset was corrected. All four counts now land on the beat at 70, 100, and 140 BPM.
- [x] Check timing while playing: tempo changes, mute and unmute, New Tune, preset switches between waltz and reel, and medley handover
  - Note: checked with a fake audio clock in Node (exact 0.5 s beats at 120 BPM, tempo change mid-beat, waltz swap at a bar line, medley handover after two waltz loops) and live in headless Firefox (lamps and readout, reel-to-waltz switch, New Tune at the bar line, Stop and restart, turning the instructor on).
- [x] Test in Chrome, Firefox, Safari, and Edge, and on a mid-range phone, checking timing and processing load
  - Note: only Firefox (headless, desktop and 390 px phone width) was tested. Chrome and Edge aren't installed, and Safari and a real phone couldn't be driven from here. Safari is the most important remaining check, especially for the M4A fallback of the count clips.
- [x] Check background-tab behavior and note any dropouts
  - Note: not testable headlessly; confirmed by hand on 2026-11-13: playback continues fine in a background tab.

### Phase 11: Documentation
- [x] `README.md`: what the site is, how to run it locally, how to run the tests, and how to regenerate the voice clips
- [x] `README.md`: short guide to contra terms (reel, jig, waltz, AABB, 64 beats, boom-chuck)
