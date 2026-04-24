# `upriver-clone` — Master Build Prompt v5

> Paste this entire document into Claude Code as your initial prompt.
> Run from the root of a new repository called `upriver-clone`.
> Build in sessions. Stop at each validation gate and ask me to review before continuing.
>
> **v4 change:** Nine marketingskills wired into audit passes, content generation, and interview pipeline.
> **v5 change:** Major /admin expansion — change request system (NL → GitHub Issue → Claude Code Action → draft PR),
> Upriver service store, full admin nav and feature set, GSC service account access pattern,
> CLI tool improvements (renamed to `upriver`, CLAUDE.md generation, CHANGELOG.md, cost tracking,
> platform detection, post-launch QA scheduling).

---

## Context

You are building a productized tool suite for **Upriver Consulting**, a Hudson Valley consulting practice that sells a website audit-and-rebuild service to small businesses. The business goal is to deliver a genuinely impressive, comprehensive audit, a branded deliverable the client signs off on, and a one-to-one clone of their existing site built on Astro — all in a workflow that costs under 4 hours of human time per client. The tool absorbs the rest.

The first real client this tool will run against is **Audrey's Farmhouse** (audreysfarmhouse.com), a multi-venue boutique wedding and events property in the Hudson Valley. Treat every design decision as something that has to work on Audrey's, but be built to work on any small business site.

---

## Installed marketing skills (read before touching any audit or content code)

The marketingskills library by Corey Haines is installed at `.agents/skills/`. These are production-tested Claude Code skill files covering CRO, SEO, copywriting, and growth. **Do not reimplement what these skills already define.** Read the relevant skill before building any module that overlaps with it — the skill's methodology becomes the module's methodology.

### How these skills work

Each skill is a SKILL.md file. Claude Code reads it automatically when invoked, or you can reference it explicitly in a prompt. All skills check `.agents/product-marketing-context.md` first before doing anything — that file is the client's business context document, equivalent to our Brand Voice Guide. For every client engagement, we generate this file during the `synthesize` command and write it to the client's repo before any marketing skill is invoked.

The `!`command`` syntax in skill files is Claude Code-only: it runs the command and injects the output inline. Keep this in mind if you see it in a skill — it works in Claude Code sessions but not in other contexts.

### The nine skills wired into our workflow

#### Audit phase (invoked inside the relevant audit pass modules)

**`.agents/skills/seo-audit/SKILL.md`** — Technical and on-page SEO audit methodology. Wire into `packages/audit-passes/seo/`. Key note from this skill: `web_fetch` strips `<script>` tags including JSON-LD, so schema detection cannot use web_fetch — it must use Firecrawl `rawHtml` or the browser tool. We already handle this correctly with Firecrawl rawHtml extraction. Reference this skill's checklist and heuristics when building the SEO pass, rather than writing our own from scratch.

**`.agents/skills/ai-seo/SKILL.md`** — AI search optimization: AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), LLMO (Large Language Model Optimization), AI Overviews, and LLM citation patterns. This skill was split out from `seo-audit` specifically to cover AI-era search. Wire into `packages/audit-passes/aeo/`. This skill's framework covers everything in our Dimension 10 (AEO/Local) that relates to AI search — use it verbatim.

**`.agents/skills/page-cro/SKILL.md`** — Conversion Rate Optimization for marketing pages: above-fold analysis, value proposition clarity, CTA hierarchy and placement, trust signal evaluation, social proof, friction points, visual hierarchy. This is the methodology layer for our Dimension 4 (Sales and Marketing Effectiveness) audit pass. Wire into `packages/audit-passes/sales/`. The skill reads `product-marketing-context` first — make sure the client context file exists before invoking it.

**`.agents/skills/form-cro/SKILL.md`** — Specifically for contact/inquiry/lead capture forms (not signup flows). For venue sites the inquiry form is the highest-value conversion element. Wire this into the `sales` audit pass as a sub-check triggered when the page extractor finds a form element. The skill covers field count, label clarity, submit button copy, error handling, friction reduction, and trust signals near the form.

**`.agents/skills/schema-markup/SKILL.md`** — Structured data audit and implementation. Wire into `packages/audit-passes/schema/` as the primary methodology. The skill covers all relevant schema types for local businesses and venues: `LocalBusiness`, `Event`, `FAQPage`, `BreadcrumbList`, `AggregateRating`, `Review`, `VideoObject`. Use its validation checklist rather than writing our own. Note: it explicitly states schema detection requires rendered HTML (not web_fetch) — confirmed, we use Firecrawl rawHtml.

**`.agents/skills/site-architecture/SKILL.md`** — Page hierarchy, navigation structure, URL patterns, internal linking strategy, click depth. Wire into `packages/audit-passes/links/` to cover the architecture dimension alongside raw link graph analysis. This skill provides frameworks for evaluating whether site structure serves both users and search engines.

#### Content generation phase (invoked in process-interview and scaffold clone passes)

**`.agents/skills/copywriting/SKILL.md`** — Conversion copywriting for marketing pages. The skill's principles: each section advances one argument, simple over complex ("use" not "utilize"), specific over vague (avoid "streamline," "optimize," "innovative"), active voice, confident not qualified. Wire this into the `upriver clone` command's Claude Code agent prompts — when the agent is rewriting a page section during the visual clone pass, it invokes this skill to ensure the rewritten copy is better than what it replaced, not just equivalent. Also invoked in the `fixes apply` command when P0 copy findings are being remediated.

**`.agents/skills/copy-editing/SKILL.md`** — Line-by-line review and polish of existing copy. Wire into a post-clone pass that runs after the initial content port. Every page that was copied from the crawl goes through this skill before the PR is raised, flagging passive voice, hedging language, buried value props, and weak CTAs. This is the quality gate before the human reviews the rebuild.

**`.agents/skills/customer-research/SKILL.md`** — Synthesizing customer research: interview transcripts, review mining, voice-of-customer patterns, persona generation. Wire into the `process-interview` command as the primary methodology for turning the recorded interview transcript into the brand voice guide, FAQ bank, and audience insight documents. The skill's framework for extracting VOC data from transcripts is more systematic than what we'd write from scratch. It also covers mining existing reviews from Google, WeddingWire, The Knot — add a review-scraping step to `upriver discover` that pulls publicly visible reviews into the content inventory.

### The `product-marketing-context.md` pattern

Every marketing skill in this library reads `.agents/product-marketing-context.md` before doing anything. This is their equivalent of our Brand Voice Guide. For every client engagement, the `synthesize` command must generate this file and write it to `./clients/<slug>/repo/.agents/product-marketing-context.md` before any marketing skill is invoked in that client's repo.

The file format used by the marketingskills library is:
```markdown
# Product Marketing Context: [Client Name]

## What we do
[One-sentence description]

## Target audience
[Who they serve, their decision-making context]

## Key differentiators
[What makes this business distinct]

## Tone and voice
[How they communicate]

## Primary conversion goal
[What a visitor should do — inquire, book, call]

## Key offers
[Main services or packages]

## Proof points
[Testimonials, awards, metrics, social proof available]

## Competitors
[2-3 named competitors]

## Common objections
[What prospects worry about before contacting]
```

Generate this from `audit-package.json` during the `synthesize` command. The `contentInventory`, `brandVoiceDraft`, and `siteStructure.missingPages` fields have everything needed to populate it. This file should also be loaded into the client's Claude Project as a knowledge base document alongside the full Brand Voice Guide.

### What the marketing skills do NOT cover (still build these ourselves)

- Firecrawl ingestion pipeline — nothing in marketingskills handles crawling or data extraction
- Lighthouse/Core Web Vitals — performance audit is outside their scope
- Accessibility (axe-core) — not covered
- Backlink analysis — they don't integrate with Ahrefs
- Schema validation against rawHtml — they note detection requires rendered HTML but don't implement it
- Astro scaffold generation — entirely ours
- /admin dashboard — entirely ours
- Supabase schema and auth — entirely ours

---

## CLI tool improvements before building (v5 additions)

### 1. The binary is renamed `upriver`, not `upriver-clone`

Subcommands replace the flat name. This is the canonical command structure going forward:

```bash
upriver init <url> --slug <slug>
upriver discover <slug>
upriver scrape <slug>
upriver audit <slug>
upriver synthesize <slug>
upriver design-brief <slug>
upriver scaffold <slug>
upriver clone <slug>
upriver fixes plan <slug>
upriver fixes apply <slug>
upriver qa <slug>
upriver interview-prep <slug>
upriver process-interview <slug> --transcript <path>
upriver launch-checklist <slug>
```

Do not use `upriver-clone` anywhere in the codebase, CLI help text, or documentation. Update the package name in `packages/cli/package.json` to `@upriver/cli` and the binary entry to `upriver`.

### 2. Every client repo gets a deeply customized `CLAUDE.md`

The generic scaffold `CLAUDE.md` is a placeholder. The `synthesize` command must overwrite it with a client-specific version containing:

```markdown
# CLAUDE.md — [Client Name]

## What this site is
[One paragraph from product-marketing-context.md]

## Brand voice rules
[Pulled from brand-voice-guide.md — tone, banned words, sentence case rules, apostrophe handling]

## Component inventory
[List of every Astro component in src/components/astro/, what it does, when to use it]

## Content collection schemas
[Pulled from src/content/config.ts — field names, types, required vs optional for every collection]

## What Claude may do autonomously
- Fix typos and copy quality issues (copy-editing skill pass)
- Apply audit findings from the approved scope doc
- Implement approved change requests (labeled `client-request` on GitHub)
- Update content collection MDX files when content changes are requested
- Optimize image attributes and alt text

## What Claude must NOT do without human review
- Modify src/pages/admin/ or any auth-related code
- Change navigation structure (src/components/astro/Nav.astro)
- Add third-party scripts or tracking pixels
- Modify astro.config.mjs or tailwind.config.ts
- Create new Astro page routes not in the approved sitemap
- Change database schema (supabase/migrations/)
- Merge to main — all changes require a draft PR

## Change request format
When implementing a client-submitted change request from a GitHub issue labeled `client-request`:
1. Read the issue body fully before touching any code
2. If the request is ambiguous, post a clarifying comment to the issue — do not guess
3. Create branch: feature/issue-[number]-[short-slug]
4. Implement conservatively — smallest change that satisfies the request
5. Open a draft PR titled: [DRAFT] Issue #[number]: [one-line summary]
6. Post a summary comment on the issue: what changed, which files, Vercel preview URL

## Vercel preview URL
[Populated by scaffold deploy command]

## GitHub repo
lifeupriver/[client-slug]
```

### 3. Every Claude-opened PR appends to `CHANGELOG.md`

The `CHANGELOG.md` lives in the client repo root. Format:

```markdown
## [Date] — [One-line description]

**What changed:** [2-3 sentences in plain English, client-readable, brand voice]
**Why:** [What triggered this — audit finding ID, change request issue number, or retainer task]
**Files:** [comma-separated list]
**Preview:** [Vercel preview URL for this branch]
```

The GitHub Action that runs `anthropics/claude-code-action@v1` must be instructed in the workflow YAML to append this entry before opening the PR.

### 4. Cost tracking writes to Supabase, not just a log file

Every Firecrawl API call and every Claude API call logs to a `usage_events` table in the **Upriver** Supabase project (not the client's project — this is internal data). Schema:

```sql
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  client_slug text not null,
  event_type text not null, -- 'firecrawl_scrape' | 'firecrawl_crawl' | 'claude_api' | 'gsc_api' | 'ahrefs_api'
  model text,               -- claude model name if applicable
  credits_used integer,     -- firecrawl credits
  input_tokens integer,     -- claude tokens
  output_tokens integer,    -- claude tokens
  cost_usd numeric(10,4),   -- calculated at logging time
  command text,             -- which CLI command triggered this
  created_at timestamptz default now()
);
create index on usage_events(client_slug);
create index on usage_events(created_at);
```

The Upriver /admin (Joshua's own dashboard — see the admin section below for the distinction between client /admin and Upriver's internal dashboard) queries this table to show cost-per-client over time.

### 5. `discover` detects the client's current platform

After the Firecrawl crawl, run a platform detection pass against the rawHtml. Write the result to `client-config.yaml` as `platform:`. Detection logic:

- Squarespace: look for `static.squarespace.com` in script/link tags
- WordPress: look for `/wp-content/` paths or `wp-json` in page source
- Wix: look for `static.parastorage.com` or `wix.com` in source
- Webflow: look for `webflow.com` in source or `data-wf-site` attributes
- Showit: look for `showit.co` CDN references
- Custom/unknown: flag for manual identification

The audit report's implementation plan section references the platform in its migration framing.

### 6. `qa` runs on a schedule post-launch

Add a GitHub Actions workflow to every client repo: `/.github/workflows/monthly-qa.yml`. Runs on the 1st of every month. Calls `upriver qa --slug [client-slug] --mode production --url [production-url]` via the CLI. Posts a Supabase record and sends a notification to Joshua via the Upriver internal dashboard's notification system. Catches regressions silently introduced after launch.

### 7. GSC access via service account, not per-client OAuth

Create one Google Cloud project for Upriver with a service account: `upriver-audit@[project-id].iam.gserviceaccount.com`. Store the JSON key as `GOOGLE_SERVICE_ACCOUNT_KEY` in the CLI environment.

During onboarding, Annmarie (or the client) adds this email as a **Full User** on the client's GSC property. The CLI's `discover` and audit `seo` commands use the Google Search Console API directly with the service account — not an MCP server's OAuth flow, which only works for the account holder.

```bash
# .env for the CLI
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/upriver-service-account.json
```

The `client-config.yaml` stores:
```yaml
gsc:
  property: "sc-domain:audreysfarmhouse.com"  # or https:// prefix for URL-prefix properties
  verified: true
  service_account_added: "2026-04-24"
```

If `gsc.verified` is false, the `discover` command warns that GSC data will be missing from the audit and suggests the onboarding step. The audit does not fail — it notes the gap as a finding and moves on.

---

## The Firecrawl capability map (read this before writing any code)

We have a $100/month Firecrawl account. This is the engine for the entire ingestion pipeline. Firecrawl does far more than crawl. Here is exactly what it can do and where each capability slots into our workflow:

### 1. Map — full site URL discovery
`POST /v2/map` — discovers every URL on the site in seconds by combining sitemap parsing with link traversal. Returns an array of all URLs. This is our first call on any new client. It gives us the full page inventory before we do anything else.

### 2. Crawl — full content extraction at scale
`POST /v2/crawl` — recursively scrapes every page with:
- `scrapeOptions.formats` accepting any combination of: `markdown`, `html`, `rawHtml`, `screenshot`, `links`, `json`, `images`, `branding`
- `scrapeOptions` passes all scrape-level options to every page: proxy, caching, JSON extraction schemas, actions
- Webhook support: `crawl.page` event fires for each page as it completes — we can process pages as they arrive rather than waiting for the full crawl
- WebSocket watcher: real-time progress stream
- `includePaths` / `excludePaths` regex filtering to skip admin panels, login pages, etc.
- `crawlEntireDomain: true` to catch sibling pages not under the root
- `allowSubdomains: true` for sites like `shop.venue.com` alongside `venue.com`
- `maxDiscoveryDepth` to control how deep we go
- Concurrent or sequential (`maxConcurrency`) control

**Credit cost:** 1 credit per page base. JSON mode adds 4 credits per page. Screenshots add to the base cost. Plan carefully on large sites.

### 3. Scrape — per-page with formats and extraction
`POST /v2/scrape` — single-page version of the above. Returns any combination of:

**`markdown`** — clean, LLM-ready text content stripped of nav/footer clutter when `onlyMainContent: true`.

**`html`** — cleaned HTML.

**`rawHtml`** — unmodified HTML. We need this for design-token extraction (computed CSS, class names, inline styles).

**`screenshot`** — full-page or above-fold screenshot returned as a URL (expires in 24 hours — we must download immediately). Options: `fullPage`, `quality`, `viewport` (width/height). This replaces Playwright for screenshots entirely.

**`links`** — every link on the page with text and href. Internal link graph without additional tooling.

**`images`** — every image URL on the page. Asset inventory built automatically.

**`branding`** — this is the key one. Firecrawl runs its own analysis and returns a structured `BrandingProfile` object containing:
  - `colorScheme`: "light" or "dark"
  - `logo`: logo URL
  - `colors`: `{ primary, secondary, accent, background, textPrimary, textSecondary, link, success, warning, error }`
  - `fonts`: array of font families detected on the page
  - `typography`: `{ fontFamilies: { primary, heading, code }, fontSizes: { h1, h2, h3, body }, fontWeights: { regular, medium, bold }, lineHeights }`
  - `spacing`: `{ baseUnit, borderRadius, padding, margins }`
  - `components`: `{ buttonPrimary, buttonSecondary, input }` with colors, border radii
  - `icons`: icon style information
  - `images`: `{ logo, favicon, ogImage }`
  - `animations`: transition and animation settings
  - `layout`: grid, header/footer heights
  - `personality`: brand personality traits, tone, energy, target audience
  
  **This single call replaces all of our manual design-token extraction work.** One `scrape` call on the homepage with `formats: ['branding', 'screenshot', 'markdown', 'rawHtml', 'images']` gives us everything we need to build the design system.

**`json`** — structured extraction using a schema or a natural language prompt. We will use this for:
  - Extracting all CTAs (button text, href, location on page) across every page
  - Extracting contact information (phone, email, address, hours)
  - Extracting team/staff names
  - Extracting pricing or package information
  - Extracting testimonials and reviews mentioned on the site
  - Extracting FAQ content already present
  - Extracting social media links

**`summary`** — LLM-generated summary of the page. Useful for the audit report narrative.

### 4. Batch scrape — multiple URLs in one job
`POST /v2/batch/scrape` — submit an array of URLs and get all results back with pagination. We use this after Map gives us the full URL list. More efficient than individual scrapes when Crawl's recursive discovery is overkill (e.g., when we have a known sitemap and don't need link traversal).

### 5. Interact — stateful browser sessions
`POST /v2/interact` — a stateful browser session that stays alive across calls. Natural language or Playwright code. We use this for:
  - Navigating contact forms to see form fields (without submitting)
  - Clicking through booking widgets to document their structure
  - Accessing any page state that requires interaction to reveal (dropdown nav menus, accordion content)
  - Verifying that CTAs actually resolve to the right destinations

### 6. JSON extraction with custom schemas
Any `scrape` or `crawl` call can include a JSON schema in `scrapeOptions.formats`. We define schemas for all our structured audit data — every extraction is typed, not parsed from text.

### Credit math for a typical 20-page client site
- Map: ~2 credits
- Batch scrape all pages with `markdown + html + screenshot + images + links`: 20 × 3 credits = ~60 credits
- Homepage branding scrape (adds `branding`): ~5 credits
- JSON extraction passes across all pages (CTAs, metadata, structured data): 20 × 5 credits = ~100 credits
- Interact sessions (form structure, booking widget): ~10 credits
- **Total per client: roughly 175-200 credits**
- At $100/month for 3,000 credits, that's roughly 15 clients per month on the current plan. Sufficient for the 50-clients/year goal.

---

## The full audit framework

This is every dimension we audit. The output of all audit passes feeds the JSON artifact the human hands to Claude Design.

### Dimension 1: Technical SEO

**Primary skill: `.agents/skills/seo-audit/SKILL.md`** — Read this skill before implementing this pass. Use its checklist and heuristics as the audit methodology. Do not write a parallel checklist; extend theirs with the additions below.

Additions specific to our use case beyond the base skill:
- Analytics detection: scan rawHtml for GA4, Plausible, or Umami script tags; flag absence of any analytics tool
- Core Web Vitals via Lighthouse: LCP, FID/INP, CLS — desktop and mobile (the skill doesn't run Lighthouse; we do)
- HTTPS redirect verification
- Schema detection note from the skill (important): JSON-LD detection requires rawHtml or browser rendering, never web_fetch. We use Firecrawl rawHtml — this is already correct, do not change it.

### Dimension 2: Content quality and brand voice

Every page:
- Presence of banned marketing language ("stunning," "magical," "seamlessly," "transform," "elevate," "unlock," "world-class," "premier," "game-changer," "robust," "synergy") — adapt the banned list to Upriver's voice guide
- Weasel words and vague claims without evidence ("best," "leading," "top-rated" without citations)
- First-person vs. third-person consistency
- Reading level (Flesch-Kincaid) — flag anything above grade 10
- Keyword presence: does the page's content match what people would search to find it
- Content freshness: are dates visible, are they recent
- Testimonials / social proof: present or absent
- Missing content: what a visitor would expect to find that isn't there (pricing, FAQs, staff photos)
- Thin FAQ coverage: how many questions are answered vs. how many the site should answer
- Alt text: all images have descriptive alt text
- Image file names: descriptive vs. `IMG_4521.jpg`

### Dimension 3: Design and visual identity

From the Firecrawl `branding` extraction + screenshots:
- Color consistency: how many distinct color values are in use (flag if > 3-4 primary colors)
- Font consistency: how many font families are loaded (flag if > 2-3)
- Button style consistency: do all CTAs look the same
- Spacing consistency: is there a visible rhythm or does it look random
- Mobile design: screenshot at mobile viewport — does it look intentional
- Image quality: are images appropriately sized, not pixelated, not stretched
- Logo: present on every page, consistent sizing
- White space: is content breathing or compressed
- Visual hierarchy: does the eye know where to go on each page
- Above-fold content: does the homepage hero immediately communicate what the business is and what to do next

### Dimension 4: Sales and marketing effectiveness

**Primary skills: `.agents/skills/page-cro/SKILL.md` + `.agents/skills/form-cro/SKILL.md`** — Read both before implementing this pass. This is the dimension clients care about most and see least often in standard audits, and these skills have the most comprehensive frameworks for it.

`page-cro` covers: above-fold value prop clarity, CTA hierarchy and placement, trust signal evaluation, social proof quantity and position, visual hierarchy, friction identification, and the 5-second test. Apply its full framework to the homepage and every key landing page. The skill reads `product-marketing-context` first — the client context file must exist before invoking it.

`form-cro` covers: field count and necessity, label clarity, submit button copy, error state handling, trust signals adjacent to the form, and friction reduction. This sub-check fires automatically when the Firecrawl json extraction finds a form element on any page.

Additions specific to our use case beyond these skills:
- Missing page analysis: for venue sites, flag absence of dedicated pages for each venue space, pricing/packages, real weddings portfolio, local area guide, FAQ, accommodation, vendor recommendations. Each missing page is a P1 finding.
- Booking friction path: count steps from homepage to submitted inquiry. Flag anything over 3.
- Review badge presence: flag if no WeddingWire, The Knot, or Google review widget is visible.
- CTA data comes from Firecrawl json extraction — the CTASchema defined in the scrape phase populates this pass. No additional scraping needed.

### Dimension 5: Backlink and authority

Via Ahrefs MCP:
- Domain Rating (DR) and URL Rating (UR) for the homepage
- Total referring domains
- Total backlinks
- New vs. lost backlinks (last 30 days, last 90 days)
- Anchor text distribution: branded vs. keyword vs. generic
- Top referring domains with their DR
- Toxic or spammy referring domains (flag anything from link farms or irrelevant foreign sites)
- Competitor comparison: how do 2-3 competitors compare on DR, referring domains, top keyword positions
- Link gap: what domains link to competitors but not to this site (opportunities)
- Internal page authority distribution: which pages have the most backlinks, is that the right pages

### Dimension 6: Internal linking and site architecture

**Primary skill: `.agents/skills/site-architecture/SKILL.md`** — Read before implementing. The skill covers page hierarchy design, navigation structure evaluation, URL pattern analysis, and internal linking strategy. Use its framework alongside the raw link graph data from Firecrawl.

Firecrawl `links` extraction provides the raw data. The site-architecture skill provides the interpretive framework — what does a good internal link structure look like for a local business site of this type?

Additional checks beyond the skill:
- Maximum click depth: flag any page more than 3 clicks from the homepage
- Crawl efficiency: ratio of unique internal links to total (high duplication is a signal)
- Orphan detection: cross-reference the full URL inventory from Map against the internal links graph

### Dimension 7: Schema markup

**Primary skill: `.agents/skills/schema-markup/SKILL.md`** — Read before implementing. Use its validation checklist and schema type recommendations as the complete methodology. Do not write a parallel checklist.

The skill explicitly confirms: schema detection requires rawHtml or browser rendering, not web_fetch. We use Firecrawl rawHtml — correct, do not change this.

For venue sites specifically, the skill's coverage of `LocalBusiness`, `Event`, `FAQPage`, `AggregateRating`, and `VideoObject` schema types is directly applicable. Apply the skill's "what's missing" logic based on the page content detected in the content inventory.

### Dimension 8: Accessibility

Via Playwright/axe-core run against key pages (Firecrawl screenshots handle the visual pass):
- WCAG 2.1 AA violations (critical, serious, moderate)
- Color contrast ratios for all text/background combinations
- Missing alt text on images (cross-referenced with Firecrawl images extraction)
- Form labels: all form fields labeled
- Focus indicators: keyboard navigation visible
- Skip navigation link: present or absent
- ARIA labels: buttons and interactive elements have descriptive labels
- Heading structure: logical order (cross-referenced with SEO audit)

### Dimension 9: Competitor benchmarking

Via Ahrefs MCP + Firecrawl scrape on 2-3 identified competitors:
- Site structure comparison: what pages do competitors have that this site lacks
- Content depth comparison: word count on key pages vs. competitors
- Design sophistication: screenshots at equivalent pages
- CTA approach: how competitors handle inquiry and booking CTAs
- Trust signals: what social proof competitors show that this site doesn't
- Keyword position gaps: what keywords competitors rank for in top 10 that this site doesn't appear for

### Dimension 10: Local and AEO presence

**Primary skill: `.agents/skills/ai-seo/SKILL.md`** — Read before implementing the AEO portion of this pass. This skill was specifically split out to cover AI search optimization: AEO, GEO (Generative Engine Optimization), LLMO, AI Overviews, and LLM citation patterns. Use its framework verbatim for the AI-search component.

Local-specific checks (beyond the skill's scope):
- Google Business Profile presence and completeness
- NAP consistency: Name, Address, Phone matching across site, GBP, and major directories
- Local keyword targeting in title tags, H1s, body copy
- Review platform presence: WeddingWire, The Knot, Google (for venue archetype)

AEO checks via the `ai-seo` skill:
- FAQ schema coverage vs. questions people actually ask
- Conversational query coverage in body content
- LLM citation likelihood — does the content answer specific questions directly and citably
- Long-tail question coverage specific to the venue type

---

## The deliverable artifact: what goes to Claude Design

After all audit passes complete, the tool generates a single structured JSON file: `audit-package.json`. This is the master artifact. Everything else derives from it.

### Schema for `audit-package.json`

```typescript
interface AuditPackage {
  meta: {
    clientName: string;
    clientSlug: string;
    siteUrl: string;
    auditDate: string;
    auditor: string; // "Upriver Consulting"
    totalPages: number;
    totalFindings: number;
    findingsByPriority: { p0: number; p1: number; p2: number };
    overallScore: number; // 0-100, weighted across all dimensions
    scoreByDimension: Record<string, number>; // dimension name -> score
  };

  brandingProfile: FirecrawlBrandingProfile; // raw from Firecrawl
  
  designSystem: {
    // Synthesized from brandingProfile, ready for Claude Design
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      textPrimary: string;
      textSecondary: string;
      [key: string]: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
      monoFont: string;
      scale: Record<string, string>; // h1, h2, h3, body, small
    };
    spacing: {
      baseUnit: number;
      scale: number[]; // [4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
      borderRadius: string;
    };
    components: {
      primaryButton: Record<string, string>;
      secondaryButton: Record<string, string>;
      inputField: Record<string, string>;
    };
    logo: string; // URL
    favicon: string; // URL
    colorScheme: 'light' | 'dark';
    personality: string[]; // brand personality traits from Firecrawl
  };

  siteStructure: {
    pages: Array<{
      url: string;
      slug: string;
      title: string;
      description: string;
      wordCount: number;
      headings: { level: number; text: string }[];
      images: string[];
      internalLinks: string[];
      externalLinks: string[];
      ctaButtons: Array<{ text: string; href: string; type: 'primary' | 'secondary' | 'link' }>;
      schemaTypes: string[];
      hasCanonical: boolean;
      statusCode: number;
    }>;
    navigation: {
      primary: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>;
      footer: Array<{ label: string; href: string }>;
    };
    missingPages: Array<{ pageType: string; reason: string; priority: 'p0' | 'p1' | 'p2' }>;
  };

  contentInventory: {
    testimonials: Array<{ quote: string; attribution: string; page: string }>;
    teamMembers: Array<{ name: string; role: string; page: string }>;
    faqs: Array<{ question: string; answer: string; page: string }>;
    pricing: Array<{ item: string; price: string; page: string }>;
    socialLinks: Array<{ platform: string; url: string }>;
    contactInfo: { phone?: string; email?: string; address?: string; hours?: string };
    eventSpaces: Array<{ name: string; capacity?: string; description: string; page: string }>;
  };

  screenshots: {
    pages: Array<{
      url: string;
      slug: string;
      desktop: string; // local file path
      mobile: string;  // local file path
    }>;
  };

  findings: AuditFinding[]; // all findings from all passes, sorted by severity

  brandVoiceDraft: {
    // Auto-generated first draft from content analysis — human edits before finalizing
    tone: string;
    keywords: string[];
    bannedWords: string[];
    sampleHeadlines: string[];
    sampleBodyCopy: string[];
    voiceCharacteristics: string[];
    audienceDescription: string;
  };

  implementationPlan: {
    phases: Array<{
      phase: number;
      name: string;
      description: string;
      findings: string[]; // finding IDs included in this phase
      estimatedEffort: string;
      estimatedImpact: string;
    }>;
    quickWins: AuditFinding[]; // p0 findings with 'light' effort
    requiresClientInput: string[]; // things we can't decide without the client
    requiresNewContent: string[]; // pages or content that needs to be created
    requiresAssets: string[]; // photos, videos, or other assets the client needs to provide
  };
}
```

This JSON file goes to Claude Design with the instruction to use it to produce the audit deliverable.

---

## The audit deliverable: what Claude Design produces

This is a comprehensive document that the client receives before the pitch meeting and reviews in the pitch meeting. It replaces a typical PDF report. Here is exactly what it contains, section by section.

### Cover page
Client name, site URL, audit date, Upriver logo + client logo side by side, overall score as a large number with a brief one-line interpretation ("Your site is leaving inquiry opportunities on the table"), auditor name.

### Executive summary (1 page)
Three things:
1. What's working. 2-3 genuine strengths from the audit — specific, not vague.
2. What's costing you inquiries. The top 3 P0 findings in plain English, with the business impact framed in revenue terms where possible.
3. What we're recommending. Three sentences on the rebuild scope.

### Scorecard (visual)
A radar chart or grid showing the score (0-100) across all 10 audit dimensions. Color-coded: green (70+), amber (40-70), red (0-40). This gives the client an at-a-glance picture of where they are strongest and weakest.

### Visual audit (the "before" photos)
Full-page screenshots of the homepage and 3-5 key pages with annotation overlays marking specific problems. Each annotation links to a finding card. This section makes abstract problems concrete and visible. Clients always respond most strongly to seeing their own site with problems circled.

### Findings by dimension (10 sections)
One section per audit dimension. Each section has:
- Dimension score (number + letter grade)
- 2-3 sentence summary of what we found
- Finding cards for every issue: finding title, severity badge (P0/P1/P2), evidence (screenshot or data point), business impact, specific recommendation, estimated effort

### Missing pages analysis
A table showing every page type the site should have (based on the business category and what competitors have) vs. what actually exists. The gap is the opportunity. For a wedding venue: each venue space, pricing/packages, real weddings portfolio, local area guide, FAQ, accommodation, vendor recommendations. Every missing page is a P1 or P2 finding.

### Brand voice analysis
Side-by-side: "How the site sounds now" vs. "How it could sound." Pull 3-5 verbatim quotes from the site that represent the current voice (including any banned phrases found). Show rewrites in the proposed brand voice. This is where the brand voice draft from the audit package surfaces.

### Design system audit
Screenshots of the current design system components (buttons, typography, color palette, form fields) with commentary on consistency. Side by side with the extracted design tokens to show what is actually in use vs. what appears to be intended. Flag inconsistencies: where a button has three different background colors, where three fonts load but only two are visible.

### Competitor comparison
A table comparing the client against 2-3 competitors on: Domain Rating, referring domains, top keyword positions, page count, has pricing page (Y/N), has virtual tour (Y/N), has team page (Y/N), has FAQ page (Y/N), mobile score. One screenshot of a competitor's homepage for visual comparison.

### Implementation plan
The phased plan from the `implementationPlan` block of the audit package, laid out as a visual timeline. Each phase is a card with: name, what's included, estimated effort, estimated impact. Phase 1 is always "Quick wins" (P0s with light effort). Phase 2 is "Structural fixes." Phase 3 is "Content build-out." Phase 4 is "AEO and authority building."

### Scope sign-off
This is the decision point. A checklist-style section where every material item in the implementation plan has a checkbox:
- [ ] Include in rebuild scope
- [ ] Skip for now
- [ ] Needs discussion

Below the checklist: proposed price (derived from what they check), proposed timeline, and a signature line. When the client returns this page signed, we have a scoped agreement.

### What we need from you
The list of things we can't do without client input:
- Brand aesthetic preferences and overrides
- FAQ answers (50-100 questions)
- Team photos and bios
- New photography or video (flag if existing assets are outdated or insufficient)
- Written approvals for any sensitive copy we draft

---

## The two auto-generated documents that go into the client dashboard

These are produced by the tool after the crawl and audit, reviewed by Joshua, and loaded into the client's Supabase + Claude Project before the dashboard goes live.

### Document A: Brand Voice Guide (Doc 01)
Auto-drafted from content analysis. Structure:
- **Voice in three words**: extracted from personality traits in Firecrawl branding profile
- **What the brand sounds like now**: 3-5 examples pulled verbatim from the site
- **What it should sound like**: rewritten examples in proposed direction
- **Tone guidelines**: formal vs. casual, warm vs. authoritative, specific vs. broad
- **Word choices**: terms to use, terms to avoid (including any site-specific banned phrases found in audit)
- **Headlines**: 10 sample headlines in the brand voice
- **One-sentence business description**: the elevator pitch Claude should use when generating content
- **Audience**: who reads this, what they care about, what they're deciding
- **Content types and tone per type**: how Instagram captions differ from email subject lines differ from blog posts

This document goes in the client's Claude Project knowledge base. Every content generation task uses it.

### Document B: Design System Reference (Doc 02)
Auto-generated from the Firecrawl branding extraction + manual review. Structure:
- **Color palette**: every token from the extracted design system, named and annotated, with hex values and usage guidance
- **Typography**: font families, size scale, weight usage, line-height rules
- **Spacing**: base unit, scale, section rhythm
- **Components**: primary button, secondary button, input fields, card styles — with exact values and usage rules
- **Logo usage**: logo URL, minimum size, clear space rules, incorrect usage examples (if any)
- **Photography style**: description of the client's current imagery tone (warm, editorial, casual, professional) for content direction
- **What not to do**: common design mistakes found in the audit that should not be replicated

This document goes in both the Claude Project knowledge base (for content generation) and the client's admin dashboard (so the client can reference it when working with other vendors).

---

## The interview protocol (post-sign-off, pre-build)

After the client signs off on the scope document, we conduct one 90-minute working session. This session produces everything the build needs that can't be scraped.

### What we extract in the interview

**Brand voice and aesthetics:**
- How do you describe your business to someone who has never heard of you?
- What feeling do you want a visitor to have within 5 seconds of landing on your homepage?
- Are there any existing pages or sections of the site that you love and want to preserve exactly?
- Are there any audit findings where you want to override the recommendation for brand reasons? (Example: the audit says page X needs more text for SEO, but you want it to stay minimal because it looks more sophisticated.)
- Are there any businesses (in any industry) whose website you admire? Why?

**FAQ bank (50-100 questions):**
Run through the full FAQ bank question list prepared from the audit's "what questions should this site answer" analysis. Client answers each in their own words. Recording + transcript. Claude turns the transcript into the FAQ bank document.

**Content gaps:**
- What do you wish visitors knew before they contacted you?
- What questions do you answer on every inquiry call that the website should answer first?
- What misconceptions do people have about your business that the site should correct?
- What is one thing about your business that doesn't come across at all on the current site?

**Asset inventory:**
- What photography do you have that isn't on the site?
- Is there any video content? Any plans for video?
- Are there any images on the current site that are outdated, wrong, or shouldn't be used?
- Do you have the original logo files (SVG or AI)?

**Technical:**
- What integrations does the site need to preserve? (Booking system, POS, CRM, email platform)
- Are there any pages or sections that are only partially visible (behind a login, only accessible via certain paths) that we should know about?
- What are the 3 most important things a visitor should be able to do on the new site?

---

## The clone: what it is and how it's built

After the interview, the build begins. The goal is a **one-to-one visual clone** of the existing site, on Astro, with the audit fixes applied, on a Vercel preview URL the client can review before going live.

### What "one-to-one" means

Every page that exists on the current site exists on the new site at the same URL path. Every piece of content that was on the current page is on the new page, rewritten if the audit found voice or quality issues. Every image that was on the current page is on the new page, sourced from the asset download or Cloudinary. The visual design matches: same color palette, same font choices, same layout intent.

What changes: the code. Static HTML instead of Squarespace's JavaScript-heavy rendering. Content in Astro Content Collections instead of a CMS backend. Design tokens in CSS variables instead of hardcoded values. The /admin page is new — the client never had it.

### How the scaffold works

The `upriver scaffold` command produces an Astro 6 repo with the hybrid architecture documented in the v2 build prompt. See that document for the full directory layout, `astro.config.mjs`, middleware, and admin island architecture. The scaffold is deterministic: same site always produces the same scaffold structure.

What changes per client: the content (from the crawl), the design tokens (from the branding extraction), and the Supabase schema (which tables get seeded based on what the client's site does).

### How visual fidelity is achieved

The screenshots from Firecrawl are the reference. Claude Code receives:
1. The Firecrawl screenshots of every page (desktop and mobile)
2. The extracted design system (`designSystem` block from `audit-package.json`)
3. The page content (from the markdown and HTML extractions)
4. The Astro scaffold with design tokens pre-loaded

Claude Code's job is to make the Astro page match the screenshot. It does this section by section, component by component. The screenshots are the ground truth.

For the homepage, this means producing a pixel-close match. For secondary pages, functional accuracy is sufficient (same content, same layout intent, same CTAs) without requiring pixel perfection.

### What the /admin delivers to the client

**The complete /admin specification is above** in the "The /admin dashboard — complete specification (v5)" section. Do not summarize or restate it here. Read that section completely before touching any admin code.

The scaffold's admin shell must include all routes, all Supabase tables, the GitHub Actions workflow file, all API routes, and all React feature folders specified there. Build the full admin from day one — it is not an add-on.

The one feature to build last within the admin (due to dependency on live data): the AI chat feature (`/admin/ai-chat`). It requires the client's Claude Project to be set up with their knowledge base loaded. Add the route as a placeholder on scaffold that shows "Coming soon — your AI assistant will be set up here" until the Claude Project is configured post-launch.

---

## CLI commands (complete list)

### Phase 1: Discovery

```
upriver init <url> --slug <slug>
```
Creates `./clients/<slug>/`, writes `client-config.yaml`, runs Firecrawl Map to get the full URL inventory. Runs platform detection (Squarespace, WordPress, Wix, Webflow, Showit, or unknown) and writes `platform:` to `client-config.yaml`. Prints the page count and estimated credit cost before proceeding.

```
upriver discover <slug>
```
Runs Firecrawl Map + a quick batch scrape of all discovered URLs with just `markdown` and `metadata` formats. Gives us the complete content inventory without spending screenshot or branding credits yet.

Also runs review mining per the `customer-research` skill pattern: uses Firecrawl scrape to pull publicly visible reviews from the client's Google Business Profile page (via search), WeddingWire listing, and The Knot listing if present. Saves raw review text to `./clients/<slug>/reviews/` for use in `process-interview` VOC synthesis later.

If `gsc.verified: true` in `client-config.yaml`, also runs the Google Search Console API (service account) to pull: top 50 queries, top 50 pages, coverage report summary, sitemap status. Saves to `./clients/<slug>/gsc/`. If `gsc.verified: false`, prints a warning and skips.

Generates `./clients/<slug>/site-map.json`, `./clients/<slug>/content-inventory.json`, `./clients/<slug>/reviews/[platform].json`, and `./clients/<slug>/gsc/` if GSC verified.

### Phase 2: Deep scrape

```
upriver scrape <slug> [--pages <comma-separated-slugs>]
```
Runs the full scrape pass. For each page: `markdown`, `html`, `rawHtml`, `screenshot` (desktop + mobile), `images`, `links`, `summary`. For the homepage and 2-3 key pages: also includes `branding`. Runs `json` extraction with CTA, contact, team, testimonial, FAQ, pricing schemas against every page.

Downloads all screenshots to `./clients/<slug>/screenshots/` immediately (they expire in 24 hours).

Downloads all images to `./clients/<slug>/assets/images/`.

Writes `./clients/<slug>/pages/[slug].json` for every page with all extracted data.

Writes `./clients/<slug>/design-tokens.json` from the branding extraction.

Writes `./clients/<slug>/asset-manifest.json`.
### Phase 1: Discovery

```
upriver init <url> --slug <slug>
```
Creates `./clients/<slug>/`, writes `client-config.yaml`, runs Firecrawl Map to get the full URL inventory. Prints the page count and estimated credit cost before proceeding.

```
upriver discover <slug>
```
Runs Firecrawl Map + a quick batch scrape of all discovered URLs with just `markdown` and `metadata` formats. Gives us the complete content inventory without spending screenshot or branding credits yet.

Also runs review mining per the `customer-research` skill pattern: uses Firecrawl scrape to pull publicly visible reviews from the client's Google Business Profile page (via search), WeddingWire listing, and The Knot listing if present. Saves raw review text to `./clients/<slug>/reviews/` for use in `process-interview` VOC synthesis later.

Generates `./clients/<slug>/site-map.json`, `./clients/<slug>/content-inventory.json`, and `./clients/<slug>/reviews/[platform].json`.

### Phase 2: Deep scrape

```
upriver scrape <slug> [--pages <comma-separated-slugs>]
```
Runs the full scrape pass. For each page: `markdown`, `html`, `rawHtml`, `screenshot` (desktop + mobile), `images`, `links`, `summary`. For the homepage and 2-3 key pages: also includes `branding`. Runs `json` extraction with CTA, contact, team, testimonial, FAQ, pricing schemas against every page.

Downloads all screenshots to `./clients/<slug>/screenshots/` immediately (they expire in 24 hours).

Downloads all images to `./clients/<slug>/assets/images/`.

Writes `./clients/<slug>/pages/[slug].json` for every page with all extracted data.

Writes `./clients/<slug>/design-tokens.json` from the branding extraction.

Writes `./clients/<slug>/content-inventory.json` updated with structured extracted data.

### Phase 3: Audit passes (all run in parallel)

```
upriver audit <slug>
```
Runs all audit passes concurrently. Each pass reads from the already-scraped data in `./clients/<slug>/pages/` — no additional Firecrawl calls. Findings from each pass are written incrementally to `./clients/<slug>/audit/[pass-name].json` as they complete.

Passes running in parallel:
- `seo` — technical SEO across all pages
- `content` — voice, quality, thin content
- `design` — design consistency from branding profile + screenshots
- `sales` — CTA analysis, homepage effectiveness, missing pages
- `backlinks` — via Ahrefs MCP
- `links` — internal link graph from `links` extractions
- `schema` — JSON-LD parsing from `rawHtml`
- `aeo` — FAQ coverage, conversational query readiness, AEO gaps
- `competitors` — Ahrefs MCP + Firecrawl scrape on 2-3 identified competitors
- `local` — NAP consistency, GBP presence, local keyword coverage

Human review checkpoint: after audit completes, tool prints a summary of findings by dimension and asks for review before proceeding.

### Phase 4: Synthesis

```
upriver synthesize <slug>
```
Compiles all `./clients/<slug>/audit/[pass-name].json` files into the master `audit-package.json`. Uses Claude (Sonnet 4.6, one call per section, capped at 8K output tokens each) to:
- Write the brand voice draft
- Write finding narratives (the `why_it_matters` field for every P0 and P1 finding)
- Write the executive summary
- Score each dimension and write dimension summaries
- Build the implementation plan with phases, quick wins, and client input requirements

Also generates two additional files that are required before any marketing skill can run in the client repo:

**`./clients/<slug>/repo/.agents/product-marketing-context.md`** — The shared context file that all nine installed marketingskills read first. Generated from `audit-package.json` using the `contentInventory`, `brandVoiceDraft`, and `siteStructure` fields. This file must exist before `clone`, `fixes apply`, or any audit skill is invoked in the client's repo. Format follows the marketingskills library convention (see "The product-marketing-context.md pattern" section above).

**`./clients/<slug>/docs/brand-voice-guide.md`** — The full Upriver-format Brand Voice Guide (Doc A). This is more detailed than the product-marketing-context file and goes into the client's Claude Project knowledge base.

Writes `./clients/<slug>/audit-package.json`.

```
upriver design-brief <slug>
```
Reads `audit-package.json` and produces `./clients/<slug>/claude-design-brief.md` — the Claude Design handoff document. Includes:
- Instruction for Claude Design to use the Upriver Consulting repo as the base design system
- The `designSystem` block formatted as a Claude Design system definition
- The suggested deck structure with copy-paste prompts for each section
- Local paths to screenshots (the human uploads these manually to Claude Design)
- The scope sign-off section formatted as Claude Design slide content

Human-in-the-loop gate: the human takes this brief to Claude Design, builds the deck, and gets client sign-off before the build starts.

### Phase 5: Interview prep

```
upriver interview-prep <slug>
```
Reads `audit-package.json` and generates `./clients/<slug>/interview-guide.md`:
- Customized FAQ question list (100 questions, prioritized by what the audit found is missing)
- Brand voice probe questions with sample wrong answers and right answers for reference
- Asset gap checklist (what photos/videos are missing based on content audit)
- Technical integration questions specific to what's embedded in the site (detected booking widgets, forms, etc.)
- Aesthetic override prompts (framed around specific audit findings the client might want to override)

```
upriver process-interview <slug> --transcript <path>
```
**Primary skill: `.agents/skills/customer-research/SKILL.md`** — Read before implementing. This skill's framework for synthesizing interview transcripts, extracting voice-of-customer patterns, and generating persona insights is the methodology for this command. Do not write a parallel framework; use theirs.

Before processing the interview transcript, also run review mining: pull publicly visible reviews from Google Business Profile (via search), WeddingWire, and The Knot using Firecrawl scrape on their review pages for the client. The customer-research skill covers this pattern. Append mined review VOC data to the transcript before synthesis.

Uses Claude (Opus 4.7, 30K input budget) to produce:
- `./clients/<slug>/docs/brand-voice-guide.md` — full Brand Voice Guide, final human-reviewed version
- `./clients/<slug>/docs/faq-bank.md` — 50-100 Q&As in client's voice
- `./clients/<slug>/docs/aesthetic-overrides.md` — audit findings the client wants to override with reasoning
- `./clients/<slug>/docs/asset-gaps.md` — photography and video that needs to be shot or sourced
- Updated `./clients/<slug>/repo/.agents/product-marketing-context.md` — overwrite with richer version incorporating interview data

### Phase 6: Scaffold and clone

```
upriver scaffold <slug> [--supabase-project-ref <ref>]
```
Generates the Astro 6 hybrid repo in `./clients/<slug>/repo/`. Applies:
- Routes matching the site map
- Pages seeded with content from crawl data converted to MDX for Content Collections
- Design tokens from `design-tokens.json` wired into `global.css`
- Images from `./clients/<slug>/assets/images/` copied to `public/images/`
- Admin shell with Better Auth, Supabase schema, and React admin island
- `CLAUDE.md` file for the next-stage visual fidelity pass

```
upriver clone <slug>
```
Runs Claude Code in headless mode against the scaffolded repo, using the screenshots as visual references. Each page is a separate agent task (git worktree per page for parallelism). The agent's job per page:

1. Match the Astro page visually to the Firecrawl screenshot using the design tokens already wired into the scaffold.
2. Port the content from the crawl markdown — but apply the **`.agents/skills/copywriting/SKILL.md`** framework when rewriting any section, so the ported copy is better than what it replaced, not just equivalent. The client's `product-marketing-context.md` is in the repo at `.agents/product-marketing-context.md` and will be read automatically.
3. After the page is built, run a **`.agents/skills/copy-editing/SKILL.md`** pass across all copy on the page. This flags passive voice, buried value props, weak CTAs, and hedging language. Findings become inline code comments the human reviewer will see in the PR.

Writes a PR per page against `main` in the client's scaffolded repo.

```
upriver scaffold github <slug> [--commit]
```
Creates GitHub repo, pushes scaffolded code. Dry-run by default.

```
upriver scaffold supabase <slug> [--commit]
```
Creates Supabase project, runs migrations, writes env vars. Dry-run by default.

```
upriver scaffold deploy <slug> [--commit]
```
Creates Vercel project, links to GitHub, deploys preview. Dry-run by default.

### Phase 7: Audit fixes

```
upriver fixes plan <slug>
```
Reads `audit-package.json` + signed scope doc. Produces a structured work plan in `./clients/<slug>/fixes-plan.md`.

```
upriver fixes apply <slug> [--parallel]
```
Headless Claude Code applies fixes. With `--parallel`, uses git worktrees for concurrent independent fixes. Each fix is a separate PR.

### Phase 8: QA and launch

```
upriver qa <slug> --preview-url <vercel-url>
```
Re-runs all audit passes against the Vercel preview URL. Compares to original findings. Produces a launch readiness report showing: in-scope items fixed, in-scope items still open, new issues introduced.

```
upriver launch-checklist <slug>
```
Produces the DNS migration, redirect, Search Console, and analytics launch checklist. Human-driven only.

---

## Repository structure

```
upriver/
├── .agents/
│   └── skills/                       # marketingskills library (installed, do not modify)
│       ├── page-cro/SKILL.md
│       ├── seo-audit/SKILL.md
│       ├── ai-seo/SKILL.md
│       ├── schema-markup/SKILL.md
│       ├── site-architecture/SKILL.md
│       ├── form-cro/SKILL.md
│       ├── copywriting/SKILL.md
│       ├── copy-editing/SKILL.md
│       └── customer-research/SKILL.md
├── packages/
│   ├── cli/                          # @upriver/clone — Oclif CLI
│   ├── core/                         # Shared types, Firecrawl client, audit interfaces
│   ├── audit-passes/                 # One module per audit dimension
│   │   ├── seo/                      # Invokes seo-audit skill methodology
│   │   ├── content/
│   │   ├── design/
│   │   ├── sales/                    # Invokes page-cro + form-cro skill methodology
│   │   ├── backlinks/
│   │   ├── links/                    # Invokes site-architecture skill methodology
│   │   ├── schema/                   # Invokes schema-markup skill methodology
│   │   ├── aeo/                      # Invokes ai-seo skill methodology
│   │   ├── competitors/
│   │   └── local/
│   └── scaffold-template/            # Astro 6 hybrid template
├── skills/                           # Upriver's own SKILL.md files
│   ├── upriver-site-audit/
│   ├── upriver-site-clone/
│   ├── upriver-design-deck-prep/
│   ├── upriver-apply-audit-fixes/
│   ├── upriver-rebuild-qa/
│   └── upriver-launch-migration/
├── templates/
│   ├── claude-design-brief.md
│   ├── audit-package.schema.json
│   ├── client-config.schema.yaml
│   ├── product-marketing-context.md  # Template for synthesize command to populate
│   └── interview-guide.md
├── clients/                          # Gitignored — client work lives here
├── examples/
│   └── audreys-farmhouse/
├── docs/
│   ├── architecture.md
│   ├── firecrawl-usage.md
│   ├── audit-framework.md
│   ├── marketing-skills-integration.md  # How the nine installed skills slot into our workflow
│   ├── deliverable-spec.md
│   ├── usage-guide.md
│   └── pricing-reference.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

---

## Tech stack

| Concern | Tool |
|---|---|
| CLI framework | Oclif (@oclif/core) |
| Language | TypeScript strict, ESM |
| Package manager | pnpm workspaces |
| Web ingestion | **Firecrawl** — crawl, scrape, map, interact, batch scrape, branding, screenshots |
| Additional screenshots | None — Firecrawl handles this |
| Additional design-token extraction | None — Firecrawl `branding` format handles this |
| SEO and backlink data | Ahrefs MCP |
| Performance | Lighthouse (npm package) — Firecrawl does not do Core Web Vitals |
| Accessibility | @axe-core/playwright — Firecrawl does not do axe audits |
| Schema parsing | Custom JSON-LD parser on rawHtml from Firecrawl |
| Site framework (client sites) | Astro 6 with @astrojs/vercel, hybrid mode |
| Admin UI | React 19 + shadcn/ui + TanStack Router + TanStack Query |
| Auth | Better Auth |
| Database | Supabase Postgres (one project per client) |
| ORM | Drizzle ORM |
| Styling | Tailwind v4 |
| Motion | framer-motion (admin only), CSS transitions (public pages) |
| Image CDN | Cloudinary (optional per client) |
| Parallel agent execution | Claude Code headless + git worktrees |
| Git hosting | GitHub via gh CLI |
| Deployment | Vercel |

**Playwright is still required for accessibility (axe-core) only.** Everything else — crawling, screenshots, design tokens, content extraction — comes from Firecrawl.

---

## Critical constraints

### 1. Firecrawl screenshots expire in 24 hours
Download them immediately. The `scrape` command must download every screenshot URL to disk before writing the page record. Do not store URLs; store the actual files. Saving the URL and coming back later will produce broken references.

### 2. Credit budget per client
Track credit usage in `./clients/<slug>/token-and-credit-usage.log`. Every Firecrawl call logs its credit cost. Stay under 300 credits for sites under 30 pages. Flag a warning if a site will exceed 500 credits before starting the deep scrape.

### 3. Claude API usage rules
- Audit passes that can run without Claude must not invoke Claude
- Sonnet 4.6 for all synthesis except final audit narrative (Opus 4.7)
- Haiku 4.5 for classification-only tasks
- All calls have explicit `max_tokens` caps
- Token usage logged alongside Firecrawl credit usage

### 4. No destructive operations without `--commit`
GitHub, Vercel, Supabase provisioning: dry-run by default. Print what would happen. Require explicit `--commit` flag to execute.

### 5. Restartability
Every stage writes to disk immediately. Every command supports `--resume` to skip completed stages. Never re-run a completed stage.

### 6. One Supabase project per client
Never share a Supabase project across clients. Data isolation is absolute.

### 7. Voice rules on all generated text
No em dashes. No banned words (stunning, magical, seamlessly, transform, elevate, unlock, world-class, premier, game-changer, robust, synergy). First person present tense in prose. Sentence case in body. UPPERCASE for eyebrows, buttons, table headers. Real tool names, never generic categories. Acknowledge trade-offs.

---

## Build order

### Session 1: Foundation and Firecrawl integration

Before writing any code, verify the nine installed marketing skills are present at `.agents/skills/`. If any are missing, stop and tell me — do not proceed without them.

Build `packages/core` with the Firecrawl client wrapper (typed, credit-tracking, resumable). Build `upriver init` and `upriver discover` (including the review-mining step). Run against Audrey's Farmhouse. Validate the site map, content inventory, and reviews outputs. **Stop and ask me to review.**

### Session 2: Deep scrape
Build `upriver scrape`. This is the most important command. Get every format working: markdown, html, rawHtml, screenshot (with immediate download), images, links, summary, branding, json extraction. Run against Audrey's. Validate `design-tokens.json` matches what Audrey's site actually looks like. **Stop and ask me to review.**

### Session 3: Audit passes

Build all 10 audit passes as parallel modules. Before implementing each pass, read the corresponding installed skill if one exists:
- `seo/` — read `.agents/skills/seo-audit/SKILL.md` first
- `sales/` — read `.agents/skills/page-cro/SKILL.md` and `.agents/skills/form-cro/SKILL.md` first
- `links/` — read `.agents/skills/site-architecture/SKILL.md` first
- `schema/` — read `.agents/skills/schema-markup/SKILL.md` first
- `aeo/` — read `.agents/skills/ai-seo/SKILL.md` first
- All others: build from scratch per the audit framework spec above

Each pass reads from already-scraped data — no additional Firecrawl calls. Run `upriver audit audreys` and produce the full `./clients/audreys/audit/` directory. **Stop and ask me to review all 10 pass outputs.**

### Session 4: Synthesis and brief

Build `upriver synthesize` and `upriver design-brief`. The synthesize command must generate both `audit-package.json` and `./clients/<slug>/repo/.agents/product-marketing-context.md` — the latter is required before any marketing skill can run in the client repo. Validate both outputs for Audrey's. Joshua takes the brief to Claude Design and builds the deck. **Stop and ask me to review the JSON, the product-marketing-context file, and the brief.**

### Session 5: Interview tooling

Build `upriver interview-prep` and `upriver process-interview`. The process-interview command must read `.agents/skills/customer-research/SKILL.md` before implementing its synthesis logic. Run `interview-prep` against Audrey's. **Stop and ask me to review the interview guide.**

### Session 6: Scaffold template
Build `packages/scaffold-template` — the complete Astro 6 hybrid template with all the architecture from the v2 build prompt. Validate it builds (`astro build`), the public pages are static, and /admin is SSR with a working Better Auth login.

### Session 7: Scaffold CLI + clone

Build all `upriver scaffold` subcommands. Build `upriver clone` — the clone command's per-page agent prompts must reference `.agents/skills/copywriting/SKILL.md` for content rewriting and run a `.agents/skills/copy-editing/SKILL.md` pass before raising each page PR. Confirm both skills are being invoked by checking that the first PR includes inline copy-editing comments.

Run the full scaffold + clone against Audrey's. Validate the Vercel preview URL looks like audreysfarmhouse.com and that the first page PR contains copy-editing feedback. **This is the big validation gate.**

### Session 8: Fixes, QA, skills, docs

Build `upriver fixes plan`, `upriver fixes apply`, `upriver qa`, `upriver launch-checklist`. Build all six Upriver SKILL.md files. Write all documentation including `docs/marketing-skills-integration.md` — how each of the nine installed marketingskills slots into the workflow, which command invokes which skill, and how to update skills when the library releases new versions (`git pull` in the `.agents/marketingskills` submodule if installed that way).

---

## Success criteria

1. `upriver discover audreys` completes in under 2 minutes, produces an accurate full page inventory, pulls at least one review source, and — if GSC is configured — pulls real GSC data.
2. `upriver scrape audreys` completes in under 15 minutes, downloads all screenshots to disk immediately, and produces a `design-tokens.json` that accurately represents the Audrey's Farmhouse visual identity.
3. `upriver audit audreys` completes in under 10 minutes across all 10 dimensions. The `seo`, `sales`, `links`, `schema`, and `aeo` passes demonstrably use their corresponding installed marketing skill's framework, not a hand-rolled checklist.
4. `upriver synthesize audreys` produces an `audit-package.json` that passes schema validation, contains well-written finding narratives, writes `product-marketing-context.md`, generates a customized `CLAUDE.md` for the client repo, and writes the initial `CHANGELOG.md`.
5. The Claude Design brief gives a human everything they need to produce a professional audit deck in Claude Design in under 30 minutes.
6. `upriver scaffold audreys` produces a working Astro hybrid site that:
   - Lighthouse scores ≥95 desktop / ≥90 mobile on the public homepage
   - Has a functional /admin login via Better Auth
   - Shows all admin routes (inquiries, reviews, requests, documents, services, seo, health, content, analytics, settings) even if some show placeholder data
   - The service store loads the Upriver service catalog and shows Preferred pricing for the client
   - The change request form submits and creates a real GitHub issue in the client repo
   - The GitHub Action workflow file is committed and the `client-request` label triggers it
7. The Vercel preview visually resembles audreysfarmhouse.com closely enough that a client recognizes it as their own site.
8. The first page PR from `upriver clone audreys` includes inline copy-editing feedback as code comments.
9. Submitting a test change request via /admin/requests creates a GitHub issue, triggers the Claude Code Action, and a draft PR appears within 10 minutes with a working Vercel preview URL.
10. The usage_events table in the Upriver internal Supabase project logs every Firecrawl credit and Claude token consumed.
11. Total Firecrawl credits per average 20-page client: under 300.
12. Total Claude API cost per engagement (audit + clone): under $10.
13. Total human time from URL to preview-ready scaffold: under 4 hours.

---

## What NOT to build

- A web UI for the CLI. Terminal only.
- Multi-tenant hosting. One Vercel + Supabase + GitHub per client, always.
- Direct Claude Design API integration. It doesn't exist. Produce the brief. The human does the rest.
- Automated DNS changes. Checklist only.
- Email sending or Slack posting. Artifacts only; humans send.
- A Playwright screenshot pipeline. Firecrawl handles screenshots.
- A custom design-token extractor. Firecrawl's `branding` format handles this.
- Rewrites or forks of the installed marketingskills. They are read-only dependencies. If a skill's methodology needs to be extended for our use case, document the extension in `docs/marketing-skills-integration.md` and apply it in the calling code — do not edit the skill files themselves. Updates come from the upstream repo.
- Marketing skills for the areas we explicitly skipped: paid ads, SaaS onboarding flows, churn prevention, referral programs, A/B testing setup, pricing strategy. If a future engagement needs these, install them then. Don't install them speculatively now.

---

## First thing to do

Start with Session 1. Initialize the monorepo, build `packages/core` with the typed Firecrawl client, implement `upriver init` and `upriver discover`, and run both against `https://audreysfarmhouse.com` with slug `audreys`. When the site map and content inventory files exist and look right, stop and show me the outputs.
