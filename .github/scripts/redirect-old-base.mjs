// Springspot was first Springboard (/springboard/), then Springsboard (/springsboard/),
// and three post slugs carried each name. GitHub Pages has no server-side redirects,
// so for every page under the new base this writes a small page at each old URL that
// forwards to the new one (keeping any query string and #hash). The old path is the
// new path with the new name swapped for the old one in every segment.
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

const files = (await readdir(join(siteDir, newBase), { recursive: true }))
  .map((f) => f.split('\\').join('/'))
  .filter((f) => f.endsWith('.html'));
for (const oldBase of oldBases) {
  for (const rel of files) {
    const oldRel = rel.replaceAll(newBase, oldBase);
    const target = '/' + newBase + '/' + rel.replace(/(^|\/)index\.html$/, '$1');
    const out = join(siteDir, oldBase, oldRel);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, page(target));
  }
  console.log(`Wrote ${files.length} redirect page(s) from /${oldBase}/ to /${newBase}/`);
}
