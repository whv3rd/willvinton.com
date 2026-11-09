// Springsboard used to be Springboard, served at /springboard/ with three post slugs
// that said "springboard". GitHub Pages has no server-side redirects, so for every
// page under the new base this writes a small page at the old URL that forwards to
// the new one (keeping any query string and #hash).
// Usage: node redirect-old-base.mjs <site-dir> <new-base> <old-base> <site-origin>
//   e.g. node redirect-old-base.mjs _site /springsboard /springboard https://www.willvinton.com
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const [siteDir, rawNew, rawOld, origin] = process.argv.slice(2);
if (!siteDir || !rawNew || !rawOld || !origin) {
  console.error('Usage: node redirect-old-base.mjs <site-dir> <new-base> <old-base> <site-origin>');
  process.exit(1);
}
const trim = (b) => b.replace(/^\/+|\/+$/g, '');
const newBase = trim(rawNew);
const oldBase = trim(rawOld);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let count = 0;
for (const file of await readdir(join(siteDir, newBase), { recursive: true })) {
  if (!file.endsWith('.html')) continue;
  const rel = file.split('\\').join('/');
  // Old path: same place, with the pre-rename spelling in every path segment.
  const oldRel = rel.replaceAll('springsboard', 'springboard');
  const target = '/' + newBase + '/' + rel.replace(/(^|\/)index\.html$/, '$1');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Springboard is now Springsboard</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(origin.replace(/\/$/, '') + target)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script>
</head><body><p>Springboard is now Springsboard. <a href="${esc(target)}">Continue to the new page</a>.</p></body></html>
`;
  const out = join(siteDir, oldBase, oldRel);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html);
  count++;
}
console.log(`Wrote ${count} redirect page(s) from /${oldBase}/ to /${newBase}/`);
