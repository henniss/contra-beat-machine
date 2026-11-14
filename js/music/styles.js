// Everything that differs between reels, jigs, and waltzes lives here, so the
// generator, scheduler, and UI read it instead of hard-coding beat counts.

export const TICKS_PER_BEAT = 12;

export const STYLES = {
  reel: {
    id: 'reel',
    name: 'Reel',
    beatsPerBar: 2,
    barsPerPart: 8,
    lamps: 4,
    stepTicks: 3,
    typicalBpm: [110, 122],
    swingAllowed: true,
    medleyRepeats: 3,
  },
  jig: {
    id: 'jig',
    name: 'Jig',
    beatsPerBar: 2,
    barsPerPart: 8,
    lamps: 4,
    stepTicks: 4,
    typicalBpm: [110, 122],
    swingAllowed: false,
    medleyRepeats: 3,
  },
  waltz: {
    id: 'waltz',
    name: 'Waltz',
    beatsPerBar: 3,
    barsPerPart: 16,
    lamps: 3,
    stepTicks: 6,
    typicalBpm: [88, 104],
    swingAllowed: false,
    medleyRepeats: 2,
  },
};

// Parts are played A, A, B, B.
export const PART_ORDER = ['A', 'A', 'B', 'B'];
export const PART_LABELS = ['A1', 'A2', 'B1', 'B2'];

export function styleSpec(style) {
  const spec = STYLES[style];
  if (!spec) throw new Error(`Unknown style: ${style}`);
  return spec;
}

export function barTicks(style) {
  return styleSpec(style).beatsPerBar * TICKS_PER_BEAT;
}

export function partTicks(style) {
  return barTicks(style) * styleSpec(style).barsPerPart;
}

export function loopTicks(style) {
  return partTicks(style) * PART_ORDER.length;
}

export function loopBeats(style) {
  return loopTicks(style) / TICKS_PER_BEAT;
}
