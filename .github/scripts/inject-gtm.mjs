// Adds the Google Tag Manager container to every built HTML page: the loader at the
// top of <head> (after <meta charset>) and the noscript fallback right after <body>.
// Usage: node inject-gtm.mjs <dist-dir> <GTM-XXXXXXX>
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [dir, id] = process.argv.slice(2);
if (!dir || !/^GTM-[A-Z0-9]+$/.test(id ?? '')) {
  console.error('Usage: node inject-gtm.mjs <dist-dir> <GTM-XXXXXXX>');
  process.exit(1);
}

const head = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>`;
const body = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

let changed = 0;
for (const file of await readdir(dir, { recursive: true })) {
  if (!file.endsWith('.html')) continue;
  const path = join(dir, file);
  const before = await readFile(path, 'utf8');
  if (before.includes(`gtm.js?id=`) || !/<head[^>]*>/i.test(before)) continue;
  const after = before
    .replace(/<meta charset[^>]*>|<head[^>]*>/i, (m) => m + head)
    .replace(/<body[^>]*>/i, (m) => m + body);
  await writeFile(path, after);
  changed++;
}
console.log(`Added ${id} to ${changed} page(s)`);
