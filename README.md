# eamann.com

Personal portfolio site for Eric A Mann. Static HTML built with a zero-dependency Node.js templating script and deployed to GitHub Pages via GitHub Actions.

## Project Structure

```
src/
  layouts/base.html       — shared HTML shell (nav, head, footer, scripts)
  pages/index.html        — homepage content
  pages/talks.html        — conference talks
  work/*.html             — case study pages
  css/core.css            — global styles
  js/atmosphere.js        — loader: variant picker, lifecycle, Konami code,
                            cookie persistence, accessibility, debug API
  js/bg-starfield.js      — default background (80%)
  js/bg-vaporwave.js      — alt backgrounds, 4% each
  js/bg-mobius.js
  js/bg-tesseract.js
  js/bg-abyss.js
  js/bg-dunes.js
images/                   — avatars, favicons (copied to dist)
.well-known/              — webfinger, security.txt (copied to dist)
humans.txt                — contact info per humanstxt.org
llms.txt                  — discovery file for AI crawlers (llmstxt.org)
robots.txt
CNAME
build.js                  — build script
watch.js                  — dev server with file watching
Makefile                  — convenience targets
```

## How It Works

`build.js` reads `src/layouts/base.html` as a layout template with `{{title}}`, `{{description}}`, and `{{content}}` slots. Each page file provides its title and description via HTML comments at the top:

```html
<!-- title: Page Title -->
<!-- description: Meta description text. -->

<section>...page content...</section>
```

The build script strips those comments, injects the content into the layout, and writes the result to `dist/`. Static directories (`css/`, `js/`, `images/`, `.well-known/`) are copied alongside, and individual passthrough files (`CNAME`, `humans.txt`, `robots.txt`, `llms.txt`) are copied to the root of `dist/`.

No dependencies. No `node_modules`. Just `node build.js`.

## Local Development

Requires Node.js and Python 3 (for the dev server).

```bash
make build    # build once → dist/
make serve    # build + serve at localhost:8000 + watch for changes
make clean    # delete dist/
```

`make serve` starts a local HTTP server on port 8000 and watches `src/` for changes, automatically rebuilding on save.

## Deployment

The site deploys to GitHub Pages via a GitHub Actions workflow (`.github/workflows/deploy.yml`). Every push to `master` triggers a build-and-deploy cycle. Manual deploys can be triggered from the Actions tab.

**One-time setup:** In the repo's **Settings → Pages**, set the source to **GitHub Actions**.

The `CNAME` file is included in the build output so the custom domain (`eamann.com`) is configured automatically.

## Atmosphere System

The site has six background variants. Each runs its own WebGL or 2D canvas animation and registers itself on `window.Atmospheres[name]` with `{ init(), destroy() }` hooks. `src/js/atmosphere.js` is the loader that picks one, manages its lifecycle, and listens for overrides.

The chosen variant is persisted in an `eam_atmo` cookie. Expiry scales inversely with weight via linear interpolation through two anchor points (weight 80 → 24h, weight 20 → 168h), clamped to [24h, 30d]. Starfield expires in 24h; the 4% variants stick for ~8.6 days.

**Overrides:**

- `↑↑↓↓←→←→ B A 1-6` — jump directly to variant N
- `↑↑↓↓←→←→ B A Enter` — cycle to the next variant in canonical order (wraps)
- `Atmosphere.set('name')` / `.next()` / `.list()` / `.current()` / `.clear()` — debug API in the browser console

**Accessibility:** visitors with `prefers-reduced-motion: reduce` are locked to the starfield regardless of stored cookie. The loader force-rewrites the cookie to match so the preference wins on every load.

**Mobile:** on touch-primary devices (`hover: none` and `pointer: coarse`), variants flagged `mobileFriendly: false` have their weight divided by 10 for the weighted pick. `abyss` and `dunes` are flagged that way — they're cursor-dependent and CPU-heavy, so they still *can* roll but are 10× rarer.

## Adding a Page

1. Create an HTML file under `src/pages/` or `src/work/` with title/description comments at the top.
2. Add an entry to the `pages` array in `build.js`.
3. Link to it from wherever makes sense (homepage card, nav, etc.).
4. Run `make build` to verify.

## Adding an Atmosphere Variant

1. Create `src/js/bg-<name>.js` that registers itself on `window.Atmospheres.<name>` with `init()` and `destroy()`. Use an existing module as a template. `destroy()` must cancel any `requestAnimationFrame` loops and remove event listeners.
2. Add a `<script src="/js/bg-<name>.js"></script>` tag to `src/layouts/base.html` **before** `atmosphere.js` so registration happens before the loader runs.
3. Add an entry to the `VARIANTS` array in `src/js/atmosphere.js` with `name`, `weight`, and `mobileFriendly`. Array order matters — index + 1 is the Konami digit.
4. Run `make build` to verify.

## License

MIT — see [LICENSE](LICENSE).
