# Tracking test plan (GA4 DebugView)

Run this after the code is deployed and the GTM import is in **Preview**, or after it's published.

## Setup

1. Turn on debug mode in the browser you'll test with: open
   https://www.willvinton.com/?ga_debug=1. It stays on in that browser until you visit any page with `?ga_debug=0`.
2. Open DevTools → **Console**. Every event is logged as `[wvTrack] event_name {…}`.
3. In a second window, open GA4 → Admin → **DebugView** and pick your device at the top left. Events show up within about 10 seconds.
4. If GTM is in Preview, Tag Assistant also lists each event and whether **GA4 - wvTrack events** fired.
5. Use a real browser, not an automated one: the GTM tag deliberately skips automated browsers.

**On every event, check:**
- `site_section` is `personal` on willvinton.com and `springspot` under /springspot/
- `debug_mode` is `true`
- no parameter contains an email address, a name you typed, or a `?query`

## willvinton.com

| # | Do this | Expect in DebugView |
|---|---|---|
| 1 | Click the **wv willvinton.com** tab (top left) | `logo_click`: link_text = willvinton.com |
| 2 | Click **Results** in the top nav | `nav_click`: link_text = Results, nav_type = primary |
| 3 | Click **Say hello** (top right) | `cta_click`: cta_label = Say hello, cta_location = header. No nav_click. |
| 4 | Click **Get in touch**, then **See the curve** in the hero | `cta_click` ×2, cta_location = hero |
| 5 | Scroll slowly to the bottom of the page | `scroll_depth` at 25, 50, 75, 90 (content_type = page) |
| 6 | In **What I do**, click the → then ← arrows | `carousel_nav`: ui_action = next / prev, ui_location = what_i_do |
| 7 | Scroll **Now building** into view | `project_view` for Springspot AI, Brecks Brothers Digital Consulting, Shopify Plus client work, Hobby collectibles store (current) and Pool care store (next) |
| 8 | Scroll through **Work** | `project_view` for each job as it becomes active (status current or past) |
| 9 | Click a job title in Work (or a year button on mobile) | `accordion_open`: ui_item = job, ui_location = work, ui_action = row / year_chip |
| 10 | Click **Full history on LinkedIn** (cancel the new tab) | `click` (outbound = true, link_domain = linkedin.com) and `social_click` (network = linkedin) |
| 11 | In Contact, click **GitHub** | `click` and `social_click` (network = github) |
| 12 | Click the email address | `contact_click`: contact_method = email, cta_location = contact. The address is not in it. |
| 13 | Click **Copy** next to the email | `copy_to_clipboard`: content_type = email, ui_action = copied |
| 14 | Click the **Springspot AI** card in Now building | `project_click`: project_name = Springspot AI |
| 15 | Click the **Springspot AI** tab (top) | `nav_click`: nav_type = site_tabs |

## Springspot

| # | Do this | Expect in DebugView |
|---|---|---|
| 16 | On /springspot/, click the **Springspot AI** tab | `logo_click`, site_section = springspot |
| 17 | Click **The Score** in the nav | `nav_click`: nav_type = primary |
| 18 | Click **Take the Score** (header button) | `cta_click`: cta_location = header |
| 19 | Click any footer link | `footer_click` |
| 20 | Click any button on a page (e.g. "What is Springspot?" on the homepage) | `cta_click` with its label and location |
| 21 | Stack breakdown gate (on /springspot/ or the Stack post): click **Unlock** with the box empty | `form_error`: form_id = stack_breakdown, field_name = email, error_type = required |
| 22 | Type `abc`, click Unlock | `form_start` (first keystroke), then `form_error` with error_type = invalid_format |
| 23 | Enter a real test address, click Unlock | `form_submit` and `generate_lead` (lead_source = stack_breakdown) |
| 24 | /springspot/score/: click **Next** without answering | `form_error`: form_id = score, field_name = checkpoint_answers, step_number = 1 |
| 25 | Answer the first question | `score_start` and `form_start` (form_id = score) |
| 26 | Finish steps 1–5 | `score_step` with step_number 1–5 and step_name = checkpoint name |
| 27 | Enter an invalid email, then a real one | `form_error` (invalid_format), then `score_step` 6 (email), `form_submit`, `generate_lead` (lead_source = springspot_score) and `score_complete` (score_total, score_level, weakest_checkpoint). No email anywhere. |
| 28 | On the result, click the next-step link, **See Path pricing** and **Retake the Score** | `score_cta_click` ×3: cta_location = score_result, with score_level |
| 29 | Start the Score again, answer one question, then click another page | `form_abandon`: form_id = score, field_name = the question's field |
| 30 | Open any blog post and scroll to the end of the article | `scroll_depth` 25/50/75/90 with content_type = blog_post, post_title and post_slug, then `read_complete` |
| 31 | Open a free Path guide (e.g. /springspot/path/ai-design/overview/) and scroll to the end | Same as 30, with content_type = path_guide and post_slug = track/part |
| 32 | On a paid Path part, click **See Path pricing** | `cta_click`: cta_location = paywall |

## Afterwards

- Visit any page with `?ga_debug=0` to turn debug mode off.
- Use a throwaway address for the form tests and delete it from Klaviyo afterwards. It's a real subscription.
- **Not testable yet:** `resume_download` and `file_download` (no files on the site) and video (no embeds). They work as soon as a file link exists; see TRACKING.md.
- **Not fired by the code:** `page_view`, `user_engagement` and `session_start` still come from the Google tag. Check page_view still appears once per page load.
