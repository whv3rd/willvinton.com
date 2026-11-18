// Checks the assembled site (the deploy's _site folder) for the search basics, so a
// regression fails the deploy instead of quietly costing rankings:
//   - every indexable page: one <title>, a meta description, a self-referencing https
//     canonical on this origin, one <h1>, Open Graph and Twitter card tags, valid JSON-LD
//   - every internal link and asset points at something that exists
//   - robots.txt points at the sitemap; every sitemap URL exists and is indexable, and
//     every indexable page is in a sitemap
// Errors fail (exit 1). Warnings (lengths, links that cost a redirect) are printed only.
// Usage: node scripts/check-seo.mjs <site-dir> [origin]
//   e.g. node scripts/check-seo.mjs _site https://www.willvinton.com
import { existsSync, statSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const [siteDir, rawOrigin = 'https://www.willvinton.com'] = process.argv.slice(2);
if (!siteDir) {
  console.error('Usage: node scripts/check-seo.mjs <site-dir> [origin]');
  process.exit(1);
}
const origin = rawOrigin.replace(/\/$/, '');
const errors = [];
const warnings = [];
const error = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`${page}: ${msg}`);

const files = (await readdir(siteDir, { recursive: true })).map((f) => f.split('\\').join('/'));
const htmlFiles = files.filter((f) => f.endsWith('.html')).sort();
const urlOf = (file) => `${origin}/${file.replace(/(^|\/)index\.html$/, '$1')}`;

/** Whether a root-relative path resolves to a file in the build, as the static host would. */
function resolves(path) {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]);
  const target = join(siteDir, clean);
  if (!existsSync(target)) return false;
  return statSync(target).isFile() || existsSync(join(target, 'index.html'));
}

const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (html, attr, name) =>
  html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
const count = (html, re) => (html.match(re) ?? []).length;

const indexable = new Set();
for (const file of htmlFiles) {
  const html = await readFile(join(siteDir, file), 'utf8');
  const page = `/${file}`;
  const robots = meta(html, 'name', 'robots') ?? '';
  const isRedirect = /http-equiv="refresh"/.test(html);

  // Links and assets, on every page (redirect pages included: their target must exist).
  for (const [, attr, value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    if (!value || value.startsWith('#') || /^(mailto|tel|data|javascript):/.test(value)) continue;
    let path;
    if (value.startsWith(`${origin}/`)) path = value.slice(origin.length);
    else if (value.startsWith('/') && !value.startsWith('//')) path = value;
    else continue; // external, or relative (only the homepage uses those, for its own assets)
    if (!resolves(path)) error(page, `broken ${attr}: ${value}`);
    else if (attr === 'href' && !/\.[a-z0-9]+$/i.test(path.split(/[?#]/)[0]) && !/\/([?#].*)?$/.test(path))
      warn(page, `link without a trailing slash (costs a redirect): ${value}`);
  }
  if (isRedirect || /noindex/.test(robots)) continue;

  indexable.add(urlOf(file));
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  if (count(html, /<title>/g) !== 1 || !title) error(page, 'needs exactly one <title>');
  else if (title.length > 70) warn(page, `title is ${title.length} characters (aim for 70 or fewer)`);

  const description = decode(meta(html, 'name', 'description') ?? '');
  if (!description) error(page, 'no meta description');
  else if (description.length < 50 || description.length > 170)
    warn(page, `description is ${description.length} characters (aim for 50–160)`);

  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
  if (canonicals.length !== 1) error(page, `needs exactly one canonical (has ${canonicals.length})`);
  else if (canonicals[0] !== urlOf(file))
    error(page, `canonical ${canonicals[0]} isn't this page (${urlOf(file)})`);

  if (!/<html[^>]* lang="/.test(html)) error(page, 'no lang on <html>');
  if (count(html, /<h1[\s>]/g) !== 1) error(page, `needs exactly one <h1> (has ${count(html, /<h1[\s>]/g)})`);
  for (const prop of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'])
    if (!meta(html, 'property', prop)) error(page, `no ${prop}`);
  if (!meta(html, 'name', 'twitter:card')) error(page, 'no twitter:card');

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length === 0) warn(page, 'no JSON-LD');
  for (const [, json] of blocks) {
    try {
      JSON.parse(json);
    } catch (e) {
      error(page, `JSON-LD doesn't parse: ${e.message}`);
    }
  }
}

// robots.txt and sitemaps.
const robotsTxt = existsSync(join(siteDir, 'robots.txt'))
  ? await readFile(join(siteDir, 'robots.txt'), 'utf8')
  : '';
if (!robotsTxt) error('/robots.txt', 'missing');
else if (!robotsTxt.includes(`Sitemap: ${origin}/sitemap.xml`))
  error('/robots.txt', `doesn't point at ${origin}/sitemap.xml`);

const listed = new Set();
async function readSitemap(path) {
  if (!existsSync(join(siteDir, path))) return error(`/${path}`, 'missing');
  const xml = await readFile(join(siteDir, path), 'utf8');
  for (const [, loc] of xml.matchAll(/<loc>([^<]*)<\/loc>/g)) {
    if (!loc.startsWith(`${origin}/`)) {
      error(`/${path}`, `${loc} isn't on ${origin}`);
      continue;
    }
    const rel = loc.slice(origin.length + 1);
    if (/<sitemapindex/.test(xml)) await readSitemap(rel);
    else if (!indexable.has(loc)) error(`/${path}`, `${loc} is missing or noindex`);
    else listed.add(loc);
  }
}
await readSitemap('sitemap.xml');
for (const url of indexable) if (!listed.has(url)) warn('/sitemap.xml', `indexable page not listed: ${url}`);

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  FAIL  ${e}`);
console.log(
  `\n${htmlFiles.length} page(s), ${indexable.size} indexable, ${listed.size} in sitemaps: ` +
    `${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length ? 1 : 0);
