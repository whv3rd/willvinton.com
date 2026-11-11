// Drives the built site in a headless browser and checks what analytics.js sends to the
// dataLayer: every event in TRACKING.md that can be triggered here, with its parameters,
// and that nothing personal (emails, typed values, query strings) gets through.
// Navigation is blocked so one page can collect many clicks; Klaviyo is stubbed.
//
// Usage: node scripts/check-tracking.mjs http://localhost:4620
//   (serve the assembled site first: the deploy's _site folder, with /springspot/ inside)
// Needs Playwright: `npm i -g playwright` or run where `require('playwright')` resolves.
import { createRequire } from 'node:module';
import { EVENTS, PARAMS } from './build-gtm-import.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:4620').replace(/\/$/, '');
const EMAIL = 'Test.Person+ga@example.com';
const failures = [];
const ALL = []; // every event read during the run, for the privacy checks
const seen = new Set();

function check(ok, what) {
  if (!ok) failures.push(what);
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`);
}

// Records every dataLayer push in sessionStorage so events sent while leaving a page
// (form_abandon) survive the navigation.
const RECORDER = () => {
  const KEY = '__wv_events';
  const dl = (window.dataLayer = window.dataLayer || []);
  const push = dl.push.bind(dl);
  dl.push = (...items) => {
    for (const item of items) {
      if (item && typeof item === 'object' && item.event && item.wv) {
        const log = JSON.parse(sessionStorage.getItem(KEY) || '[]');
        log.push({ event: item.event, ...item.wv });
        sessionStorage.setItem(KEY, JSON.stringify(log));
      }
    }
    return push(...items);
  };
};

async function events(page) {
  const list = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__wv_events') || '[]'));
  ALL.push(...list);
  return list;
}
async function reset(page) {
  await page.evaluate(() => sessionStorage.removeItem('__wv_events'));
}
function find(list, event, match = {}) {
  return list.find((e) => e.event === event && Object.entries(match).every(([k, v]) => e[k] === v));
}
function expectEvent(list, event, match, what) {
  const hit = find(list, event, match);
  if (hit) seen.add(event);
  check(Boolean(hit), `${what || event} ${JSON.stringify(match || {})}${hit ? '' : '  (got: ' + list.map((e) => e.event).join(', ') + ')'}`);
  return hit;
}
async function blockNavigation(page) {
  await page.evaluate(() =>
    document.addEventListener('click', (e) => {
      if (e.target.closest('a[href]')) e.preventDefault();
    }),
  );
}
async function scrollThrough(page, selector) {
  const steps = 40;
  for (let i = 1; i <= steps; i++) {
    await page.evaluate(
      ([sel, f]) => {
        const el = sel ? document.querySelector(sel) : document.documentElement;
        const top = sel ? el.getBoundingClientRect().top + scrollY : 0;
        const h = sel ? el.offsetHeight : document.documentElement.scrollHeight;
        scrollTo(0, top + h * f - innerHeight * (sel ? 0.5 : 0.9));
      },
      [selector, i / steps],
    );
    await page.waitForTimeout(40);
  }
  await page.evaluate((sel) => {
    const el = sel ? document.querySelector(sel) : document.documentElement;
    const bottom = sel ? el.getBoundingClientRect().bottom + scrollY : el.scrollHeight;
    scrollTo(0, bottom);
  }, selector);
  await page.waitForTimeout(150);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript(RECORDER);
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
// Klaviyo: accept the subscription without sending anything.
await context.route('https://a.klaviyo.com/**', (r) => r.fulfill({ status: 202, body: '' }));
await context.route('https://static.klaviyo.com/**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
);
await context.route(/googletagmanager\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
const page = await context.newPage();
const consoleLines = [];
page.on('console', (m) => consoleLines.push(m.text()));
page.on('pageerror', (e) => failures.push('page error: ' + e.message));

// ---------------------------------------------------------------- willvinton.com
console.log('\nwillvinton.com /');
await page.goto(`${BASE}/?ga_debug=1&utm_source=test`);
await page.waitForTimeout(300);
await blockNavigation(page);
await page.click('.site.on');
await page.click('.sections a[href="#results"]');
await page.click('.sections a.btn');
await page.click('.hero a[href="#contact"]');
await page.click('.hero a[href="#curve"]');
await page.click('.pl-btn.next');
await page.click('.pl-btn.prev');
await page.click('a.site[href="/springspot/"]');
await page.click('a.feature');
await page.click('.socials a[href*="linkedin"]');
await page.click('.socials a[href*="github"]');
await page.click('a[href^="mailto:"]');
await page.click('#copyEmail');
await page.waitForTimeout(200);
await scrollThrough(page, null);
await page.evaluate(() => document.getElementById('work').scrollIntoView());
await page.waitForTimeout(300);
await page.evaluate(() => {
  const s = document.querySelectorAll('#work .job summary')[2];
  s.scrollIntoView({ block: 'center' });
});
await page.click('#work .job:nth-of-type(3) summary', { force: true }).catch(() => {});
await page.waitForTimeout(300);
let ev = await events(page);
expectEvent(ev, 'logo_click', { link_text: 'willvinton.com', site_section: 'personal', debug_mode: true });
expectEvent(ev, 'nav_click', { link_text: 'Results', nav_type: 'primary' });
expectEvent(ev, 'nav_click', { link_text: 'Springspot AI', nav_type: 'site_tabs' });
expectEvent(ev, 'cta_click', { cta_label: 'Say hello', cta_location: 'header' });
expectEvent(ev, 'cta_click', { cta_label: 'Get in touch', cta_location: 'hero' });
expectEvent(ev, 'cta_click', { cta_label: 'See the curve', cta_location: 'hero' });
check(!find(ev, 'nav_click', { link_text: 'Say hello' }), 'no nav_click for the tagged Say hello button');
expectEvent(ev, 'carousel_nav', { ui_action: 'next', ui_location: 'what_i_do' });
expectEvent(ev, 'project_click', { project_name: 'Springspot AI', project_status: 'current' });
expectEvent(ev, 'click', { outbound: true, link_domain: 'linkedin.com' });
expectEvent(ev, 'social_click', { network: 'linkedin' });
expectEvent(ev, 'social_click', { network: 'github' });
expectEvent(ev, 'contact_click', { contact_method: 'email', cta_location: 'contact' });
expectEvent(ev, 'copy_to_clipboard', { content_type: 'email' });
for (const p of [25, 50, 75, 90]) expectEvent(ev, 'scroll_depth', { percent_scrolled: p, content_type: 'page' });
expectEvent(ev, 'project_view', { project_name: 'Pool care store', project_status: 'next' });
expectEvent(ev, 'project_view', { project_status: 'past' }, 'project_view (work history)');
expectEvent(ev, 'accordion_open', { ui_location: 'work' });
check(consoleLines.some((l) => l.startsWith('[wvTrack]')), 'debug mode logs events to the console');

// ---------------------------------------------------------------- Springspot pages
console.log('\n/springspot/ (header, footer, CTAs, Stack gate)');
await page.goto(`${BASE}/springspot/`);
await reset(page);
await blockNavigation(page);
await page.click('.site-tab--active');
await page.click('.site-header__nav a[href$="/score"]');
await page.click('.site-header__cta');
await page.click('.site-footer nav a >> nth=0');
await page.click('main a.button >> nth=0');
const gate = page.locator('[data-stack-gate]').first();
await page.evaluate(() => localStorage.removeItem('springspot:stack-breakdown'));
await gate.locator('[data-submit]').click();
await gate.locator('[data-email]').fill('not-an-email');
await gate.locator('[data-submit]').click();
await gate.locator('[data-email]').fill(EMAIL);
await gate.locator('[data-submit]').click();
await page.waitForTimeout(400);
ev = await events(page);
expectEvent(ev, 'logo_click', { link_text: 'Springspot AI', site_section: 'springspot' });
expectEvent(ev, 'nav_click', { link_text: 'The Score', nav_type: 'primary' });
expectEvent(ev, 'cta_click', { cta_location: 'header' });
expectEvent(ev, 'footer_click', {});
expectEvent(ev, 'cta_click', { site_section: 'springspot' }, 'cta_click (page button)');
expectEvent(ev, 'form_error', { form_id: 'stack_breakdown', field_name: 'email', error_type: 'required' });
expectEvent(ev, 'form_error', { form_id: 'stack_breakdown', error_type: 'invalid_format' });
expectEvent(ev, 'form_start', { form_id: 'stack_breakdown', form_name: 'Springspot Stack breakdown' });
expectEvent(ev, 'form_submit', { form_id: 'stack_breakdown' });
expectEvent(ev, 'generate_lead', { lead_source: 'stack_breakdown' });

console.log('\n/springspot/score/');
await page.goto(`${BASE}/springspot/score/`);
await page.evaluate(() => localStorage.removeItem('springspot:score'));
await page.reload();
await reset(page);
await page.waitForTimeout(200);
await page.click('[data-next]'); // nothing answered: an error
for (let step = 0; step < 5; step++) {
  for (const q of await page.$$('[data-step]:not([hidden]) [data-question]')) {
    await (await q.$('input[type=radio]')).check();
  }
  await page.click('[data-next]');
}
await page.fill('[data-email]', 'nope');
await page.click('[data-next]');
await page.fill('[data-email]', EMAIL);
await page.click('[data-next]');
await page.waitForSelector('[data-result]:not([hidden])');
await blockNavigation(page);
await page.click('[data-result] [data-next-step]:not([hidden]) a');
await page.click('[data-result] a[href$="/pricing"]');
await page.click('[data-retake]');
ev = await events(page);
expectEvent(ev, 'form_error', { form_id: 'score', field_name: 'checkpoint_answers', error_type: 'required', step_number: 1 });
expectEvent(ev, 'score_start', {});
expectEvent(ev, 'form_start', { form_id: 'score' });
for (let n = 1; n <= 5; n++) expectEvent(ev, 'score_step', { step_number: n });
expectEvent(ev, 'form_error', { form_id: 'score', field_name: 'email', error_type: 'invalid_format' });
expectEvent(ev, 'score_step', { step_number: 6, step_name: 'email' });
expectEvent(ev, 'form_submit', { form_id: 'score' });
expectEvent(ev, 'generate_lead', { lead_source: 'springspot_score' });
const done = expectEvent(ev, 'score_complete', {});
check(done && typeof done.score_total === 'number' && done.score_level && done.weakest_checkpoint, 'score_complete carries score_total, score_level, weakest_checkpoint');
expectEvent(ev, 'score_cta_click', { cta_location: 'score_result' });
check(ev.some((e) => e.event === 'score_cta_click' && e.score_level), 'score_cta_click carries the score level');
check(!find(ev, 'cta_click', { cta_location: 'score_result' }), 'result buttons send score_cta_click, not cta_click too');

console.log('\nform_abandon');
await page.goto(`${BASE}/springspot/score/`);
await reset(page);
await page.check('[data-step]:not([hidden]) [data-question] input[type=radio]');
await page.goto(`${BASE}/springspot/about/`);
ev = await events(page);
expectEvent(ev, 'form_abandon', { form_id: 'score', field_name: (ev.find((e) => e.event === 'form_abandon') || {}).field_name });

console.log('\nblog post');
const post = 'what-springspot-is';
await page.goto(`${BASE}/springspot/blog/${post}/`);
await reset(page);
await scrollThrough(page, '[data-track-article]');
ev = await events(page);
for (const p of [25, 50, 75, 90]) expectEvent(ev, 'scroll_depth', { percent_scrolled: p, content_type: 'blog_post', post_slug: post });
expectEvent(ev, 'read_complete', { post_slug: post });
check(Boolean(find(ev, 'read_complete') && find(ev, 'read_complete').post_title), 'read_complete carries post_title');

console.log('\nprivacy');
await reset(page);
// Everything collected above, plus a direct attempt to send personal data.
await page.evaluate(() => window.wvTrack('cta_click', { cta_label: 'mail me at someone@example.com', phone: '+1 (302) 555-0199', BadName: 'x' }));
ev = await events(page);
const all = ALL;
check(all.length > 50, `privacy sweep covers the whole run (${all.length} events)`);
const leaked = all.filter((e) => JSON.stringify(e).match(/@|555-0199|utm_source|\?/));
check(leaked.length === 0, 'no emails, phone numbers or query strings in any parameter');
const probe = find(ev, 'cta_click', {});
check(probe && !('cta_label' in probe) && !('phone' in probe) && !('BadName' in probe), 'personal values and non-snake_case names are dropped');
const unknownEvents = [...new Set(all.map((e) => e.event))].filter((e) => !EVENTS.includes(e));
check(unknownEvents.length === 0, `every event is in the GTM trigger${unknownEvents.length ? ': missing ' + unknownEvents : ''}`);
const unknownParams = [...new Set(all.flatMap((e) => Object.keys(e)))].filter((k) => k !== 'event' && !PARAMS.includes(k));
check(unknownParams.length === 0, `every parameter is mapped in the GTM tag${unknownParams.length ? ': missing ' + unknownParams : ''}`);
const tooLong = all.filter((e) => Object.values(e).some((v) => typeof v === 'string' && v.length > 100));
check(tooLong.length === 0, 'every value is 100 characters or less');

await browser.close();
console.log(`\nEvents seen: ${[...seen].sort().join(', ')}`);
if (failures.length) {
  console.log(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
