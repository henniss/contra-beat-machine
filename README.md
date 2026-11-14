# Contra Beat Machine

A web page that makes up fiddle tunes for contra dancing and plays them with a
synthesized band. Pick a preset, press Play, and switch instruments on and off
while it plays. Four red lamps flash on each dancer step, and if you want the
beat spelled out, switch on the metronome or the counting voice. A readout shows which
part of the tune you're in (A1, A2, B1, B2).

The address bar always holds a link to the tune that's playing, for example
`/#old-time-breakdown/A-major/1x2k9f`: the preset (or just the style, once
you've changed the band), the key, and the tune number. Open that link later
to hear the same tune again. A shorter link such as `/#celtic-jig` or
`/#celtic-jig/A-dorian` opens that preset with a fresh random tune. Without the
part after `#`, the page starts the default preset with a fresh random tune.

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
| `test/` | Tests for the music logic, the scheduler, presets, links, and relative paths |
| `infra/` | Terraform for hosting on AWS (see `aws.md`) |

`MUSIC.md` explains the musical choices and why they were made, for readers
with no musical background. `CODE.md` is a guide for maintainers: how the code
fits together and how to make common changes. `original-plan.md` is the
original design document and build log, `review-plan.md` the review and
clean-up plan, and `plan.md` the most recent plan (hosting with Terraform).
Hosting is described in `aws.md`, and the Terraform for it is in `infra/`.

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
  new one. Tick the Medley box to do the same (twice through for a waltz);
  it's off by default, so a tune repeats until you press New tune.
- **Tempo**: contra dances usually run at 110–122 steps per minute. Beginners
  learn more easily around 100, and waltzes sit around 88–104.
