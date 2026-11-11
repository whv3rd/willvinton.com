# Tracking

GA4 event tracking for willvinton.com and Springspot (`/springspot/`).

- GA4 property: 563254766 (account 415433599)
- Measurement ID: G-WPLXXKH0FY
- GA4 loads through Google Tag Manager container `GTM-W64VTKTX`.

## How it works

1. **`/analytics.js`** is the one tracking helper.
   - willvinton.com loads it in `index.html`.
   - The deploy adds it to every Springspot page (`.github/scripts/inject-gtm.mjs`).
   - It defines `wvTrack(event, params)`, listens for clicks, form activity and scrolling, and pushes `{ event, wv: { ...params } }` to `window.dataLayer`.
2. **GTM** forwards those events to GA4 with the tag **GA4 - wvTrack events**, imported from `gtm/ga4-events.json`. Regenerate that file with `node scripts/build-gtm-import.mjs` whenever an event or parameter is added.
3. **Springspot's own scripts** (the Score, the Stack gate) call `track()` from `src/lib/analytics.ts` in whv3rd/Springboard. It forwards to `window.wvTrack` and does nothing if the helper isn't there, for example in `astro dev`.

The helper never breaks the page: every call is wrapped in `try`/`catch`. If GTM is blocked, the events sit in an unused array.

**Every event gets `site_section`:**
- `personal` on willvinton.com
- `springspot` under `/springspot/`

## Tagging something new

Most things need one attribute or none.

| You want | Do this |
|---|---|
| A CTA button or link | `data-track="cta_click"`. The label (the element's text) and location are filled in for you; override them with `data-track-cta-label` and `data-track-cta-location`. On Springspot, every `<Button href>` is already a CTA. |
| Any event with extra params | `data-track="event_name" data-track-some-param="value"`. `data-track-x-y` becomes the parameter `x_y`. |
| Nav or footer links | Put `data-track-area="nav"` or `"footer"` on the container. Plain links inside then send `nav_click` or `footer_click`. The area's own `data-track-*` attributes are added to everything inside it. |
| Name a place on the page | `data-track-location="pricing_table"` on a wrapper; it becomes `cta_location` / `ui_location`. Without one, the nearest section's id or first class is used. |
| A form | `data-track-form="form_id" data-track-form-name="Readable name"` on `<form>`. This gives you `form_start` and `form_abandon` automatically. Send `form_submit`, `form_error` and `generate_lead` from the form's code, because only it knows whether the submit worked. |
| An article body | `data-track-article data-track-content-type="blog_post" data-track-post-title="…" data-track-post-slug="…"` on the element that wraps the text, not the comments or FAQ. |
| A project | `data-track-project="Name" data-track-project-status="current\|next\|past"`. This sends `project_view` when it's half on screen and `project_click` for links inside it. |
| A resume | Link to a file with "resume" or "cv" in its name, or add `data-track-resume`. Clicks send `resume_download`. Other files send `file_download`. |
| Opt a link out | `data-track-auto="off"` turns off the automatic link events (outbound, mailto, file). |

**Automatic, no markup needed:**
- links to other domains
- LinkedIn, GitHub and other social links
- `mailto:` and `tel:` links
- links to files
- opening a closed `<details>`
- scroll depth

## Events

| Event | Parameters | Fires when | Where |
|---|---|---|---|
| `logo_click` | link_text, link_url | The site's own tab/logo is clicked | Header on both sites |
| `nav_click` | link_text, link_url, nav_type (`primary`, `site_tabs`) | A nav link is clicked; `site_tabs` is the jump between the two sites | Header on both sites |
| `footer_click` | link_text, link_url | A footer link is clicked | Springspot footer (willvinton.com's footer has no links) |
| `cta_click` | cta_label, cta_location, link_url | A button or primary link is clicked | Hero, header, page buttons, paywall |
| `click` | outbound=true, link_url, link_domain, link_text | A link to another domain is clicked. Same name and parameters as GA4's enhanced measurement, plus site_section | Everywhere |
| `social_click` | network (`linkedin`, `github`, …), link_url, cta_location | A social profile link is clicked; also sends `click` | Contact, work section |
| `contact_click` | contact_method (`email`, `phone`), cta_location | A `mailto:`/`tel:` link is clicked. The address is never sent | Contact |
| `copy_to_clipboard` | content_type (`email`), ui_action (`copied`/`selected`), ui_location | The Copy button worked, or fell back to selecting the text | Contact |
| `form_start` | form_id, form_name | First answer or keystroke in a form | Score, Stack gate |
| `form_submit` | form_id, form_name | The submit succeeded | Score, Stack gate |
| `form_error` | form_id, form_name, field_name, error_type (`required`, `invalid_format`, `submit_failed`), step_number | Validation failed or the send failed. The field name is sent, never the value | Score, Stack gate |
| `form_abandon` | form_id, form_name, field_name (last field touched) | The page is left after `form_start` without a `form_submit` | Score, Stack gate |
| `generate_lead` | lead_source (`springspot_score`, `stack_breakdown`), form_id | Klaviyo accepted the email | Score, Stack gate |
| `resume_download` | file_name, file_extension, link_url | A resume file link is clicked | Ready; no resume on the site yet |
| `file_download` | file_name, file_extension, link_url | Any other file link is clicked | Ready; no files yet |
| `project_view` | project_name, project_status | A project card is half on screen, or a work-history job is shown or opened (once each) | Now building, Work |
| `project_click` | project_name, project_status, link_url | A link inside a project is clicked | Springspot AI card |
| `scroll_depth` | percent_scrolled (25/50/75/90), content_type, post_title, post_slug | The reader passes each mark. On posts it's measured against the post body, elsewhere against the page | Every page |
| `read_complete` | content_type, post_title, post_slug | The end of the post body is on screen | Blog posts, free Path guides |
| `score_start` | – | The first answer in the Score | /springspot/score/ |
| `score_step` | step_number (1–6), step_name (checkpoint name, or `email`) | A step is completed | /springspot/score/ |
| `score_complete` | score_total (0–100), score_level, weakest_checkpoint | A fresh result is shown (not a remembered one). Never the email | /springspot/score/ |
| `score_cta_click` | cta_label, cta_location (`score_result`), link_url, score_level, score_total | A next step, pricing or Retake on the result is clicked | /springspot/score/ |
| `accordion_open` | ui_item, ui_location, ui_action (`row`, `year_chip`) | A collapsed section is opened, or a job in the work history is picked | Work |
| `carousel_nav` | ui_action (`prev`/`next`), ui_location | A carousel arrow is clicked | What I do |

Every event also carries `site_section`. In debug mode it also carries `debug_mode: true`.

**Not tracked, because the sites have none:** video, modals, tabs, site search. Use `data-track` with a new snake_case name when one is added, add it to `scripts/build-gtm-import.mjs`, regenerate, and re-import into GTM.

## Rules

- **No personal data.**
  - Never send emails, names, phone numbers, typed values or query strings.
  - `link_url` is origin + path only (plus a plain `#anchor`).
  - The helper drops any value that looks like an email address or phone number, and logs a warning in debug mode.
- **Names:** event and parameter names are snake_case, up to 40 characters. Values are cut to 100 characters, GA4's limit.
- **Use GA4's recommended names** where one fits: `generate_lead`, `file_download`, `click`, `form_start`/`form_submit`.
- **New events and parameters:** add them to `EVENTS`/`PARAMS` in `scripts/build-gtm-import.mjs`, regenerate, and re-import. `scripts/check-tracking.mjs` fails if the site sends anything the GTM tag doesn't forward.

## Debug mode

- Add `?ga_debug=1` to any URL. It sticks in this browser until `?ga_debug=0`.
- Every event then gets `debug_mode: true`, so it shows in GA4 DebugView, and is logged to the console as `[wvTrack] event {params}`.
- See `docs/tracking-test-plan.md` for the click-through test and `docs/ga4-setup.md` for the GA4 Admin settings.

## Automated check

Assemble the site the way `deploy.yml` does, serve the folder, then run:

```bash
node scripts/check-tracking.mjs http://localhost:4620
```

It drives every page in a headless browser with Klaviyo stubbed, and checks:
- every event and its parameters
- that nothing personal gets through
- that every event and parameter is wired into the GTM tag
