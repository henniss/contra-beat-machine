# The Music: What It Plays and Why

This report explains the musical decisions behind the Contra Beat Machine. It
assumes no musical background: every term is explained the first time it
comes up. If you do read music, the short version is near the end of each
section.

## 1. The job the music has to do

Contra dance is a New England folk dance. Couples stand in long lines, a
caller teaches a short sequence of moves ("figures"), and then everyone
repeats that sequence over and over, moving along the line each time. The
music isn't background. It's the clock the whole room dances to, so it has to
do three things:

1. **Keep a steady, obvious pulse.** Dancers take one step per beat. If the
   beat is hard to find, people get lost.
2. **Have a predictable length and shape.** The dance figures are written to
   fit the tune exactly, and the caller counts on that.
3. **Sound like the real thing.** Contra is danced to traditional fiddle
   tunes from New England, Ireland and Scotland, Québec, and the Appalachian
   "old-time" tradition.

Nearly every choice below follows from one of those three.

## 2. Beats, bars, and the four lamps

**A beat is one dancer step.** That's the pulse the red lamps flash on, the
metronome clicks on, and the instructor counts.

Musicians group beats into **bars**, short repeating units of time. In a reel
or jig a bar is two beats long, so the four lamps cover two bars: lamp 1
lights on the start of every other bar. Four is the natural count because
dance figures come in 4- and 8-step chunks ("balance and swing" and so on), and
callers count in fours.

**Why lamp 1 is special:** it marks the start of a four-step group, which is
where figures begin, and the instructor says "one" there. The metronome
deliberately doesn't mark it: it plays the same click on every step, so it
gives you the pulse and nothing else.

**The waltz is different.** A waltz has three beats per bar ("ONE-two-three"),
so the fourth lamp switches off and the instructor counts to three. Counting a
waltz in fours would cut across its bars and confuse anyone dancing.

## 3. The shape of a tune: 64 beats, AABB

**Every contra tune is 64 beats long**, split into four 16-beat sections
called **A1, A2, B1, B2**. This is the single most important fact about
contra music: dances are written in 64-beat sequences, so the tune has to
match exactly. The readout under the lamps shows which section you're in,
because callers and dancers think in those terms ("the swing is in B1").

The tune has two halves of melody, called the **A part** and the **B part**.
The band plays the A part twice, then the B part twice. That's called
**AABB form**, and it's what the labels mean: A1 is the first time through
the A part, A2 the second, and so on. In numbers, each part is 8 bars of 2
beats, so A + A + B + B = 32 bars = 64 beats.

**Waltzes** aren't tied to a dance sequence, so they don't have to fit 64
beats. They still use AABB, but each part is 16 bars of three beats, the
usual length for a waltz tune.

**Medley mode.** Real bands play one tune about three times through, then
roll straight into a different tune without stopping. With the Medley box
ticked, the app does the same: a new tune after three times through (two for
a waltz, because one waltz loop already lasts about two minutes). It's off by
default, so the tune keeps repeating until you press New tune.

## 4. The three styles

| Style | What it feels like | Notes per step from the fiddle | Typical tempo |
|---|---|---|---|
| **Reel** | Smooth and driving | 4 | 110–122 steps per minute |
| **Jig** | Bouncy, with a lilt | 3 | 110–122 |
| **Waltz** | Gentle, swaying, for couples | 1 or 2 | 88–104 |

**Reels** are the bread and butter of contra. **Jigs** are the other main
type: the fiddle plays three notes per step instead of four, which gives the
"diddly-diddly" bounce. The beat stays the same, so the lamps work the same
way.

**The waltz** was added because a contra evening traditionally ends with one.

**Tempo.** The slider runs from 70 to 140 steps per minute. Each style marks
its typical range on the slider. For reels and jigs that's 110–122, which is
what most contra bands play; anything below is good for walking through a
dance slowly. Waltzes sit much lower, around 96.

**Swing (reels only).** Fiddlers often play the four quick notes in a step
slightly unevenly: long-short-long-short, rather than perfectly even. That
unevenness is "swing", and it makes the music feel relaxed instead of
mechanical. The presets add a little to reels: slight for the New England
and Québécois presets, more for Old-Time, which is the most "lopsided" of
the styles. Jigs already lilt, and swinging a waltz would just sound sloppy.

## 5. Key and mode: how high, and how happy

**A key** is the home base of a tune: the note it keeps coming back to and
finishes on. Changing the key moves the whole tune up or down while keeping
it recognisably the same, like singing a song in a higher voice. Key names
are just note names: D, G, A and so on.

**A mode** is the flavour of the key:

- **Major** sounds bright and happy. Most New England and old-time tunes are
  major.
- **Dorian** sounds minor-ish, but not sad: darker, a bit wistful, and very
  common in Irish and Scottish tunes. That's why the Celtic Jig preset uses it.
- **Minor** sounds darker still. It's available but no preset starts in it.

**Which keys, and why.** The app only uses keys that fiddles play in
naturally: D, G and A for major tunes; E, A and D for dorian; E, A and B for
minor. A fiddle's four strings are tuned to G, D, A and E, and tunes in these
keys let the player use open strings and ringing notes. Traditional repertoire
sits almost entirely in them, so other keys would sound slightly "off" to
anyone who knows the music.

**New tune changes the key.** Each new tune moves to a different key of the
same kind (a D major tune might be followed by one in G major). Bands often do
exactly this when they change tunes in a medley, because it gives the room a
lift. It also stops the backing instruments landing on exactly the same notes
every time. A preset always starts in its own key.

## 6. How a tune is made up

Every tune is invented on the spot from rules. Nothing is copied from a
recording or a real tune. Each tune comes from a random number (its "seed",
shown on the page as the tune number), and the same seed always gives the
same tune. That's what makes tune links work.

The biggest risk with invented music is that it sounds aimless, like random
notes. The rules below exist to stop that. Each one copies something real
fiddle tunes do.

### 6.1 Chords first

**A chord** is a few notes played together. While the melody (the tune you'd
hum) moves around, the chords form the backdrop behind it, changing about
once a bar. A **chord progression** is the order the chords change in.

Chords are named by numbers, counting up from the home note: **I** is the home
chord (restful, "we're home"), **V** is the chord with the strongest pull back
home (tense, "we're nearly there"), **IV** is a gentle step away, and so on.
Writing them as numbers means the same progression works in any key.

The app picks each part's progression from a small library of patterns
common in folk music, for example:

```
I  I  IV  V  |  I  I  IV-V  I
```

(read: home, home, away, tension, home, home, away-then-tension, home). Every
pattern in the library follows the same plan, which the melody relies on:

- **the opening comes back halfway**, so the second half starts like the
  first;
- **the halfway point ends on a "half cadence"**, an unfinished-sounding stop
  on the tense V chord, like a comma in a sentence;
- **the last bar is the home chord**, the full stop.

The B part usually starts somewhere other than home (often on IV), which is
what makes the B part sound like a new section rather than more of the same.

**In dorian and minor tunes** the V chord is weak (it comes out minor and
doesn't pull home strongly), so modal patterns use **VII** for the half
cadence instead. That's the characteristic sound of many Irish and Scottish
tunes. The library also avoids chords that would come out "diminished", a
tense, unstable chord that folk accompaniment almost never uses.

### 6.2 The melody follows a phrase plan

Fiddle tunes repeat themselves a lot, and that repetition is most of what
makes them sound like fiddle tunes. Each 8-bar part is built from four
2-bar phrases:

1. **A motif**: a short musical idea.
2. **The motif's opening again**, shifted to fit the chords, then a new
   ending that stops on the half cadence. It sounds like a question.
3. **The motif again, unchanged.**
4. **The motif's opening once more**, then an ending that lands firmly on the
   home note. It sounds like the answer.

Waltz parts follow the same plan with 4-bar phrases.

### 6.3 Choosing the notes

- **Strong moments get chord notes.** On the beat (and, in a reel, halfway
  through it), the melody plays one of the notes of the chord underneath.
  That's what makes melody and backing sound like they belong together.
- **The notes in between walk step by step** along the scale (the seven notes
  that belong to the key), heading toward the next strong note. Real fiddle
  tunes move mostly by step, with occasional jumps.
- **Jumps are rare**, and rarer still in waltzes, where slow notes make a
  jump stand out.
- **The melody is pulled toward the middle of its range** so it doesn't drift
  too high or too low.
- **The B part sits higher than the A part**, as it usually does in real
  tunes. It gives the second half more energy.
- **The range** runs from the fiddle's lowest note (the G string) to a
  comfortable height, avoiding the squeaky top end.
- **Each part ends on the home note, held** for a full step, or a whole bar in
  a waltz, so you can hear the part finish.

### 6.4 Melody rhythm

- **Reels** mostly run four even notes per step. Now and then two notes merge
  into one longer note, or a **roll** appears. A roll is a quick three-note
  ornament (the note, the one above it, and back again) that Irish fiddlers
  use constantly.
- **Jigs** mostly run three notes per step, sometimes a long-short pair
  ("dum-da"), which is the classic jig bounce.
- **Waltzes** use one or two notes per beat, mixed with longer held notes,
  for a slower, singing line.

## 7. The band

A contra band has two jobs: someone plays the tune, and everyone else keeps
the rhythm. The rhythm section matters most to dancers, because it's what
they lock their steps onto.

| Instrument | Job | What it plays | Why it's here |
|---|---|---|---|
| **Fiddle** | Tune | The melody. | The core instrument of every contra tradition. |
| **Flute** | Tune | The same melody, often an octave higher (the same notes, but higher). | The Irish wooden flute is a staple of Celtic bands. Playing higher keeps it from muddying the fiddle. |
| **Piano** | Rhythm | **Boom-chuck**: a low note on the beat ("boom"), then a short chord between beats ("chuck"). | The backbone of New England contra bands. Dancers step on the boom. |
| **Guitar** | Rhythm | Strummed chords, down on the beat, up between. | The common rhythm instrument in Celtic and old-time bands. |
| **Banjo** | Rhythm and texture | Old-time **"bum-ditty"**: a note, a brush across the strings, a ringing high "thumb" note. | Defines the Appalachian old-time sound. The thumb note is the banjo's short fifth string, which plays the same high note throughout. |
| **Upright bass** | Bass | The chord's root (the note the chord is named after), alternating with the fifth (the next-strongest note in it), with occasional walks up into the next chord. | Fills out the low end and makes the beat felt in the body. |
| **Bodhrán** | Percussion | An Irish frame drum: a steady stream of strokes, accented on the beat. | The standard Irish percussion. |
| **Feet** | Percussion | Québécois seated foot-tapping, heel-toe "ta-ka". | Québécois fiddlers keep time with their feet while they play. It's a distinctive, joyful sound. |
| **Metronome** | Practice aid | The same click on every step. | For anyone who wants the beat spelled out. Not music. |
| **Instructor** | Practice aid | A voice counting "one, two, three, four" (or "one, two, three" in a waltz). | Same, for people who'd rather hear the count. |

**Left out on purpose:** mandolin, accordion and harmonium appear in contra
bands, but would mostly duplicate the sound of instruments already here.

**In a waltz** every backing pattern gets a softer, sparser version. The piano
plays **oom-pah-pah** (a low note on beat 1, soft chords on beats 2 and 3), the
bass plays longer notes, the drum strikes gently on beat 1 with light brushes
after, and the feet tap heel-toe-toe.

### Backing variety

Real accompanists don't play the identical pattern all night. Each backing
instrument has two or three patterns per style, and each new tune picks one
for its A part and one for its B part (often the same one, because players
tend to settle into a groove). For example:

- **Piano:** plain boom-chuck, boom-chuck with an extra chord pushing into the
  next bar, or a walking left hand that steps into each chord change. In a
  waltz: oom-pah-pah, the chord rippled one note at a time, or a held chord.
- **Guitar:** down-up strumming, boom-chuck, or a busier strum at double
  speed. In a waltz: bass note and two strums, picked notes, or full strums
  on every beat.
- **Bass:** root-and-fifth, a walking line, or root-and-octave (the same note,
  higher). In a waltz: one long note per bar, two notes per bar, or a walk.
- **Banjo:** bum-ditty or a rolling pattern of single notes.
- **Bodhrán and feet:** a steady pattern or a sparser one.

Each instrument card shows the pattern it's playing in the current tune, in
small print under its name (for example "Boom-chuck", or "A: Steady · B:
Sparse" when the two parts differ). Hover over it for a description. The
fiddle and flute show how many notes per beat the style calls for.

This was added after noticing that New tune changed the melody but left the
waltz piano and bass sounding identical. Together with the key change, it
took the waltz piano from 16 possible parts to about 230.

## 8. The presets

Each preset is a snapshot of a recognisable band sound: a style, a key, a
tempo, an amount of swing, and a line-up.

| Preset | Style | Starting key | Tempo | Band | The idea |
|---|---|---|---|---|---|
| **New England Reel** | Reel | D major | 118 | Fiddle, piano, bass, guitar | The classic contra-hall sound: fiddle over driving piano boom-chuck. D is the most common fiddle key. |
| **Celtic Jig** | Jig | E dorian | 112 | Fiddle, flute, guitar, bodhrán | An Irish session sound. E dorian is a classic Irish key, and jigs feel best a touch slower. |
| **Old-Time Breakdown** | Reel | A major | 122 | Fiddle, banjo, guitar, bass | Appalachian drive: fast, bright, with the most swing. A is the old-time fiddler's favourite key. |
| **Québécois Stomp** | Reel | G major | 116 | Fiddle, piano, feet, bass | French-Canadian fiddling with foot-tapping keeping time. |
| **Last Waltz** | Waltz | D major | 96 | Fiddle, flute, piano, bass | The traditional end of a contra evening. |

The metronome and instructor are off in every preset. They're tools you
switch on when you want them.

## 9. Sound: synthesized, not recorded

Every instrument is synthesized in the browser, built from basic waveforms,
noise and filters, rather than played back from recordings. The only
recordings are the four counting words.

**Why:** recorded instruments would sound more realistic, but they need
properly licensed sample libraries, many megabytes of downloads, and a lot of
loading logic. Synthesis keeps the site tiny (about 160 KB) and lets it make
up any note at any time.

**How each one is imitated, in brief:**

- **Fiddle:** two slightly mistuned buzzy tones (the raw sound of a bowed
  string) shaped by filters that mimic a violin body's resonances, with a soft
  bow attack and vibrato that fades in on long notes.
- **Flute:** a nearly pure tone with a puff of breath noise at the start.
- **Piano:** a handful of pure tones stacked the way a struck piano string
  vibrates, with a little hammer click. It's closer to a soft electric piano
  than a concert grand.
- **Guitar, banjo, bass:** a simulated plucked string, made from a burst of
  noise that rings and mellows like a real string. The banjo is brighter and
  dies away faster; the bass is darker and rounder.
- **Bodhrán and feet:** falling low tones with bursts of noise.
- **Metronome:** a short, bright click.

Everything goes through a shared reverb, an echo that suggests a wooden dance
hall, and a gentle volume leveller, so the full band doesn't distort.

**Honest limits:** the fiddle won't fool anyone, and the piano is soft rather
than percussive. That's fine for a practice and backing tool.

## 10. Choices that were rejected

- **Playing real traditional tunes** (such as "Soldier's Joy"). They're out of
  copyright and would sound authentic, but the brief was synthetic music, they
  need careful transcription, and generated tunes never run out.
- **Using the browser's built-in speech for the counting voice.** Its timing
  varies by up to a third of a second between browsers, so the count would
  drift off the beat. Four short recorded clips are timed exactly.
- **Removing the fourth lamp in a waltz** (rather than dimming it). The layout
  would jump whenever the style changed.

## 11. What to adjust if something sounds wrong

These are written for whoever maintains the code; the code report has the
details.

- **A melody sounds aimless:** the weights for note choices and rhythms are
  all in one table in the tune generator. Making jumps rarer or steps more
  likely makes tunes smoother.
- **An instrument is too loud or quiet:** each instrument has a loudness
  setting in the instrument list.
- **Chords sound samey:** add more patterns to the progression library. Each
  must keep the halfway half cadence and end on the home chord.
- **A tempo feels wrong:** each preset sets its own; the typical range for
  each style is in the style table.
