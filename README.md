# eamann.com

Personal portfolio site for Eric A Mann. Static HTML built with a Node.js templating script and deployed to GitHub Pages via GitHub Actions.

## Project Structure

```
src/
  layouts/base.html            — shared HTML shell (nav, head, footer, scripts)
  pages/index.html             — homepage content
  pages/talks.html             — conference talks
  pages/atmosphere.html        — hidden atmosphere collection page
  now/template.html            — /now page template
  now/content.md               — /now page Markdown content (edit this)
  work/*.html                  — case study pages
  css/core.css                 — global styles
  js/atmosphere-registry.js    — single source of truth for variant metadata
  js/atmosphere.js             — loader: variant picker, lifecycle, Konami code,
                                 cookie persistence, accessibility, debug API
  js/atmosphere-collection.js  — atmosphere collection page logic
  js/transmissions.js          — homepage feed (blog RSS + Mastodon)
  js/bg-starfield.js           — default background (80%)
  js/bg-vaporwave.js           — alt backgrounds, 4% each
  js/bg-mobius.js
  js/bg-tesseract.js
  js/bg-abyss.js
  js/bg-dunes.js
images/                        — avatars, favicons (copied to dist)
images/atmo/                   — static atmosphere preview screenshots
scripts/capture-atmospheres.js — Playwright script to regenerate screenshots
.well-known/                   — webfinger, security.txt (copied to dist)
humans.txt                     — contact info per humanstxt.org
llms.txt                       — discovery file for AI crawlers (llmstxt.org)
robots.txt
CNAME
build.js                       — build script
watch.js                       — dev server with file watching
Makefile                       — convenience targets
```

## How It Works

`build.js` reads `src/layouts/base.html` as a layout template with `{{title}}`, `{{description}}`, and `{{content}}` slots. Each page file provides its title and description via HTML comments at the top:

```html
<!-- title: Page Title -->
<!-- description: Meta description text. -->

<section>...page content...</section>
```

The build script strips those comments, injects the content into the layout, and writes the result to `dist/`. Static directories (`css/`, `js/`, `images/`, `.well-known/`) are copied alongside, and individual passthrough files (`CNAME`, `humans.txt`, `robots.txt`, `llms.txt`) are copied to the root of `dist/`.

The `/now` page is special: `build.js` reads `src/now/content.md`, parses YAML frontmatter for the `updated` date, renders the Markdown body via `marked`, and injects both into `src/now/template.html` before wrapping in the base layout.

## Local Development

Requires Node.js (18+).

```bash
npm ci            # install dependencies (marked)
make build        # build once → dist/
make serve        # build + serve at localhost:8000 + watch for changes
make clean        # delete dist/
```

`make serve` starts a local HTTP server on port 8000 and watches `src/` for changes, automatically rebuilding on save.

### Regenerating atmosphere screenshots

```bash
npm ci                                # installs playwright (devDependency)
npx playwright install chromium       # one-time browser download
node scripts/capture-atmospheres.js   # builds → serves → captures → saves to images/atmo/
```

## Deployment

The site deploys to GitHub Pages via a GitHub Actions workflow (`.github/workflows/deploy.yml`). Every push to `master` triggers a build-and-deploy cycle. Manual deploys can be triggered from the Actions tab.

**One-time setup:** In the repo's **Settings → Pages**, set the source to **GitHub Actions**.

The `CNAME` file is included in the build output so the custom domain (`eamann.com`) is configured automatically.

CI runs `npm ci --omit=dev` (skips Playwright) then `node build.js`.

## /now Page

Edit `src/now/content.md` to update. The file uses YAML frontmatter:

```markdown
---
updated: 2026-04-10
---

## Section Title

Content here...
```

Push to master and the deploy workflow handles the rest.

## Transmissions Feed

The homepage "Latest Signals" section fetches the latest blog post from `eric.mann.blog/feed/` (RSS/XML) and the 4 most recent Mastodon posts from `tekton.network`. Content is cached in `localStorage` with a 24h TTL. All items render with a concurrent typewriter animation.

**CORS prerequisite:** The blog RSS feed requires `Access-Control-Allow-Origin: *` on the `/feed/` path, configured via a Cloudflare Transform Rule on `eric.mann.blog`.

## Atmosphere System

The site has six background variants. Each runs its own WebGL or 2D canvas animation and registers itself on `window.Atmospheres[name]` with `{ init(), destroy() }` hooks. `src/js/atmosphere.js` is the loader that picks one, manages its lifecycle, and listens for overrides.

Variant metadata (id, name, weight, rarity, mobileFriendly) lives in `src/js/atmosphere-registry.js` — the single source of truth used by the loader, the collection page, and the renderers.

The chosen variant is persisted in an `eam_atmo` cookie. Expiry scales inversely with weight via linear interpolation through two anchor points (weight 80 → 24h, weight 20 → 168h), clamped to [24h, 30d]. Starfield expires in 24h; the 4% variants stick for ~8.6 days.

**Overrides:**

- `↑↑↓↓←→←→ B A 1-6` — jump directly to variant N
- `↑↑↓↓←→←→ B A Enter` — cycle to the next variant in canonical order (wraps)
- `Atmosphere.set('name')` / `.next()` / `.list()` / `.current()` / `.clear()` — debug API in the browser console

**Accessibility:** visitors with `prefers-reduced-motion: reduce` are locked to the starfield regardless of stored cookie. The loader force-rewrites the cookie to match so the preference wins on every load.

**Mobile:** on touch-primary devices (`hover: none` and `pointer: coarse`), variants flagged `mobileFriendly: false` have their weight divided by 10 for the weighted pick. `abyss` and `dunes` are flagged that way — they're cursor-dependent and CPU-heavy, so they still *can* roll but are 10× rarer.

**Collection page:** `/atmosphere/` shows all 6 variants with static preview screenshots, rarity labels, and detection status. Not linked in nav — discoverable via a dim console hint. Unseen atmospheres appear grayed out with redacted names.

## Adding a Page

1. Create an HTML file under `src/pages/` or `src/work/` with title/description comments at the top.
2. Add an entry to the `pages` array in `build.js`.
3. Link to it from wherever makes sense (homepage card, nav, etc.).
4. Run `make build` to verify.

## Adding an Atmosphere Variant

1. Create `src/js/bg-<name>.js` that registers itself on `window.Atmospheres.<name>` with `init(opts)` and `destroy()`. Use an existing module as a template. `init(opts)` should accept an optional `{ canvas, width, height, preview }` object, falling back to `document.getElementById('bg')` / `window.innerWidth` / `window.innerHeight` when called without arguments. `destroy()` must cancel any `requestAnimationFrame` loops and remove event listeners.
2. Add an entry to `src/js/atmosphere-registry.js` with `id`, `name`, `weight`, `rarity`, and `mobileFriendly`. Array order determines the Konami digit (index + 1).
3. Add a `<script src="/js/bg-<name>.js"></script>` tag to `src/layouts/base.html` **after** `atmosphere-registry.js` and **before** `atmosphere.js`.
4. Regenerate screenshots: `node scripts/capture-atmospheres.js`.
5. Run `make build` to verify.

## License

MIT — see [LICENSE](LICENSE).
