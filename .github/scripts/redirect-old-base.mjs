// Springspot was first Springboard (/springboard/), then Springsboard (/springsboard/),
// and three post slugs carried each name. GitHub Pages has no server-side redirects,
// so for every page under the new base this writes a small page at each old URL that
// forwards to the new one (keeping any query string and #hash). The old path is the
// new path with the new name swapped for the old one in every segment.
// Pages that moved within the new base are listed in MOVED: the old address under the
// new base gets a forwarding page too, and old-name URLs skip straight to the final page,
// so no URL takes more than one hop.
// Usage: node redirect-old-base.mjs <site-dir> <new-base> <site-origin> <old-base>...
//   e.g. node redirect-old-base.mjs _site /springspot https://www.willvinton.com /springboard /springsboard
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const [siteDir, rawNew, origin, ...rawOld] = process.argv.slice(2);
if (!siteDir || !rawNew || !origin || rawOld.length === 0) {
  console.error('Usage: node redirect-old-base.mjs <site-dir> <new-base> <site-origin> <old-base>...');
  process.exit(1);
}
const trim = (b) => b.replace(/^\/+|\/+$/g, '');
const newBase = trim(rawNew);
const oldBases = rawOld.map(trim);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const page = (target) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>This page has moved to Springspot</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(origin.replace(/\/$/, '') + target)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script>
</head><body><p>This page has moved to Springspot. <a href="${esc(target)}">Continue to the new page</a>.</p></body></html>
`;

// Moved pages, as built-file paths under the new base: old → current.
const MOVED = {
  // "What is Springspot?" was /springspot/springspot/ (and /springboard/springboard/).
  'springspot/index.html': 'what-is-springspot/index.html',
};

const files = (await readdir(join(siteDir, newBase), { recursive: true }))
  .map((f) => f.split('\\').join('/'))
  .filter((f) => f.endsWith('.html'));
const url = (rel) => '/' + newBase + '/' + rel.replace(/(^|\/)index\.html$/, '$1');
// [path under the new base, where it should land]
const pages = files.map((rel) => [rel, url(rel)]);
let moved = 0;
for (const [from, to] of Object.entries(MOVED)) {
  // Skipped (not fatal) while the Springspot build predates the move, so the two repos'
  // changes can land in either order.
  if (!files.includes(to) || files.includes(from)) {
    console.warn(`Skipping moved page ${from} -> ${to}: the build doesn't have that move yet`);
    continue;
  }
  moved++;
  pages.push([from, url(to)]);
  const out = join(siteDir, newBase, from);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, page(url(to)));
}
if (moved) console.log(`Wrote ${moved} moved-page redirect(s) under /${newBase}/`);
for (const oldBase of oldBases) {
  for (const [rel, target] of pages) {
    const oldRel = rel.replaceAll(newBase, oldBase);
    const out = join(siteDir, oldBase, oldRel);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, page(target));
  }
  console.log(`Wrote ${pages.length} redirect page(s) from /${oldBase}/ to /${newBase}/`);
}
