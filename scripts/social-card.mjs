// Renders og-card.jpg (1200×630), the image shown when willvinton.com is shared on
// LinkedIn, Slack, iMessage, X and the like, in the homepage's type and colours.
// Re-run after changing the headline numbers or the headshot:
//   node scripts/social-card.mjs        (needs Playwright with Chromium; dev tooling only:
//   npx -y -p playwright@1 node scripts/social-card.mjs)
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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}og-card.jpg`, type: 'jpeg', quality: 88 });
await browser.close();
console.log('wrote og-card.jpg');
