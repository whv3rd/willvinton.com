// Refreshes the "Latest from the Springspot blog" list on the homepage from the blog's
// RSS feed, so the strongest page on the site always links to the newest posts (good for
// readers, and the quickest way for crawlers to find them). Replaces everything between
// <!-- latest-posts --> and <!-- /latest-posts --> in the page. Without a feed (a
// Springspot build that predates it) the page keeps the list it has in the repo.
// Usage: node inject-latest-posts.mjs <page.html> <rss.xml> [count]
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

const [page, feed, rawCount = '3'] = process.argv.slice(2);
if (!page || !feed) {
  console.error('Usage: node inject-latest-posts.mjs <page.html> <rss.xml> [count]');
  process.exit(1);
}
if (!existsSync(feed)) {
  console.warn(`No feed at ${feed}; keeping the homepage's latest-posts list as is`);
  process.exit(0);
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '');
const short = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const rss = await readFile(feed, 'utf8');
const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, Number(rawCount)).map(([, item]) => {
  const date = new Date(tag(item, 'pubDate'));
  // Same-site links stay root-relative, like the rest of the page.
  const href = tag(item, 'link').replace(/^https:\/\/www\.willvinton\.com/, '');
  return `          <li><a href="${esc(href)}"><time datetime="${date.toISOString().slice(0, 10)}">${short.format(date)}</time><b>${esc(tag(item, 'title'))}</b></a></li>`;
});
if (items.length === 0) {
  console.warn('The feed has no posts; keeping the homepage list as is');
  process.exit(0);
}

const html = await readFile(page, 'utf8');
const block = /(<!-- latest-posts -->\n)[\s\S]*?(\n\s*<!-- \/latest-posts -->)/;
if (!block.test(html)) {
  console.error(`${page} has no <!-- latest-posts --> block`);
  process.exit(1);
}
// A function, so a "$" in a title is never read as a capture group.
await writeFile(page, html.replace(block, (_, open, close) => `${open}${items.join('\n')}${close}`));
console.log(`Listed the ${items.length} latest post(s) on ${page}`);
