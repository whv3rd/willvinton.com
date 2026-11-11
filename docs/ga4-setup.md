# GA4 and GTM setup checklist

The code can't change these settings, so this is a list to click through.

- GA4 property: 563254766 (account 415433599)
- Web stream: G-WPLXXKH0FY. Check this ID first (step 0).
- GTM container: GTM-W64VTKTX

**Order matters.** Steps 3 and 4 switch off enhanced-measurement events that the new code replaces. Do them the same day the code goes live, not before, or there'll be a gap.

## 0. Confirm the measurement ID

GA4 → Admin → Data streams → the willvinton.com web stream: check the **Measurement ID**.
- If it isn't `G-WPLXXKH0FY`, re-run `node scripts/build-gtm-import.mjs G-XXXXXXX` before importing, or change the GTM variable **wv - GA4 measurement ID** after importing.

## 1. Deploy the code

Merge the PRs. The site then pushes events to the dataLayer. Nothing reaches GA4 until step 2.

## 2. Import the GTM tag

1. GTM → Admin → **Import container** → choose `gtm/ga4-events.json` → workspace: Default.
2. Choose **Merge** → **Rename conflicting tags, triggers, and variables** → Confirm.
3. You'll get:
   - the tag **GA4 - wvTrack events**
   - the triggers **CE - wvTrack events** and **Block - automated browser**
   - 34 variables named `wv - …`
4. **Optional, recommended:** open your existing **Google tag** (the one that sends page_view) → Triggering → **Add exception** → *Block - automated browser*. Headless browsers then stop sending page views too.
5. **Preview** (Tag Assistant): open https://www.willvinton.com/?ga_debug=1 and run `docs/tracking-test-plan.md`. Check the events in Tag Assistant and in GA4 → Admin → DebugView.
6. **Submit → Publish** (version name, e.g. "wvTrack events").

## 3. Enhanced measurement: what to switch off

GA4 → Admin → Data streams → web stream → **Enhanced measurement** (the gear icon):

| Toggle | Set to | Why |
|---|---|---|
| Page views | **On** | Keep. Under *Show advanced settings*, turn **off** "Page changes based on browser history events": neither site is a single-page app, and the history setting can count extra page views when people jump to #sections. |
| Scrolls | **Off** | Replaced by `scroll_depth` (25/50/75/90%, with post title and slug). Leaving it on double-counts 90%. |
| Outbound clicks | **Off** | The code sends the same `click` event (`outbound`, `link_url`, `link_domain`) plus `site_section`. Leaving it on sends every outbound click twice. |
| Site search | Off | No search on either site. |
| Form interactions | **Off** | Important: the Score's "Next" button is a form submit, so enhanced measurement fires `form_submit` on every step. The code sends `form_start` (same name, `form_id`/`form_name`), plus `form_submit` only on success, `form_error` and `form_abandon`. |
| Video engagement | Off | No video. Turn it on, or add tracking, if you embed YouTube later. |
| File downloads | **Off** | The code sends `file_download` and `resume_download` with `site_section`. |

`user_engagement`, `session_start` and `first_visit` are automatic and unaffected.

## 4. Custom dimensions and metrics

GA4 → Admin → **Custom definitions** → Create custom dimension. All are **Event** scope. Use the parameter name as both the dimension name, written readably, and the event parameter.

These parameters are **already built into GA4**, so don't register them:
- `link_url`, `link_domain`, `link_text`, `outbound`
- `file_name`, `file_extension`
- `form_id`, `form_name`
- `percent_scrolled`

Register these (21 dimensions and 1 metric; standard GA4 allows 50 event-scoped dimensions):

| Dimension name | Event parameter | Used by |
|---|---|---|
| Site section | `site_section` | every event |
| CTA label | `cta_label` | cta_click, score_cta_click |
| CTA location | `cta_location` | cta_click, social_click, contact_click, score_cta_click |
| Nav type | `nav_type` | nav_click |
| Social network | `network` | social_click |
| Contact method | `contact_method` | contact_click |
| Form field | `field_name` | form_error, form_abandon |
| Form error type | `error_type` | form_error |
| Lead source | `lead_source` | generate_lead |
| Project name | `project_name` | project_view, project_click |
| Project status | `project_status` | project_view, project_click |
| Content type | `content_type` | scroll_depth, read_complete, copy_to_clipboard. If GA4 says the name is taken, call it "Page content type". |
| Post title | `post_title` | scroll_depth, read_complete |
| Post slug | `post_slug` | scroll_depth, read_complete |
| Score step | `step_name` | score_step, form_error |
| Score step number | `step_number` | score_step, form_error |
| Score level | `score_level` | score_complete, score_cta_click |
| Weakest checkpoint | `weakest_checkpoint` | score_complete |
| UI location | `ui_location` | accordion_open, carousel_nav, copy_to_clipboard |
| UI action | `ui_action` | accordion_open, carousel_nav, copy_to_clipboard |
| UI item | `ui_item` | accordion_open |

Custom metric (Admin → Custom definitions → Custom metrics):

| Metric name | Event parameter | Unit |
|---|---|---|
| Score total | `score_total` | Standard. Use it as an average in explorations. |

Dimensions only fill in from the day they're registered, so do this before publishing GTM.

## 5. Key events

GA4 → Admin → **Events** (the events appear about 24 hours after they first fire) → toggle **Mark as key event**:

| Event | Key event? | Why |
|---|---|---|
| `generate_lead` | **Yes**, primary | Someone gave you their email (Score or Stack breakdown). Split by `lead_source`. |
| `contact_click` | **Yes** | Clicked to email you. |
| `score_complete` | **Yes** | Finished the Score, Springspot's main tool. It overlaps with generate_lead, but stays useful if the email gate ever changes. |
| `resume_download` | **Yes**, once a resume is on the site | No resume file exists yet. |
| `copy_to_clipboard` | Yes, recommended | Today it's only the email address. Copying it is contact intent, just like the mailto click. |
| `social_click`, LinkedIn only | Yes, via a custom event | Key events can't filter by parameter. Create one: Admin → Events → **Create event** → name `linkedin_click`, conditions `event_name equals social_click` and `network equals linkedin`. Then mark `linkedin_click` as a key event. |
| `cta_click`, `form_submit`, `project_click` | No | Too frequent, or already covered by generate_lead. Keep them for funnels. |

## 6. Internal traffic (your own visits)

1. Find your public IP addresses (search "what is my IP" from home, work and phone). Note both IPv4 and IPv6 if shown.
2. GA4 → Admin → Data streams → web stream → **Configure tag settings** → *Show more* → **Define internal traffic** → Create:
   - Rule name: `Will`
   - traffic_type value: `internal`
   - IP address: *equals* each IPv4 address, or *IP address is in range (CIDR)* for an IPv6 prefix, e.g. `2600:1700:abcd::/48`
3. GA4 → Admin → **Data settings → Data filters**:
   - The **Internal Traffic** filter exists and starts in **Testing**. In testing, matching hits are labelled but kept.
   - Check it works: Explore → dimension **Test data filter name** shows your visits.
   - Then switch it to **Active**. This can't be undone for data already processed.
4. Also set the **Developer Traffic** filter to **Active**. Events sent with `debug_mode` (that's `?ga_debug=1`) then stay in DebugView and out of reports.

If your home IP changes often, ask me to add a "this is me" switch (for example `?wv_internal=1`, remembered in the browser). That sends `traffic_type=internal` from GTM, so the filter catches you on any network.

## 7. Unwanted referrals

GA4 → Admin → Data streams → web stream → Configure tag settings → **List unwanted referrals**. Add a domain only when it appears as a referral but is really part of the same visit:

- **Add now:** none needed. Self-referrals from www.willvinton.com are handled automatically.
- **Add later:** your checkout domain (Shopify, Stripe and so on) once Phase 2 payments go live, or a login or redirect step that bounces people back.
- **Klaviyo email clicks:** don't add Klaviyo domains. Turn on Klaviyo's UTM tracking (Klaviyo → Settings → UTM tracking) so email visits show as `email / klaviyo` instead of referral or direct.

## 8. Bot and data-centre traffic

**Why those cities:** Council Bluffs is a Google Cloud data centre; Ashburn and Boardman are AWS. Visits from there are almost always scripts, previewers and scanners, not people.
- GA4 already drops the bots on the IAB list, and that can't be configured.
- GA4 can't filter by city, and listing whole cloud IP ranges as "internal" isn't practical: there are thousands of ranges.

What works:
1. **GTM exception (step 2.4):** the *Block - automated browser* trigger stops headless and automated browsers (`navigator.webdriver`), which covers most data-centre scripts that run JavaScript.
2. **Reporting:** in Explore, build a segment "Likely bots" that excludes sessions where:
   - City is one of Council Bluffs, Ashburn or Boardman, **and**
   - Engagement time is 0s or Engaged sessions = 0.

   Apply its inverse as a comparison in reports, and save it.
3. **Check what's left:** most of it should show 0s engagement, direct traffic and a single page. If real engaged sessions show up, keep them.
4. **At the edge, later:** with DNS on GoDaddy and hosting on GitHub Pages, there's no bot filter in front of the site. Moving DNS to Cloudflare (free) would add Bot Fight Mode and real 301 redirects. Parked for now.

## 9. Consent

- There is **no cookie or consent banner** on either site, and none was added.
- GA4 runs for every visitor.
- If you expect EU/UK visitors, or want to be conservative, add a consent banner (CMP) with Google Consent Mode v2. The GTM tag here has no consent settings yet ("Not set"), so it follows the container's consent setup once one exists.
