// Rewrites test/fixtures/tunes.json from the current generator.
//
// Only run this after changing the music on purpose: the fixture is what
// keeps old tune links playing the same tune (see CODE.md, "Determinism").
//
//   node scripts/record-golden.js
import { writeFileSync } from 'node:fs';
import { goldenOutput } from './golden.js';

const path = new URL('../test/fixtures/tunes.json', import.meta.url);
writeFileSync(path, `${JSON.stringify(goldenOutput())}\n`);
console.log(`Wrote ${path.pathname}`);
