// Renders the share images (1200×630) shown when a page is posted on LinkedIn, Slack,
// iMessage, X and the like, in the site's type and colours:
//   og-card.jpg              the homepage
//   fractional/og-card.jpg   the fractional leadership page
//   labs/og-card.jpg         Springspot Labs and its projects (text and shapes only:
//                            nothing that identifies the kids, see labs/README.md)
// Re-run after changing a headline, the numbers or the headshot (needs Playwright with
// Chromium; dev tooling only):  npx -y -p playwright@1 node scripts/social-card.mjs
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url).pathname;
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npx -y -p playwright@1 node scripts/social-card.mjs');
  process.exit(1);
}

const headshot = (await readFile(`${root}headshot.jpg`)).toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Schibsted+Grotesk:wght@500;600&family=JetBrains+Mono:wght@500&display=block">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0B0D0C;color:#EEF1EE;font-family:'Schibsted Grotesk',sans-serif;position:relative;overflow:hidden;
  display:grid;grid-template-columns:1fr 360px;align-items:center;gap:56px;padding:0 80px}
.glow{position:absolute;width:900px;height:900px;right:-300px;top:-250px;background:radial-gradient(closest-side,rgba(154,171,255,.22),rgba(154,171,255,.06) 55%,transparent)}
.label{font:500 22px/1.5 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#9AABFF}
h1{font:800 132px/.9 'Bricolage Grotesque',sans-serif;letter-spacing:-.045em;margin:18px 0 26px}
p{font-size:31px;line-height:1.35;color:#C9D0CC;max-width:640px}
p b{color:#EEF1EE}
.foot{margin-top:34px;font:500 22px/1 'JetBrains Mono',monospace;color:#8E9893;letter-spacing:.06em}
.pic{position:relative;z-index:1}
.pic img{width:360px;height:360px;border-radius:50%;object-fit:cover;border:2px solid #242A27;display:block}
.badge{position:absolute;left:-40px;bottom:6px;background:#131715;border:1px solid #242A27;border-radius:18px;padding:14px 20px}
.badge strong{display:block;font:800 40px/1 'Bricolage Grotesque',sans-serif;color:#9AABFF}
.badge span{font-size:18px;color:#8E9893}
.copy{position:relative;z-index:1}
</style></head><body><span class="glow"></span>
<div class="copy">
  <p class="label">Ecommerce · Product · Technology</p>
  <h1>will vinton</h1>
  <p>I build and run online businesses, from a self-funded startup to <b>hundreds of millions a year</b> in digital revenue.</p>
  <p class="foot">willvinton.com</p>
</div>
<div class="pic"><img src="data:image/jpeg;base64,${headshot}" alt=""><div class="badge"><strong>$1.5B+</strong><span>revenue growth delivered</span></div></div>
</body></html>`;

const fractionalHtml = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Schibsted+Grotesk:wght@500;600&family=JetBrains+Mono:wght@500&display=block">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0B0D0C;color:#EEF1EE;font-family:'Schibsted Grotesk',sans-serif;position:relative;overflow:hidden;
  display:grid;grid-template-columns:1fr 360px;align-items:center;gap:56px;padding:0 80px}
.glow{position:absolute;width:900px;height:900px;right:-300px;top:-250px;background:radial-gradient(closest-side,rgba(154,171,255,.22),rgba(154,171,255,.06) 55%,transparent)}
.label{font:500 22px/1.5 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#9AABFF}
h1{font:800 132px/.9 'Bricolage Grotesque',sans-serif;letter-spacing:-.045em;margin:18px 0 26px}
p{font-size:31px;line-height:1.35;color:#C9D0CC;max-width:640px}
p b{color:#EEF1EE}
.foot{margin-top:34px;font:500 22px/1 'JetBrains Mono',monospace;color:#8E9893;letter-spacing:.06em}
.pic{position:relative;z-index:1}
.pic img{width:360px;height:360px;border-radius:50%;object-fit:cover;border:2px solid #242A27;display:block}
.badge{position:absolute;left:-40px;bottom:6px;background:#131715;border:1px solid #242A27;border-radius:18px;padding:14px 20px}
.badge strong{display:block;font:800 40px/1 'Bricolage Grotesque',sans-serif;color:#9AABFF}
.badge span{font-size:18px;color:#8E9893}
.copy{position:relative;z-index:1}
h1.long{font-size:74px;line-height:.98;letter-spacing:-.035em}
</style></head><body><span class="glow"></span>
<div class="copy">
  <p class="label">Will Vinton · Fractional leadership</p>
  <h1 class="long">Fractional Chief Digital Officer &amp; VP of Ecommerce</h1>
  <p>Senior digital leadership, part-time: strategy, platforms, teams, data and AI.</p>
  <p class="foot">willvinton.com/fractional</p>
</div>
<div class="pic"><img src="data:image/jpeg;base64,${headshot}" alt=""><div class="badge"><strong>$1.5B+</strong><span>revenue growth delivered</span></div></div>
</body></html>`;

const labsHtml = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Schibsted+Grotesk:wght@500;600&family=JetBrains+Mono:wght@500&display=block">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0B0D0C;color:#EEF1EE;font-family:'Schibsted Grotesk',sans-serif;position:relative;overflow:hidden;
  display:grid;grid-template-columns:1fr 360px;align-items:center;gap:40px;padding:0 80px}
.glow{position:absolute;width:900px;height:900px;right:-320px;top:-260px;background:radial-gradient(closest-side,rgba(240,180,90,.2),rgba(240,180,90,.05) 55%,transparent)}
.copy{position:relative;z-index:1}
.brand{display:flex;align-items:center;gap:14px;font:500 22px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#F0B45A}
h1{font:800 92px/.95 'Bricolage Grotesque',sans-serif;letter-spacing:-.04em;margin:26px 0 24px}
h1 em{font-style:normal;color:#F0B45A}
p{font-size:29px;line-height:1.35;color:#C9D0CC;max-width:640px}
.foot{margin-top:30px;font:500 22px/1 'JetBrains Mono',monospace;color:#8E9893;letter-spacing:.06em}
svg.planet{position:relative;z-index:1}
</style></head><body><span class="glow"></span>
<div class="copy">
  <p class="brand"><svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#F0B45A"/><path d="M8 22h16M11 22l5-12 5 12" stroke="#0B0D0C" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>Springspot Labs</p>
  <h1>Kids dream it up. We <em>build it</em> together.</h1>
  <p>Games, worlds, stories and characters, built with a little help from Dad and AI.</p>
  <p class="foot">willvinton.com/labs</p>
</div>
<svg class="planet" width="360" height="360" viewBox="0 0 400 400">
  <circle cx="200" cy="200" r="150" fill="none" stroke="#242A27" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round"/>
  <circle cx="200" cy="200" r="86" fill="#131715" stroke="#5BD69A" stroke-width="3"/>
  <ellipse cx="200" cy="200" rx="140" ry="34" fill="none" stroke="#9AABFF" stroke-width="3" transform="rotate(-18 200 200)"/>
  <circle cx="200" cy="50" r="8" fill="#F0B45A"/><circle cx="335" cy="250" r="7" fill="#F08FB4"/>
  <circle cx="80" cy="290" r="6" fill="#6FD3E0"/><circle cx="170" cy="175" r="10" fill="#5BD69A" opacity=".5"/>
</svg>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [markup, file] of [
  [html, 'og-card.jpg'],
  [fractionalHtml, 'fractional/og-card.jpg'],
  [labsHtml, 'labs/og-card.jpg'],
]) {
  await page.setContent(markup, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${root}${file}`, type: 'jpeg', quality: 88 });
  console.log(`wrote ${file}`);
}
await browser.close();
