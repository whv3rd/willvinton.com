// Writes the site's sitemap index at <site-dir>/sitemap.xml (the address robots.txt and
// Search Console use). It lists:
//   /sitemap-pages.xml       willvinton.com's own pages, written here
//   /springspot/sitemap.xml  Springspot's pages, written by its build (when it has one)
// A page is listed only if it has a canonical URL on this site and isn't noindex, so the
// moved-page and 404 pages stay out. No lastmod for these hand-edited pages: a build date
// would claim a change every day, and search engines learn to ignore a lastmod like that.
// Springspot's sitemap carries real lastmod dates for its posts. Run after the site is assembled.
// Usage: node build-sitemap.mjs <site-dir> <origin> [sub-sitemap...]
//   e.g. node build-sitemap.mjs _site https://www.willvinton.com springspot/sitemap.xml
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [siteDir, rawOrigin, ...subs] = process.argv.slice(2);
if (!siteDir || !rawOrigin) {
  console.error('Usage: node build-sitemap.mjs <site-dir> <origin> [sub-sitemap...]');
  process.exit(1);
}
const origin = rawOrigin.replace(/\/$/, '');
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Top-level pages only: subdirectories belong to the sections with their own sitemaps
// (or are old-address forwarding pages).
const pages = [];
for (const file of (await readdir(siteDir)).filter((f) => f.endsWith('.html')).sort()) {
  const html = await readFile(join(siteDir, file), 'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? '';
  if (!canonical?.startsWith(`${origin}/`) || /noindex/.test(robots)) continue;
  pages.push(canonical);
}
await writeFile(
  join(siteDir, 'sitemap-pages.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((loc) => `  <url><loc>${xml(loc)}</loc></url>`).join('\n')}
</urlset>
`,
);

const sitemaps = ['sitemap-pages.xml', ...subs.filter((sub) => {
  if (existsSync(join(siteDir, sub))) return true;
  console.warn(`Skipping ${sub}: not in the build`);
  return false;
})];
await writeFile(
  join(siteDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap><loc>${xml(`${origin}/${s}`)}</loc></sitemap>`).join('\n')}
</sitemapindex>
`,
);
console.log(`Wrote sitemap.xml: ${sitemaps.join(', ')} (${pages.length} top-level page(s))`);
