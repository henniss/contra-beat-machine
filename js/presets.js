// The six starting points from the plan. A preset sets the style, key, tempo,
// swing, and which instruments are on at what volume.

const ALL_IDS = ['fiddle', 'flute', 'piano', 'guitar', 'banjo', 'bass', 'bodhran', 'feet', 'instructor'];

function mixer(on, volumes = {}) {
  return Object.fromEntries(ALL_IDS.map((id) => [id, { enabled: on.includes(id), volume: volumes[id] ?? 0.75 }]));
}

export const PRESETS = [
  {
    id: 'new-england-reel',
    name: 'New England Reel',
    description: 'The classic contra sound: fiddle over driving boom-chuck piano.',
    style: 'reel',
    key: { tonic: 'D', mode: 'major' },
    bpm: 118,
    swing: 0.08,
    mixer: mixer(['fiddle', 'piano', 'bass', 'guitar'], { guitar: 0.6 }),
  },
  {
    id: 'celtic-jig',
    name: 'Celtic Jig',
    description: 'A lilting jig in a minor-ish key, with flute and frame drum.',
    style: 'jig',
    key: { tonic: 'E', mode: 'dorian' },
    bpm: 112,
    swing: 0,
    mixer: mixer(['fiddle', 'flute', 'guitar', 'bodhran'], { flute: 0.65 }),
  },
  {
    id: 'old-time-breakdown',
    name: 'Old-Time Breakdown',
    description: 'Appalachian drive: fiddle and banjo, fast and bright.',
    style: 'reel',
    key: { tonic: 'A', mode: 'major' },
    bpm: 122,
    swing: 0.15,
    mixer: mixer(['fiddle', 'banjo', 'guitar', 'bass'], { guitar: 0.6 }),
  },
  {
    id: 'quebecois-stomp',
    name: 'Québécois Stomp',
    description: 'Fiddle and piano with seated foot-tapping keeping time.',
    style: 'reel',
    key: { tonic: 'G', mode: 'major' },
    bpm: 116,
    swing: 0.08,
    mixer: mixer(['fiddle', 'piano', 'feet', 'bass'], { feet: 0.85 }),
  },
  {
    id: 'beginner-walk-through',
    name: 'Beginner Walk-Through',
    description: 'Slow and steady, with a loud beat and a voice counting along.',
    style: 'reel',
    key: { tonic: 'G', mode: 'major' },
    bpm: 100,
    swing: 0,
    mixer: mixer(['fiddle', 'piano', 'bass', 'instructor'], { fiddle: 0.55, piano: 0.95, bass: 0.8, instructor: 0.9 }),
  },
  {
    id: 'last-waltz',
    name: 'Last Waltz',
    description: 'The traditional end of the evening: a gentle waltz in three.',
    style: 'waltz',
    key: { tonic: 'D', mode: 'major' },
    bpm: 96,
    swing: 0,
    mixer: mixer(['fiddle', 'flute', 'piano', 'bass'], { flute: 0.55, piano: 0.65, bass: 0.65 }),
  },
];

export const DEFAULT_PRESET = PRESETS[0];

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id);
}
