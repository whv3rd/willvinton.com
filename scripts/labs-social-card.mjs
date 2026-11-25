// Renders labs/og-card.jpg (1200×630), the share image for Springspot Labs (/labs/) and,
// until a project has its own, for each project page. Text and drawn shapes only: no
// photos, names or anything that identifies the kids (see labs/README.md).
//   npx -y -p playwright@1 node scripts/labs-social-card.mjs
import { createRequire } from 'node:module';

const root = new URL('..', import.meta.url).pathname;
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npx -y -p playwright@1 node scripts/labs-social-card.mjs');
  process.exit(1);
}

const html = `<!doctype html><html><head><meta charset="utf-8">
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
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}labs/og-card.jpg`, type: 'jpeg', quality: 88 });
await browser.close();
console.log('wrote labs/og-card.jpg');
