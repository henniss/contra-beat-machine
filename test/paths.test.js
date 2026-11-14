// The site is served from a folder (https://enniss.net/contra/), so every
// path in it must be relative. A root path like "/js/main.js" would work
// locally and break once deployed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function filesUnder(dir) {
  return readdirSync(join(ROOT, dir), { recursive: true })
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => join(dir, f));
}

const ROOT_PATHS = [
  /\b(?:href|src)\s*=\s*["']\/(?!\/)/,
  /url\(\s*["']?\/(?!\/)/,
  /\bfrom\s*["']\//,
  /\bimport\s*\(\s*["']\//,
  /\bimport\s*["']\//,
];

test('the site uses only relative paths', () => {
  for (const file of ['index.html', ...filesUnder('css'), ...filesUnder('js')]) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    for (const pattern of ROOT_PATHS) {
      assert.doesNotMatch(text, pattern, `${file} has a root path`);
    }
  }
});

test('the check catches root paths', () => {
  const bad = ['<script src="/js/main.js">', "import x from '/js/a.js';", 'background: url(/a.png)'];
  for (const text of bad) assert.ok(ROOT_PATHS.some((p) => p.test(text)), text);
  assert.ok(!ROOT_PATHS.some((p) => p.test('<a href="https://salsabeatmachine.org/">')));
});
