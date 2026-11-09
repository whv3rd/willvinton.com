// Springspot is written for the domain root ("/score", "/blog/..."), but here it is
// served from /springspot/. Astro's `base` only prefixes the assets it bundles, so
// this rewrites every remaining root-relative href/src/action in the built output.
// Usage: node prefix-base.mjs <dist-dir> <base>   e.g. node prefix-base.mjs dist /springspot
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [dir, rawBase] = process.argv.slice(2);
if (!dir || !rawBase) {
  console.error('Usage: node prefix-base.mjs <dist-dir> <base>');
  process.exit(1);
}
const base = '/' + rawBase.replace(/^\/+|\/+$/g, '');
const assets = base.slice(1) + '/_astro/';

// Root-relative only: skips protocol-relative "//host" and assets Astro already prefixed.
const attr = new RegExp(
  `(\\s(?:href|src|action)=["'])/(?!/|${assets.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
  'g',
);

let changed = 0;
for (const file of await readdir(dir, { recursive: true })) {
  if (!/\.(html|xml)$/.test(file)) continue;
  const path = join(dir, file);
  const before = await readFile(path, 'utf8');
  const after = before.replace(attr, `$1${base}/`);
  if (after !== before) {
    await writeFile(path, after);
    changed++;
  }
}
console.log(`Prefixed root-relative links with ${base}/ in ${changed} file(s)`);
