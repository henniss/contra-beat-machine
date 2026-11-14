# Contra Beat Machine

A web page that makes up fiddle tunes for contra dancing and plays them with a
synthesized band. Pick a preset, press Play, and switch instruments on and off
while it plays. Four red lamps flash on each dancer step. A readout shows which
part of the tune you're in (A1, A2, B1, B2).

Everything runs in the browser. There is no server, no build step, and no
libraries. Every instrument is synthesized live with the Web Audio API. The
only recordings are four tiny clips of a voice counting "one, two, three,
four".

## Running it locally

The page uses JavaScript modules, which browsers won't load from a
double-clicked file, so serve the folder with any static file server:

```sh
npm run serve        # same as: python3 -m http.server 8000
```

Then open <http://localhost:8000>. Press Play (or the space bar) to start.

## Running the tests

The music logic (scales, chords, tune generation, and accompaniment patterns)
is plain JavaScript with no browser dependencies. It is tested with Node's
built-in test runner:

```sh
npm test
```

## Regenerating the counting voice

The instructor's clips in `assets/voice/` were made with a free text-to-speech
program. To regenerate them, install `espeak-ng` and `ffmpeg` and run:

```sh
./scripts/make-voice.sh
```

The script prints a timing offset for each clip: how long after the clip
starts its vowel begins. Copy those numbers into the offsets table in
`js/audio/voices/instructor.js`, so the vowel lands on the beat.

## How it's organised

| Folder | What's there |
|---|---|
| `js/music/` | Tune generation: random numbers, styles, scales and chords, chord progressions, melodies, and each instrument's accompaniment pattern |
| `js/audio/` | The audio engine (mixing and reverb), the beat scheduler, and one synthesized voice per instrument |
| `js/` | Instruments, presets, app state, the user interface, and the entry point |
| `test/` | Tests for the music logic |

`plan.md` describes the design and the decisions behind it.

## A short guide to contra music

- **Contra dance**: a New England folk dance done in long lines of couples,
  taught and prompted by a caller. Each dance is a sequence of figures that
  repeats over and over.
- **64 beats**: one time through a contra dance takes 64 dancer steps, and every
  tune is built to match: four 16-beat parts called **A1, A2, B1, B2**.
- **AABB**: the tune's A part is played twice, then its B part twice.
- **Reel**: a smooth, driving tune. The fiddle plays four quick notes per step.
- **Jig**: a bouncy tune with a lilt, in 6/8 time. The fiddle plays three notes
  per step.
- **Waltz**: a gentle couples dance in three ("ONE-two-three") that
  traditionally ends the evening. In a waltz, the fourth lamp switches off.
- **Boom-chuck**: the piano or guitar pattern dancers lock onto: a bass note on
  the beat ("boom"), then a short chord between beats ("chuck"). A waltz uses
  "oom-pah-pah" instead.
- **Medley**: bands play a tune about three times, then roll straight into a
  new one. Medley mode does the same (twice through for a waltz).
- **Tempo**: contra dances usually run at 110–122 steps per minute. Beginners
  learn more easily around 100, and waltzes sit around 88–104.
