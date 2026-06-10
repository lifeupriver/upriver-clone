# fixture-site — hosted scrape target for the Tier B website e2e

A 4-page static site (Wildflour Bakery, **entirely fictional**) that serves as the
stable, permissioned, reproducible scrape target for
`scripts/e2e-website-tier-b.sh` (Build Spec 16). Firecrawl scrapes from its
cloud, so the fixture must be publicly hosted — a localhost server cannot work.

## Provenance & content rules

- Structure and tone are derived from `clients/wb-fixture/` (the committed
  Wildflour Bakery fixture), which was sanitization-verified in Build Spec 15
  (4-gram-swept, fictional). All prose here is either reused from wb-fixture or
  freshly written fictional copy.
- **No real-client text may enter this tree.** The Spec 15 sanitization
  standard (4-gram sweep against real-client sources) applies to any later
  edit. Names, addresses, phone numbers, and emails are fictional:
  `(555) 010-xxxx`, `hello@wildflourbakery.example`, Milltown NY.
- Pinned forever: no JS, no external fonts or assets, no dates or dynamic
  content. Content changes land only via PR (the e2e's assertions depend on a
  stable target).

## Pages

| Route | File | Role |
|---|---|---|
| `/` | `index.html` | Content-heavy homepage (hero, 3 sections, testimonial, CTA) — deliberate clone-overflow bait |
| `/about` | `about.html` | Story + team (fictional first names) |
| `/weddings` | `weddings.html` | Event-barn / wedding-venue offering |
| `/contact` | `contact.html` | Fictional address/phone/email, no live form |

Nav links are clean root-relative paths (`/about` etc.), resolved by Vercel
`cleanUrls`. Every page also carries at least one absolute self-link to the
production URL (real sites have these; gives finalize's pass-1 deterministic
work), the exact noindex meta, and canonical + `og:url` pinned to production.

## Why noindex instead of robots.txt Disallow

A `robots.txt` with `Disallow: /` would risk blocking Firecrawl's own mapper —
the very tool this site exists to feed. Noindex is enforced two ways instead:

1. `<meta name="robots" content="noindex, nofollow">` on every page, and
2. an `X-Robots-Tag: noindex, nofollow` response header on every route
   (`vercel.json`).

`robots.txt` carries **only** the `Sitemap:` line. The sitemap pins exactly the
4 absolute production URLs so Firecrawl's map step is deterministic.

## Local check

```sh
bash scripts/checks/fixture-site-check.sh
```

Serves this directory with `python3 -m http.server` and asserts: all 4 routes
return 200 (and `/` serves index), every page carries the exact noindex meta +
a canonical link + an absolute self-link, and `sitemap.xml` lists exactly the
4 pinned URLs. The check curls the `.html` files directly — it never depends on
cleanUrl resolution, which only exists on Vercel.

## Deploying

```sh
VERCEL_TOKEN=... bash scripts/deploy-fixture-site.sh
```

One-time; re-run only on content change. Never wired into any workflow. The
script links the directory to the Vercel project `upriver-wb-fixture`
non-interactively, deploys with `--prod`, and prints the final URL.

### If the pinned URL is not available

The pinned production URL is **`https://upriver-wb-fixture.vercel.app`**
(project `upriver-wb-fixture`). If that project name is taken at deploy time,
Vercel assigns a different URL; the deploy script prints the actual URL. In
that case, update — in **one follow-up commit, before the first live run**:

1. `<link rel="canonical">` and `og:url` in all 4 pages,
2. the absolute self-links in each page footer,
3. every `<loc>` in `sitemap.xml` and the `Sitemap:` line in `robots.txt`,
4. `PINNED_URL` in `scripts/checks/fixture-site-check.sh`, and
5. the `WB_LIVE_URL` default in `scripts/e2e-website-tier-b.sh`.
