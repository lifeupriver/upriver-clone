# Handoff — Build "capture all major pages → full-page screenshots for Claude Design"

You're picking up an upriver-clone session mid-stream. The repo is `/Users/joshua/Documents/Github/upriver-clone`. Read `/Users/joshua/CLAUDE.md` first for project conventions.

## What you're building

A new CLI mode + asset bundle so we can hand the user's design system over to **Claude Design**:

1. **Identify every "major" page on the live client site** — the ones in the primary navigation, plus a small set of conventionally important pages (homepage, contact, about, services/programs, etc.). **Exclude** expensive long-tail content like blog posts, individual product detail pages, dated archives, and search/sitemap pages. Don't try to clone 200 blog posts.
2. **For each major page, capture a full-page desktop and mobile screenshot via Playwright** at high enough resolution that Claude Design can reimagine the whole layout from them. Save them in a single, well-named folder so the user can drag-drop the entire batch into Claude Design.
3. **Make sure every major page gets cloned** by the existing pipeline — i.e. extend the existing per-page work (rawhtml + screenshot + Astro page) to cover every major page automatically, not just the 7 we've already done for `littlefriends`.

The goal: at the end of the audit, the user can say to Claude Design "here are 14 full-page screenshots of the current site — here's the audit + brand voice guide + interview answers — now reimagine it." Claude Design needs **full-page** images, not viewport crops.

## What's already in place (don't redo)

The previous Claude session built up a comprehensive clone toolchain. Read these first:

- `packages/cli/src/commands/capture-typography.ts` — Playwright-driven measurement of computed font family/size/weight/line-height + logo dimensions on the live homepage. Output: `clients/<slug>/typography-capture.json`. Already wired into scaffold.
- `packages/cli/src/commands/capture-ux.ts` + `packages/cli/src/ux-capture/profile.ts` — UX dossier per page (carousels, animations, sticky elements, hover effects, videos, iframes). Output: `clients/<slug>/ux-profile/<page>.json` plus optional flipbook PNGs and webm recordings.
- `packages/cli/src/commands/clone-embeds.ts` + `packages/cli/src/clone/embed-audit.ts` — audits iframes (Google Maps, YouTube, Calendly, Tally, Mailchimp, etc.), forms, and 3rd-party script widgets. Compares live vs cloned, flags missing.
- `packages/cli/src/commands/clone-links.ts` + `packages/cli/src/clone/link-check.ts` — internal-link-graph audit. Walks `dist/client/`, verifies every `href`/`src` resolves, checks for missing pages and orphans. Has a built-in skiplist for editor-chrome paths (`/s/order`, `/cart`, etc.).
- `scripts/capture-live.mjs` — Playwright full-page screenshots of every URL in `audit-package.siteStructure.pages`. Output: `clients/<slug>/screenshots/live/{desktop,mobile}/<page>.png`. **This is the foundation for what you need to build.**
- `scripts/clone-compare.mjs` — builds the cloned site, screenshots every page, stitches side-by-side with pixel-similarity scores.

The existing `siteStructure.pages` in `audit-package.json` already lists every URL the discover/scrape pass found. **What's missing is a "major-page" filter that's smart about blog posts and product pages.**

## What `littlefriends` already has (the working example)

- 7 cloned `.astro` pages: `/`, `/admissions`, `/contact-us`, `/faqs-1`, `/summer-1`, `/what-is-montessori-1`, `/summerfall-2023-enrollment`. All have real photos, real verbatim copy from rawhtml, real font sizes from typography capture, full-bleed mission section, embedded Google Map, captured logo size (94×86).
- Skipped (not cloned): `/s/order`, `/s/shop`, `/s/stories/story-title`, `/sitemap.xml`, `/support`, `/product/little-friends-donation-fund/4` — these are Square Online editor chrome.
- Full-page live screenshots already captured at `clients/littlefriends/screenshots/live/desktop/*.png` and `.../mobile/*.png` via `scripts/capture-live.mjs`.

For `littlefriends` specifically, the user wants the clone to look like the live site so they can use it as a baseline before redesigning with Claude Design. Visual fidelity is acceptable now (~68% pixel similarity on home, ~98% on simple pages — visual quality is much higher than the number suggests because pixelmatch over-penalizes sub-pixel shifts).

## What you need to build

### 1. New CLI command: `upriver major-pages <slug>`

Classifies pages as `major` or `skip`. **Outputs `clients/<slug>/major-pages.json`** with the resolved list.

#### Heuristic for "major"

**Always-major** (do clone + screenshot):
- Homepage (`/`)
- Anything reachable from the primary `<nav>` of the homepage
- Pages whose path matches conventional hubs: `/about`, `/contact`, `/services`, `/team`, `/menu`, `/faq`, `/pricing`, `/admissions`, `/programs`, `/locations`, `/hours`, `/visit`, `/careers`, `/work`, `/portfolio`
- Pages whose `audit-package` `headings` includes a meaningful h1 (suggests it's a real page, not a stub)

**Always-skip** (don't clone, don't screenshot):
- Blog post detail pages: `/blog/<slug>`, `/posts/<slug>`, `/news/<slug>`, `/articles/<slug>`, dated patterns like `/2024/03/some-post`, `/<year>/<month>/...`
- Individual product detail pages: `/product/<slug>`, `/shop/<slug>/<id>`, `/store/<slug>`, anything with a SKU-shaped suffix
- Tag/category archives: `/tag/<x>`, `/category/<x>`, `/topic/<x>`, `/author/<x>`
- Pagination shards: `/page/2`, `/?page=2`
- Search / sitemap / utility: `/search`, `/sitemap*`, `/robots.txt`, `/feed`, `/rss`, `/atom.xml`
- Editor/SaaS chrome (already covered): `/s/order`, `/s/shop`, `/cart`, `/checkout`, `/login`, `/account` etc.
- 4xx/5xx pages

**Index-page exception**: If a section is large (lots of blog posts) but has a top-level index (`/blog`, `/products`), keep the **index** as major and skip the children. The index gives Claude Design enough context.

#### Implementation notes

- Read `audit-package.json` and the homepage rawhtml at `clients/<slug>/rawhtml/home.html`.
- Extract the homepage `<nav>`'s `href` list (parse with the existing regex pattern in `link-check.ts`, or use a small DOM walker on the `<header>` block).
- Apply the heuristic above. Cap the list at 25 pages per client; if more match, prefer pages reachable from nav over conventional-hub matches.
- Write `clients/<slug>/major-pages.json` with shape `{ major: SitePage[], skipped: Array<{ page: SitePage, reason: string }>, generatedAt }`.
- Print a human-readable table when run interactively. Use `--json` flag for machine-readable.

#### CLI flags

- `--include <path>` (multi) — force a path into `major` even if heuristic skipped it
- `--exclude <path>` (multi) — force a path into `skipped`
- `--max <n>` — override the cap (default 25)

### 2. New CLI command: `upriver capture-major <slug>`

For every page in `major-pages.json`:

- Take a full-page desktop screenshot (1440×n, no cap on height) via Playwright. Use the same scroll-trigger-lazy-images dance as `scripts/capture-live.mjs`.
- Take a full-page mobile screenshot (414×n).
- Output:
  - `clients/<slug>/design-handoff/desktop/<page>.png`
  - `clients/<slug>/design-handoff/mobile/<page>.png`
  - `clients/<slug>/design-handoff/manifest.json` listing every file with its source URL, dimensions, and the page's role from `major-pages.json`
  - **`clients/<slug>/design-handoff/<slug>-design-handoff.zip`** — single archive of every screenshot + manifest, named so the user can attach it to Claude Design in one drag-drop.

These screenshots are the LIVE site, not the clone. Claude Design needs to see what the user has today.

#### Optional but valuable

- Add `--include-clone` flag that ALSO screenshots the cloned dist (after building) at the same viewports, so Claude Design can see "here's what we have today" + "here's what we already started rebuilding". Output to `design-handoff/clone-desktop/` and `design-handoff/clone-mobile/`.
- Compose a single tall PNG per page with `[live | clone]` side-by-side at full height. This lets Claude Design see the existing work + the original simultaneously.

### 3. Make sure every major page gets a cloned `.astro`

The existing `upriver clone <slug>` runs the agent per page from `siteStructure.pages`. **Wire it to default to the major-pages list** instead of all pages. Specifically:

- After `upriver major-pages <slug>` runs, store the result.
- `upriver clone <slug>` should read `major-pages.json` and only clone pages in `major`. Add a `--all-pages` flag for the old behavior.
- For `littlefriends`, this should produce the same 7 pages we have today (homepage + 6 nav targets, excluding the donation-fund product page and the s/* chrome).

Then the user can run a single command — `upriver capture-major littlefriends` — and get a clean handoff bundle.

### 4. (Stretch) Wire it into the dashboard

The dashboard has `/clients/<slug>/site.astro` already. Add a button "Generate Claude Design handoff bundle" that triggers `upriver capture-major` via the existing `/api/run/<command>` endpoint, then offers the resulting zip for download.

This is a stretch goal — only do it if the rest is solid.

## How to verify your work on `littlefriends`

```sh
# 1. Generate the major-pages list (should pick 7 pages — same as what's cloned)
node packages/cli/bin/run.js major-pages littlefriends

# 2. Capture the design-handoff bundle
node packages/cli/bin/run.js capture-major littlefriends

# 3. Verify the bundle is complete
ls clients/littlefriends/design-handoff/desktop/
# Should list: home.png, admissions.png, contact-us.png, faqs-1.png, summer-1.png, what-is-montessori-1.png, summerfall-2023-enrollment.png

ls clients/littlefriends/design-handoff/littlefriends-design-handoff.zip

# 4. Open one to verify it's a real full-page screenshot, not a viewport crop
open clients/littlefriends/design-handoff/desktop/home.png
```

The home.png should be ~1440×3800px tall (full live page), with the entire scroll captured.

## Things to know

### Data sources
- `clients/<slug>/audit-package.json` — `siteStructure.pages` lists every URL discovered. Each has `slug`, `url`, `title`, `headings`, `ctaButtons`, `statusCode`. **This is your input list.**
- `clients/<slug>/rawhtml/<page>.html` — Firecrawl-scraped HTML per page. Contains the live `<nav>` to extract from.
- `clients/<slug>/screenshots/live/{desktop,mobile}/<page>.png` — already-captured screenshots from `scripts/capture-live.mjs`. **Reuse these where possible** instead of re-capturing.

### Where to put new code
- `packages/cli/src/major-pages/classify.ts` — pure-function classifier (testable, no Playwright)
- `packages/cli/src/commands/major-pages.ts` — CLI wrapper
- `packages/cli/src/commands/capture-major.ts` — CLI wrapper. Lazy-import playwright the same way `capture-typography.ts` does.
- Use `node:zlib` or `node:child_process` shelling out to `zip` for the archive — both are fine. The repo doesn't currently depend on a zip lib.

### Conventions
- Follow `/Users/joshua/CLAUDE.md` — Prettier, single quotes, 100 chars, 2-space indent. Run `pnpm -C packages/cli typecheck` before committing.
- The CLI uses `@oclif/core`. New commands go in `packages/cli/src/commands/<name>.ts`, follow the existing pattern (`Args`, `Flags`, `BaseCommand`).
- The CLI is a workspace package — build with `pnpm -C packages/cli build`. Run via `node packages/cli/bin/run.js <command>`. The dist/ outputs need `pnpm build` after edits or oclif won't pick them up.

### Auth / API context
- `FIRECRAWL_API_KEY` in `.env` works (used by scrape).
- `ANTHROPIC_API_KEY` in `.env` is invalid — don't try to call the SDK directly. The user prefers using their Claude Max subscription via this session for any LLM step. For this task, no LLM is needed — it's pure heuristics + Playwright.
- Playwright is installed at `packages/cli/node_modules/playwright`. Standalone scripts under `scripts/` import it via the URL hack:
  ```js
  const cliRoot = new URL('../packages/cli/node_modules/', import.meta.url).href;
  const { chromium } = await import(`${cliRoot}playwright/index.mjs`);
  ```

## Why this matters

The user's whole pipeline ends with **Claude Design reimagining the site after the audit + interview**. Right now Claude Design has no good way to see "what does this site look like today across all major pages?" The audit is structured findings. The interview is text. The cloned `.astro` is structurally close but not visually identical. **Full-page live screenshots of every major page is the missing input.** Get this right and the design handoff becomes one upload instead of fifty.

Don't over-engineer. The classifier doesn't need to be perfect — it needs to be right 90% of the time and let the user override with `--include`/`--exclude` for the 10%. The screenshot capture doesn't need to be artful — full-page PNGs are the deliverable.

## Things that are out of scope for this session

- Don't redo the typography / UX / embed / link-check work. They're stable.
- Don't try to make the cloned site look prettier on the homepage — that's already at "good enough for the audit baseline."
- Don't migrate the dashboard preview routes — also stable.
- Don't add new visual diff scoring — the existing pixelmatch in `clone-compare.mjs` is fine for now.

## Recent state to be aware of

- `git status` shows ~12 modified files + ~10 new ones. Don't commit unless the user asks.
- The dashboard server was running on `127.0.0.1:4400` during the previous session and is now stopped. To restart: `UPRIVER_DATA_SOURCE=local UPRIVER_CLIENTS_DIR=/Users/joshua/Documents/Github/upriver-clone/clients HOST=127.0.0.1 PORT=4400 node packages/dashboard/dist/server/entry.mjs &` (use `HOST=127.0.0.1` not localhost — there's an IPv6/IPv4 quirk with the macOS resolver).
- The cloned `littlefriends` repo is built at `clients/littlefriends/repo/dist/client/`. To rebuild after changes: `cd clients/littlefriends/repo && pnpm build`.

## Done when

```sh
node packages/cli/bin/run.js major-pages littlefriends
# → prints a 7-row table of major pages, plus the skipped ones with reasons

node packages/cli/bin/run.js capture-major littlefriends
# → builds clients/littlefriends/design-handoff/ with 7 desktop + 7 mobile full-page PNGs
# → builds clients/littlefriends/design-handoff/littlefriends-design-handoff.zip

# The user can drag the zip into Claude Design and start the redesign.
```

Use TaskCreate to break this into ~5 tasks and check them off as you go. Good luck.
