# eamann.com

Personal portfolio site for Eric A Mann. Static HTML built with a zero-dependency Node.js templating script and deployed to GitHub Pages.

## Project Structure

```
src/
  layouts/base.html    — shared HTML shell (nav, head, footer, scripts)
  pages/index.html     — homepage content
  pages/talks.html     — conference talks
  work/*.html          — case study pages
  css/core.css         — global styles
  js/atmosphere.js     — background canvas effects
images/                — avatars, favicons (copied to dist as-is)
.well-known/           — webfinger (copied to dist as-is)
build.js               — build script
watch.js               — dev server with file watching
Makefile               — convenience targets
```

## How It Works

`build.js` reads `src/layouts/base.html` as a layout template with `{{title}}`, `{{description}}`, and `{{content}}` slots. Each page file provides its title and description via HTML comments at the top:

```html
<!-- title: Page Title -->
<!-- description: Meta description text. -->

<section>...page content...</section>
```

The build script strips those comments, injects the content into the layout, and writes the result to `dist/`. Static assets (`css/`, `js/`, `images/`, `.well-known/`, `CNAME`) are copied alongside.

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

The site deploys to GitHub Pages via a GitHub Actions workflow (`.github/workflows/deploy.yml`). Every push to `main` triggers a build-and-deploy cycle. Manual deploys can be triggered from the Actions tab.

**One-time setup:** In the repo's **Settings → Pages**, set the source to **GitHub Actions**.

The `CNAME` file is included in the build output so the custom domain (`eamann.com`) is configured automatically.

## Adding a Page

1. Create an HTML file under `src/pages/` or `src/work/` with title/description comments at the top.
2. Add an entry to the `pages` array in `build.js`.
3. Link to it from wherever makes sense (homepage card, nav, etc.).
4. Run `make build` to verify.

## License

MIT — see [LICENSE](LICENSE).
