# Search (SEO)

How willvinton.com and Springspot AI (`/springspot/`) are set up for search, what the November 2026 audit found, and the jobs that can't be done in code.

## How it fits together

Both sites deploy as one GitHub Pages site from this repo (`.github/workflows/deploy.yml`), so they share one domain, one `robots.txt` and one sitemap.

| Address | What it is | Where it comes from |
|---|---|---|
| `/robots.txt` | Allows everything; points at the sitemap | `robots.txt` here |
| `/sitemap.xml` | Sitemap index: the two below | `.github/scripts/build-sitemap.mjs`, at deploy |
| `/sitemap-pages.xml` | willvinton.com's own pages: the homepage, `/labs/` and any indexable Labs project | same |
| `/springspot/sitemap.xml` | Every indexable Springspot page, with `lastmod` on posts | Springspot's build (`integrations/seo-output.mjs`) |
| `/springspot/rss.xml` | The blog's RSS feed | Springspot (`src/pages/rss.xml.ts`) |
| `/404.html` | Served for any missing address on the site (noindex) | `404.html` here |
| `/og-card.jpg` | The homepage's share image | `scripts/social-card.mjs` |
| `/fractional/og-card.jpg` | The fractional leadership page's share image | `scripts/social-card.mjs` |
| `/labs/og-card.jpg` | The Labs share image, also the default for Labs projects | `scripts/social-card.mjs` |

**Homepage (`index.html`):** title, description, canonical, robots, Open Graph and Twitter card tags with `og-card.jpg`, `rel="me"` links, the blog's feed, and a JSON-LD graph of `WebSite`, `ProfilePage` and `Person` (`@id` `https://www.willvinton.com/#person`, with `sameAs` to LinkedIn, GitHub and the Springspot author page). Keep `willvinton.html` in step: it's the same page without the document wrapper, the canonical or the GTM noscript.

**Fractional leadership (`/fractional/`):** the service page for fractional CDO / VP / Director of Ecommerce work. Its JSON-LD is `WebPage`, `BreadcrumbList`, `Person`, `ProfessionalService` (with the four engagement models as an `OfferCatalog`) and `FAQPage`, built from the visible FAQ, so edit both together. The homepage links to it from the nav and the contact section, and its `Person` node points at the service with `makesOffer`. The enquiry form writes an email in the visitor's mail app (there's no server); see `TRACKING.md` for its events.

**Springspot Labs (`/labs/`):** the same share tags and a JSON-LD `CollectionPage` + `BreadcrumbList`, attributed to the homepage's Person. The project template (`labs/_template/`) carries them too, with placeholders, and stays `noindex` until a project is ready (see `labs/README.md`). Any new page on this repo needs these tags, or the deploy check fails.

**Latest posts on the homepage:** the deploy rewrites the list between `<!-- latest-posts -->` and `<!-- /latest-posts -->` with the three newest posts from the feed (`.github/scripts/inject-latest-posts.mjs`), so the site's strongest page always links to new writing. The list in the repo is only the fallback.

**Springspot:** see its README, "Search and sharing". In short: `BaseLayout` writes every page's metadata and JSON-LD, each post has its own share card, paid Path parts are `noindex, follow` while they're a teaser, and any build not for a production host is `noindex`.

**The check:** `scripts/check-seo.mjs` runs in every deploy, after the site is assembled, and fails it if an indexable page loses its title, description, canonical, `<h1>`, social tags or valid JSON-LD; if any internal link or asset is broken; or if the sitemaps list a page that's missing or noindex. Run it locally against an assembled `_site`:

```sh
node scripts/check-seo.mjs _site https://www.willvinton.com
```

**Share images:** re-render after changing the homepage's headline numbers or headshot with `npx -y -p playwright@1 node scripts/social-card.mjs`. Springspot's post cards come from its own `scripts/social-cards.mjs`.

## Audit, November 2026

What was wrong before this work, and what changed.

| Area | Found | Now |
|---|---|---|
| Sitemap | None anywhere | Sitemap index at `/sitemap.xml`, built from the pages themselves, so it can't drift |
| robots.txt | None (GitHub's 404) | Allows all, names the sitemap |
| 404 page | GitHub's default | Branded, noindex, links back to both sites and the blog |
| RSS | None | `/springspot/rss.xml`, linked from every page's `<head>` |
| Share images | Springspot: none on any page. Homepage: the square headshot, no size or alt | 1200×630 card per post, a site card, and a homepage card, with size and alt text |
| Twitter/X cards | None | `summary_large_image` everywhere |
| Structured data | Posts and author page only; publisher had no logo; breadcrumbs skipped Home; homepage Person had no `@id` | One linked graph on every page: Organization (with logo) and WebSite, a typed page node, breadcrumbs from Home, plus Blog, BlogPosting (with image and word count), TechArticle for free guides, ProfilePage |
| Internal links | Every link (`/blog`, `/score`) hit a 301 to the slash version; canonicals and schema URLs disagreed | Links, canonicals, schema and sitemap all use the trailing-slash URL |
| Thin pages | 15 paid Path parts (teaser + paywall) indexable | `noindex, follow` until the paid content is live; out of the sitemap |
| Duplicate site risk | Springspot builds for `springspot.pages.dev` (Cloudflare) had self-canonicals there | Only `www.willvinton.com` and `springspot.ai` builds are indexable; everything else is `noindex, nofollow` |
| Titles and descriptions | Homepage title was just the name; homepage and Springspot home descriptions over 200 characters; author page description 234 | Descriptive titles; descriptions within 160 |
| Post discovery | Posts only linked from the blog index | Homepage lists the newest three; every post ends with three related posts |
| Robots directives | None | `max-image-preview:large` and full snippets allowed, for large images in Discover and results |

**Still worth doing (content, not code):**
- Three post titles run past ~60 characters and will be cut off in results (the deploy check warns about these). Fine to leave, but front-load the keyword.
- The homepage says "seventeen years"; the Springspot author bio says "about 18". Pick one so the two read as the same person.
- Link between posts in the body copy where it's natural; related posts help, but in-text links help more.
- When springspot.ai goes live, GitHub Pages can't send real 301 redirects. Put the new domain behind something that can (Cloudflare redirect rules), add it to `PRODUCTION_HOSTS` in Springspot, and use Search Console's Change of Address tool.

## Jobs for you (can't be done from code)

Do these once both pull requests are merged and the deploy has run. Check that `https://www.willvinton.com/sitemap.xml` and `https://www.willvinton.com/robots.txt` load first.

1. **Add the site to Google Search Console** (https://search.google.com/search-console).
   - Best: a **Domain** property for `willvinton.com`, verified with a DNS TXT record at your registrar. It covers www and non-www, http and https.
   - Quicker: a **URL prefix** property for `https://www.willvinton.com/`, verified with the **Google Tag Manager** method (the GTM container is already on every page; you need Publish permission on it).
2. **Submit the sitemap:** Sitemaps → enter `sitemap.xml` → Submit. Only submit the index; it brings in the other two. Expect "Success" and about 43 discovered URLs.
3. **Request indexing for the key pages:** URL Inspection → paste the URL → Request indexing. There's a daily limit of about 10, so start with the homepage, `/springspot/`, `/springspot/blog/`, then the posts, newest first.
4. **Check the Pages report after 3 to 7 days.** "Excluded by 'noindex' tag" is expected for the paid Path parts, the 404 page and the `/springboard/` and `/springsboard/` forwarding pages. Anything else excluded is worth a look.
5. **Link Search Console to GA4:** GA4 Admin → Product links → Search Console links, so search queries show up next to the GA4 events.
6. **Bing Webmaster Tools** (https://www.bing.com/webmasters): sign in and **Import from Google Search Console**. That brings the site and sitemap over in one step, and Bing also feeds DuckDuckGo and ChatGPT search.
7. **Confirm the domain redirects:** in GitHub → Settings → Pages, the custom domain is `www.willvinton.com` and **Enforce HTTPS** is ticked. `http://willvinton.com` should land on `https://www.willvinton.com/` in one hop. If the apex doesn't redirect, its DNS needs GitHub Pages' A records.
8. **If a Cloudflare Pages project for Springspot exists** (`springspot.pages.dev`), search `site:springspot.pages.dev` on Google. Its pages will be noindex from the next Cloudflare build; if nothing uses that project, delete it.
9. **Refresh share previews** for links you've already posted: LinkedIn Post Inspector (https://www.linkedin.com/post-inspector/) re-reads a URL's card.
10. **Spot-check structured data** on a post with Google's Rich Results Test (https://search.google.com/test/rich-results). It should find Article, Breadcrumbs and FAQ with no errors.

For each new post after that: nothing is required. The daily deploy publishes it, adds it to the sitemap and the feed, and lists it on the homepage. Requesting indexing for it in Search Console just speeds things up.
