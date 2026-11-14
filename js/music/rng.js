// Seeded random numbers, so a tune can be regenerated exactly from its seed.
// Uses the small "mulberry32" generator: fast, good enough for music.

export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    // items: array of [value, weight]
    weighted(items) {
      const total = items.reduce((sum, [, w]) => sum + w, 0);
      let r = next() * total;
      for (const [value, weight] of items) {
        r -= weight;
        if (r < 0) return value;
      }
      return items[items.length - 1][0];
    },
    chance(probability) {
      return next() < probability;
    },
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 0x100000000);
}
