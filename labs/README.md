# Springspot Labs

`/labs/` on willvinton.com. Will and his kids build games, worlds, stories and characters together. It's co-branded with Springspot AI (it uses the Springspot mark and the "lean team + AI" idea) but lives on willvinton.com, not in the Springspot repo.

## Layout

```
labs/
  index.html          Landing page: tracks, project grid, how we build, ground rules
  _template/          Starter page for one project (not deployed)
  <project-slug>/     One folder per project, copied from _template
    index.html
    play/             Optional: a browser build of the game (HTML5 export)
    art/              Optional: images, character art, maps
```

## Adding a project

1. Copy `labs/_template/` to `labs/<project-slug>/` (lowercase, hyphens).
2. Replace every CAPITALISED placeholder. Use a `.track` class that matches: `worlds`, `games`, `stories`, `chars`, `apps`.
3. Remove `<meta name="robots" content="noindex">` once it's ready to share.
4. On `labs/index.html`, turn the matching placeholder card in **Projects** into a link to the new page (keep `data-track-project` on it so views and clicks are tracked).
5. Flip that track's "Coming soon" label once it has something live.

## Ground rules (also on the page)

- The kids own their ideas; credit the creator by a studio name.
- No real names, faces, schools or locations of the kids, in copy, images, file names or alt text.
- A parent runs every account: publishing, app stores, comments, payments.
- No comments, chat or sign-ups aimed at kids on these pages.

## Tracking

Pages under `/labs/` load `/analytics.js` and send `site_section: labs`. See `TRACKING.md` at the repo root.

## Later

- A playable game embedded on a project page (`play/`).
- App store listings for the ones that catch on.
- Optional: its own domain or subdomain if it grows.
