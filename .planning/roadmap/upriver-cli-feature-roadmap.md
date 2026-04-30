# Upriver CLI Feature Expansion Roadmap

**Build specification for Claude Code**

This document is the canonical specification for an eleven-feature expansion to the Upriver CLI. It consolidates F00 through F12 into a single build runbook. Read it in full before beginning implementation.

The features extend the existing pipeline (init → scrape → audit → synthesize → design-brief → scaffold → clone → finalize → clone-fidelity → fixes-plan → fixes apply → qa → improve → launch-checklist) with new audit passes, new pipeline stages, new sellable deliverables, and a GitHub-native retainer hook that converts one-time engagements into ongoing relationships.

## Part 1: Strategic Overview

### 1.1 Why this expansion exists

The current CLI delivers a strong audit-then-rebuild pipeline. This expansion does three things that change the shape of the business:

It deepens the audit so each stage produces sellable deliverables in their own right (voice extract, schema build, gap analysis, video audit, blog topics, custom tools). A prospect who agrees only to a $750 voice extract often becomes a $12,000 rebuild client three months later.

It adds the iOS prototype as a sales artifact that closes the engagement and seeds App Store conversations for the small minority of clients who genuinely need a native app.

It adds the natural language admin (built on GitHub Issues) which converts $8,000 one-time projects into $300/month retainer relationships. Ten retainer clients equal the revenue of nearly five new $8K projects per year, with dramatically lower acquisition cost.

### 1.2 The eleven features

| ID | Name | What it does | Phase |
|----|------|-------------|-------|
| F01 | Media audit | Flags stock photos, scores image quality, generates shot list. Sets up the photography upsell. | 1 |
| F02 | Schema build | Generates LocalBusiness, FAQ, Service, Event, Review schemas. Sold standalone or part of rebuild. | 1 |
| F03 | Voice extract | Derives a brand voice guide from existing copy. Feeds admin and improve stages. | 1 |
| F09 | Gap analysis | Identifies missing pages and features, recommends information architecture, drives rebuild scope. | 1 |
| F12 | Video audit | Page-by-page recommendation of what video should belong where. Sells video production work. | 1 |
| F10 | Blog topics | Pulls Ahrefs data, produces 25 ranked topics with briefs. Standalone $750 deliverable. | 1 |
| F06 | Monitor | Weekly automated re-audit against retainer clients. Reduces churn. | 2 |
| F07 | Followup | Six-month re-audit of former clients. Generates case studies and re-engagement material. | 2 |
| F04 | iOS prototype | Generates Expo React Native prototype. $1,500 sales artifact with App Store upsell path. | 2 |
| F11 | Custom admin tools | Proposes bespoke backend tools per client (curriculum builder, recipe system). High-margin upsell. | 2 |
| F05 | Natural language admin | GitHub Issues becomes change request queue. Claude Code opens PRs, operator approves in GitHub. | 3 |

### 1.3 How features depend on each other

Voice extract (F03) feeds the natural language admin (F05) because the admin's generated content needs to match the client's voice. Voice extract also feeds the improve stage so SEO content additions sound right, feeds blog topic generation (F10) so generated topic angles and titles match the client's tone, and feeds video audit (F12) so script outlines for owner introductions and FAQ videos sound like the client.

Media audit (F01) feeds the iOS prototype (F04) because the prototype needs to know which images are high-quality enough to use in the app. Media audit also feeds video audit (F12) because the video audit needs to know which existing video assets are authentic and which pages already have video.

Schema build (F02) is independent but should run before QA so the rebuild's schema gets scored.

Gap analysis (F09) feeds the design brief, scaffold stage, clone stage, finalize stage (for redirects), and improve stage. It produces the proposed sitemap that drives the rebuild's information architecture rather than mirroring the original IA. Gap analysis also feeds video audit (F12) because new pages proposed by gap analysis are evaluated for video opportunities, and feeds custom admin tools (F11) so custom tools focuses on what's beyond standard features.

Blog topic generation (F10) feeds the design brief's content strategy section. It also feeds the natural language admin (F05): when a client submits an issue requesting "the next blog post," the admin reads the topic roadmap and uses the corresponding brief to generate the draft.

Custom admin tools (F11) reads gap analysis output to ensure proposed tools are genuinely custom. Output feeds the natural language admin (F05) and the followup stage (F07) so unbuilt tools become re-engagement angles.

Video audit (F12) reads media audit output for existing video classification, gap analysis output for new pages to evaluate, and voice extract output for script tone.

Monitor (F06) and followup (F07) both reuse a lite version of the existing audit command. They share infrastructure but serve different audiences (monitor: active retainer clients; followup: former clients).

The natural language admin (F05) is the most complex feature. It depends on the cloned or scaffolded site existing, on a GitHub repo for the client, on Vercel deployment, on the Phase 3 worker infrastructure, and on operator-side notification infrastructure. Architecturally it sits on top of GitHub primitives (Issues, PRs, webhooks) rather than introducing a parallel queue or approval system.

## Part 2: Build Phases and Verification Gates

Three phases. Do not begin a phase until the previous phase passes its gate. Each phase has an explicit verification list at the end.

### Phase 1: Foundation (six features)

Build in this order:

1. **F03 voice extract** first. Smallest scope. Produces output that other features consume.
2. **F01 media audit** second. New audit pass following the existing pattern. Lowest risk. Validates the new-audit-pass extension path.
3. **F02 schema build** third. Integrates into the improve stage; produces a deployable component for the rebuilt site.
4. **F09 gap analysis** fourth. Builds on the audit pass pattern but produces the proposed sitemap that downstream rebuild stages need to consume.
5. **F12 video audit** fifth. Depends on F01 and F03, both built earlier in this phase.
6. **F10 blog topic generation** sixth. Depends on F03. Has the most external API surface (Ahrefs MCP integration); building it last in Phase 1 lets the simpler features stabilize first.

**Phase 1 verification gate:**

- All six commands run end to end on the audreys test client.
- All six outputs validate against their schemas.
- The audit-summary.json correctly reflects findings from the new media audit, gap analysis, and video audit passes.
- `upriver audit audreys --mode=deep` runs with media, gaps, and video passes included and produces no errors.
- The dashboard's Pipeline panel shows six new Run buttons (voice-extract, audit-media, schema-build, gap-analysis, video-audit, blog-topics) and all six buttons successfully invoke their commands.
- The proposed sitemap from gap analysis is correctly consumed by the scaffold stage; a test rebuild using the proposed IA succeeds.
- The redirect rules generated by the finalize stage cover every URL change from the proposed sitemap.
- Blog topic briefs are detailed enough to draft a publishable post from (verified by handing one brief to Claude Code and confirming output quality).
- Video audit produces a page-by-page plan with shot lists; voice-matched script outlines pull from voice-rules.json correctly.
- Existing pipeline stages still run end to end without regressions. Run a full `upriver run all audreys` and confirm completion.
- Token cost increase from Phase 1 stays under $30 for a typical 30-page site (Ahrefs API portion of F10 stays within typical plan limits).

### Phase 2: Cross-feature integration (four features)

Build in this order:

7. **F06 monitor stage** first in Phase 2. Reuses audit infrastructure, integrates with the worker schedule system, validates the email delivery path that F07 will also use.
8. **F07 followup stage** second. Architecturally similar to monitor with deeper outputs.
9. **F04 iOS prototype** third. Depends on F01 for image quality filtering. Prototype template package is new but doesn't disrupt existing code.
10. **F11 custom admin tools** fourth. Depends on F09. Last in Phase 2 because it has the most open-ended generation logic.

**Phase 2 verification gate:**

- Monitor produces correct delta reports for at least three test clients with different baselines.
- Monitor's Inngest schedule fires correctly on a test cron.
- Followup produces both case study and re-engagement outputs for the audreys test client.
- iOS prototype builds and runs in Expo Go on a real iPhone.
- iOS prototype QR code (when `--publish` is used with valid Expo credentials) installs the app within 30 seconds on a fresh iPhone.
- Custom admin tools produces specific industry-tailored concepts (verified against preschool, restaurant, and CPA fixtures).
- Custom admin tools sales talking points are detailed enough to use directly without rewriting.
- All four features show up in the dashboard with appropriate UI panels.
- The aggregated dashboard view correctly displays monitor status across all clients and past-clients view correctly lists clients with completed engagements.
- No regressions to Phase 1 features or existing pipeline stages.

### Phase 3: The retainer hook (one feature)

11. **F05 natural language admin**. Most complex feature in the suite. Requires production deployment work, GitHub integration, security model, operator notification infrastructure, and the existing Phase 3 worker provisioning to be complete.

**Phase 3 verification gate:**

- Admin deploys for the audreys test client: GitHub repo is configured with issue templates, labels, and webhook; optional client form is deployed to Vercel.
- Test client submits a change request through the form (or directly through GitHub).
- The bot comments with parsed intent within thirty seconds of issue creation and applies the `in-progress` label.
- Headless Claude Code session opens a PR within five minutes, references `Closes #<issue>`, and applies the `pending-review` label.
- Operator gets GitHub notification and Slack notification when the PR is ready.
- Operator approves PR through GitHub; Vercel auto-deploys; issue closes automatically.
- Refine flow works: operator's PR comments trigger a second Claude Code session that pushes new commits to the same branch within five minutes.
- Reject flow works: closing the PR without merging triggers the bot to comment on the issue with the rejection reason and close it.
- Asset-needed flow works: an issue referencing a missing photo transitions to `awaiting-assets`, bot comments requesting the asset, client uploads via issue comment, processor resumes.
- Voice-check failure flow works: a generated change that violates voice rules transitions to `voice-check-failed` label for operator review rather than auto-merging.
- PIN rotation, pause, and resume commands all work as specified.
- Aggregated approval queue across multiple clients functions correctly, pulling from GitHub's search API.
- No regressions to any prior features or existing pipeline.

## Part 3: Feature Specifications

Each feature follows the existing 8-section format from the C-series and I-series specs.

---

### F01 — Media audit pass

#### 1. Purpose

The media audit identifies every image and video on the client's site, scores them for authenticity and quality, and generates a shot list for replacement content. It exists because Upriver's actual differentiation is that I show up with a Sony FX3 the next week. No other AI website rebuild service can do this, and the audit needs to surface the opportunity loud enough that the photography upsell becomes obvious to the client.

The output sells the photography work. A site rebuild that quotes $8,000 becomes a $14,000 rebuild plus shoot when the audit deck includes a section titled "Twelve photos and one short film your site needs, and what they would cost to make."

#### 2. Command interface

```
upriver audit-media <slug>
```

Flags:
- `--sample-size=<n>`: cap on images sent to the vision API (default 30, max 100). Sampling is needed because some sites have hundreds of images and full analysis burns tokens.
- `--threshold=<low|medium|high>`: minimum confidence required to flag an image as stock or AI-generated. Default `medium`.
- `--no-shotlist`: skip the shot list generation; produce only the per-image findings.

The pass also runs automatically when `upriver audit <slug> --mode=deep` is invoked.

#### 3. Inputs

- `clients/<slug>/pages/<page>.{html,md,json}` from the scrape stage. Each scraped page already has its image URLs extracted into the JSON.
- `clients/<slug>/client-config.yaml` for industry context.
- Optional: `clients/<slug>/voice/brand-voice.md` from F03 if it has run, for tone-matched shot list captions.

#### 4. Outputs

- `clients/<slug>/audit/media.json`. Per-image record with: source URL, page where it appears, dimensions, file size, format, alt text presence, classification (`authentic | stock | ai-generated | screenshot | logo | icon | unknown`), quality score 0-100, recommendation.
- `clients/<slug>/media-shotlist.md`. Operator and client facing markdown doc with summary of media inventory, count by classification, list of recommended replacement shots organized by page and use case, estimated shoot time and cost ranges.
- `clients/<slug>/media-shotlist.html`. Same content rendered for inclusion in the audit report.

The findings also append to `audit-summary.json` so the executive summary surfaces media issues alongside SEO and content findings.

#### 5. Implementation approach

Run image classification in three stages to keep token cost manageable:

**Stage A: cheap heuristics first.** Filter out anything that's obviously not editorial (logos under 200px, icons, decorative SVGs, hero background patterns). Catches roughly 40% of images for free.

**Stage B: reverse image lookup.** For remaining candidates, hit a reverse image search service to detect stock photos. Use TinEye API or Google Vision API's web detection. Stock photos light up immediately because they appear on hundreds of other sites. Catches another 30%.

**Stage C: vision API analysis.** For images that survived A and B, send to Anthropic's vision API in batches with a prompt that scores authenticity, photographic quality, brand fit, and use-case fit.

The shot list generator reads the findings plus the client industry and produces a markdown deliverable. Shot list entries include page where the photo would go, subject and composition guidance, recommended time of day and location, estimated capture time, and a price range using the standard Upriver content rates.

For video assets, the same flow applies with simpler heuristics: flag generic stock B-roll, identify pages that would benefit from a custom video, recommend Mux integration where the existing site uses YouTube embeds.

#### 6. Integration with existing pipeline

Register as a new audit pass in `packages/core/src/audit/passes/media.ts`. Add to the pass registry in `packages/core/src/audit/registry.ts`. Tag as `mode: 'deep'` so it runs under `--mode=deep` and `--mode=all`.

Add `audit-media` as a standalone command in `packages/cli/src/commands/audit-media.ts`.

Update `packages/core/src/pipeline/stages.ts` to include `audit-media` as a stage. The dashboard will pick this up automatically.

The media-shotlist.md gets included in the report-build output. Add a new section "Media inventory and shot list" to the report template at `packages/core/src/reports/templates/audit-report.html`.

#### 7. Dependencies

New packages:
- `@anthropic-ai/sdk` (already in repo, used differently for vision)
- `sharp` for image dimension reads
- `image-size` as a fallback

New environment variables:
- `TINEYE_API_KEY` or `GOOGLE_VISION_API_KEY` for reverse image lookup. Document that one of these is required for stage B; the pass degrades gracefully if neither is set.

New industry config field added to `packages/core/src/industry/configs/*.yaml`:
```yaml
media:
  expected_authentic_count_min: 12
  expected_authentic_count_max: 40
  shoot_recommendations:
    - hero_lifestyle
    - team_portraits
    - product_or_space_detail
    - brand_film_short
```

#### 8. Acceptance criteria

- Running `upriver audit-media audreys` produces `audit/media.json` and `media-shotlist.md` within five minutes on a 30-page site.
- The findings file validates against the existing audit finding schema (priority, score, location, recommendation, rationale).
- The shot list deliverable renders cleanly in both markdown preview and the report HTML output.
- A test against a known stock-photo-heavy site correctly identifies at least 80% of stock images.
- Token cost for a 30-page site stays under $3 at default settings.
- The pass shows up as a Run button in the local dashboard's Pipeline panel.
- `upriver audit audreys --mode=deep` runs the media pass alongside other deep passes without errors.

---

### F02 — Schema build

#### 1. Purpose

Most local businesses ship sites with no JSON-LD or with broken JSON-LD copy-pasted from a 2018 blog post. Schema build generates comprehensive, industry-appropriate structured data for every page of the rebuilt site and produces a one-line install snippet so non-technical site owners can use the output even without my involvement.

This is also a standalone product. A Hudson Valley CPA firm that doesn't want a full rebuild can pay $500 for a schema package, get accurate LocalBusiness, FAQ, and Service schemas, and see ranking improvements within weeks.

#### 2. Command interface

```
upriver schema-build <slug>
```

Flags:
- `--types=<comma-separated>`: limit which schema types to generate. Defaults to all applicable types for the client's industry. Options: `localbusiness, faq, service, event, review, product, article, breadcrumb, organization, person`.
- `--validate`: run output through Schema.org's validator before writing files.
- `--no-pages`: skip per-page schemas and produce only the site-wide schemas.

The command also runs as part of the `improve` stage unless `--skip-schema` is passed.

#### 3. Inputs

- `clients/<slug>/audit-package.json` for industry classification, business name, address, hours, services, and review aggregates.
- `clients/<slug>/pages/<page>.{html,md,json}` for per-page context.
- `clients/<slug>/client-config.yaml` for any operator-supplied facts.
- Optional: `clients/<slug>/intake.json` from the interview stage.

#### 4. Outputs

- `clients/<slug>/schema/site.json`. Site-wide schemas: Organization, LocalBusiness, BreadcrumbList template.
- `clients/<slug>/schema/pages/<page-slug>.json`. Per-page schemas matched to page type.
- `clients/<slug>/schema-install.md`. Installation guide with three options: drop-in Astro component, copy-paste HTML for clients still on their old site, WordPress plugin instructions.
- `clients/<slug>/schema/manifest.json`. Index of all generated schemas with their target pages and validation status.

#### 5. Implementation approach

Page type classification first. A simple classifier reads scraped page content and routes to the right schema generators. The classifier handles ambiguity by allowing multiple schemas per page (a service page can be Service + FAQPage if it has FAQs).

Schema generators live in `packages/core/src/schema/generators/` with one file per type:

- `localbusiness.ts`: reads address, hours, telephone, geo coordinates (geocode if not present). Includes priceRange when audit-package has it. Handles industry-specific subtypes: `Restaurant`, `LodgingBusiness`, `AccountingService`. WeddingVenue is a custom type; fall back to `EventVenue` for strict validators.
- `faq.ts`: extracts question-answer pairs from FAQ pages. Handles definition lists, h3 followed by paragraph, accordion components.
- `service.ts`: per-service schema with name, description, provider reference, offers when pricing is on the page.
- `event.ts`: for venues and event-driven businesses.
- `review.ts`: review aggregate from sources the audit identifies. Marks `aggregateRating` only when source data is verifiable; never fabricates ratings.
- `product.ts`, `article.ts`, `breadcrumb.ts`, `organization.ts`, `person.ts`: standard implementations following Schema.org spec.

Each generator validates output against Schema.org and Google's structured data testing tool's known requirements. Pages get a single combined JSON-LD block (multiple `@type` entries when needed).

The Astro component output looks like:
```astro
---
import schema from '../schema/pages/index.json';
---
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

The component file generates as part of the rebuilt site so it's wired in automatically when schema build runs after the clone stage.

#### 6. Integration with existing pipeline

Register as a stage in `packages/core/src/pipeline/stages.ts` between `improve` and `qa`. QA scores schema validity, so the rebuild needs schemas in place before QA runs.

Update `packages/core/src/improve/runner.ts` to call schema-build as a sub-task.

When run in standalone product mode (no rebuild, just schema), output goes to the same `clients/<slug>/schema/` directory and the install guide gets generated for the original site. The CLI infers product mode from the absence of `clients/<slug>/site/`.

Schema validation results feed into `audit-summary.json` so improvements show up in the QA delta report.

#### 7. Dependencies

New packages:
- `schema-dts` for TypeScript types of Schema.org vocabulary.
- `@types/schema-dts` peer dependency.

New environment variables:
- `GOOGLE_GEOCODING_API_KEY` for address-to-coordinates lookup. Required when LocalBusiness schemas are generated and the client config doesn't provide lat/lng. Fallback: if no key, geo block is omitted with a warning logged.

Industry config additions per industry:
```yaml
schema:
  primary_type: WeddingVenue
  fallback_type: EventVenue
  recommended_schemas:
    - LocalBusiness
    - FAQPage
    - Service
    - Event
    - Review
  required_props:
    LocalBusiness:
      - name
      - address
      - telephone
      - openingHours
      - priceRange
```

#### 8. Acceptance criteria

- Running `upriver schema-build audreys` produces a complete schema package within two minutes for a 30-page site.
- Generated schemas pass Google's Rich Results Test for the appropriate result types.
- The Astro component drop-in works in the rebuilt site without manual edits.
- The install guide includes accurate copy-paste instructions for at least three platforms (Astro, raw HTML, WordPress).
- Schema validation results appear in the QA delta report.
- Schema build runs successfully in standalone product mode and produces the same outputs scoped to the original site.
- A test against a fixture site with intentionally broken existing schema correctly replaces the broken schemas without preserving the errors.

---

### F03 — Voice extract

#### 1. Purpose

Voice extract derives a brand voice guide from the client's existing copy. The synthesize stage already produces a brand voice draft, but it's quick and impressionistic. Voice extract is the deeper version: a comprehensive style guide that captures sentence patterns, vocabulary preferences, signature phrases, banned words, formality level, and persona signals.

The natural language admin (F05) needs a voice spec strict enough that AI-generated content reliably sounds like the client wrote it. Voice extract is also sellable as a standalone deliverable. Businesses that don't want a website rebuild but do want consistent copy across email, social, and landing pages will pay $750 for a brand voice guide.

#### 2. Command interface

```
upriver voice-extract <slug>
```

Flags:
- `--depth=<quick|standard|deep>`: how thorough the analysis is. Quick uses sample of 5 pages, standard 15, deep every scraped page. Default `standard`.
- `--include-emails=<path>`: optional path to a file or directory containing the client's email correspondence.
- `--audience=<role>`: when the client has multiple personas (e.g., venue couples vs venue planners), specifying which audience produces a tighter guide.

#### 3. Inputs

- `clients/<slug>/pages/<page>.{html,md,json}` from the scrape stage. Markdown is preferred since it strips layout noise.
- `clients/<slug>/audit-package.json` for any voice-related findings.
- `clients/<slug>/client-config.yaml` for industry context.
- Optional supplemental sources passed via flags.

#### 4. Outputs

- `clients/<slug>/voice/brand-voice.md`. The primary deliverable. Multi-section markdown doc covering the dimensions in section 5.
- `clients/<slug>/voice/voice-rules.json`. Machine-readable version with banned words, required phrases, sentence length distributions, formality score. Used by admin and improve stages.
- `clients/<slug>/voice/sample-rewrites.md`. Three to five before/after rewrites of paragraphs from the client's existing site.

#### 5. Implementation approach

The brand voice doc covers these dimensions:

**Persona summary.** One paragraph describing who the client sounds like when they write. References specific evidence from their copy.

**Tone profile.** Where the voice sits on these spectra: formal/casual, warm/professional, expert/accessible, playful/serious, traditional/contemporary. Include a short rationale for each placement and the sentence in their copy that pegged it there.

**Sentence patterns.** Average sentence length, short sentence frequency, paragraph length range, common sentence structures. Identify whether the client uses fragments for emphasis, rhetorical questions, parenthetical asides.

**Vocabulary fingerprint.** Words and phrases that appear repeatedly and feel signature. Distinguish between genuine voice markers worth preserving and tics that feel overused.

**Banned words and phrases.** Words the client never uses, and words they should never use given their voice. The Upriver banned list gets cross-referenced; if any appear in client copy, they're flagged.

**Punctuation and formatting preferences.** Em dash usage (Upriver bans them; the client may use them; the voice guide records the client's actual practice). Oxford comma. Bullet versus prose. Capitalization of headings.

**Formality calibration by surface.** A client's homepage voice often differs from FAQ voice or service detail voice. The guide breaks formality down by surface so AI-generated content for each surface lands in the right register.

**Audience-specific adjustments.** Different sections of the site speak to different readers.

**Three to five rewrite examples.** Sample paragraphs from the client's site, rewritten to demonstrate the voice guide in stricter form.

**Voice prompt block.** A copy-paste prompt suitable for use in Claude conversations. This is what gets fed to the natural language admin and to any future AI-assisted content generation.

The implementation runs in two passes. First pass extracts raw signals (sentence length stats, vocabulary frequency, structural patterns) using deterministic analysis. Second pass sends signals plus a sample of the actual copy to Anthropic's API with a structured prompt that asks for the dimension-by-dimension breakdown.

The voice-rules.json output schema:
```json
{
  "voice_id": "<slug>-v1",
  "extracted_at": "<iso timestamp>",
  "sentence_length": { "mean": 14, "p50": 12, "p90": 22 },
  "banned_words": ["<words>"],
  "required_voice_markers": ["<phrases that must appear in long content>"],
  "formality_score": 0.62,
  "audience_variants": [
    { "name": "couples", "formality": 0.55 },
    { "name": "vendors", "formality": 0.78 }
  ],
  "voice_prompt": "<the copy-paste Claude prompt>"
}
```

#### 6. Integration with existing pipeline

Register as a stage in `packages/core/src/pipeline/stages.ts` between `synthesize` and `design-brief`. The design brief's voice section gets richer when voice-extract has run; if not, design brief falls back to the lighter synthesize draft.

The improve stage reads `voice-rules.json` if it exists. Generated copy in improve passes through a voice check before write.

The natural language admin (F05) hard-requires the voice file. Admin deployment fails fast if missing.

When voice extract runs in standalone product mode, it depends only on the scrape stage. The CLI handles this by chaining: a `voice-extract` invocation auto-runs `init` and `scrape` first if those haven't completed.

#### 7. Dependencies

No new packages. Uses existing Anthropic SDK and standard Node text processing.

No new environment variables.

The voice extract prompt template lives at `packages/core/src/voice/prompt.ts`. Tunable.

#### 8. Acceptance criteria

- Running `upriver voice-extract audreys` produces all three output files within four minutes on a standard depth analysis of a 30-page site.
- The brand-voice.md deliverable is roughly 1,500 to 2,500 words depending on copy volume.
- The voice-rules.json validates against the schema in `packages/core/src/voice/schema.json`.
- Sample rewrites demonstrably preserve the client's voice signals.
- The output sets up the admin (F05) to generate content that passes the same voice check at >85% similarity to the original.
- Token cost stays under $4 for a standard depth run on a 30-page site.
- Standalone product mode works: a fresh `upriver voice-extract <slug>` on a slug that's never been audited completes successfully by chaining through init and scrape.

---

### F04 — iOS prototype app

#### 1. Purpose

The iOS prototype is a sales artifact. After the audit and rebuild, the operator wants something physical the client can hold. A QR code that installs an Expo Go preview of a custom mobile app for their business, mapped from their actual site content, is dramatically more memorable than another deck.

Most clients don't need a real native app, and the spec is honest about that. The prototype is a $1,500 deliverable that closes the engagement and seeds the conversation about a real App Store build for the small minority of businesses that genuinely benefit. For everyone else, the prototype itself is the deliverable.

#### 2. Command interface

```
upriver prototype-app <slug>
```

Flags:
- `--platform=<ios|android|both>`: which native platforms to target. Default `ios`. Expo handles cross-platform; `both` only adds about ten minutes.
- `--screens=<comma-separated>`: which screens to generate. Default is home + three highest-traffic pages (read from GSC data if present).
- `--publish`: publish to Expo's preview service so the QR code is shareable.
- `--brand-spec=<path>`: optional path to a custom brand spec.

#### 3. Inputs

- `clients/<slug>/client-config.yaml` for brand colors, logo URL, business name, tagline.
- `clients/<slug>/pages/<page>.json` for content of mapped screens.
- `clients/<slug>/site/tailwind.config.js` (from the rebuilt Astro site) for design token alignment.
- `clients/<slug>/audit/media.json` (from F01) so the prototype only uses images flagged as authentic.
- `clients/<slug>/voice/voice-rules.json` (from F03) for any AI-generated screen copy.
- Optional GSC data from the init stage for traffic-based screen selection.

#### 4. Outputs

- `clients/<slug>/app-prototype/`. A complete Expo React Native project ready to `expo start`.
- `clients/<slug>/app-prototype/PREVIEW.md`. Operator-facing instructions.
- `clients/<slug>/app-prototype/qr-code.png`. The Expo Go install QR (when `--publish` is passed).
- `clients/<slug>/app-prototype/screenshots/`. Auto-generated screenshots of each screen.

#### 5. Implementation approach

Five steps:

**Step 1: scaffold the Expo project.** Copy from `packages/app-prototype-template/` (a new package added by this feature). The template has React Navigation, Expo Router, NativeWind, and a theme provider already wired up.

**Step 2: translate design tokens.** Read the Astro site's tailwind.config and write a React Native theme file that mirrors the same colors, typography, and spacing.

**Step 3: select and map screens.** Default screen selection: home is always first. Add the three pages with highest GSC clicks if available; otherwise add the three pages most linked from the homepage. Translate each web page to a native screen by stripping web-specific layout, replacing web navigation with native tab bar and stack navigation, converting forms to native input components, mapping web images to React Native Image components using only authentic media from F01.

**Step 4: generate screen components.** Each mapped screen gets a `<ScreenName>Screen.tsx` file. Generation runs through a headless Claude Code session prompted with the page's scraped content, design tokens, and React Native component patterns from the template. Enforces no fabricated content, only authentic media, native UX patterns over web UX.

**Step 5: build configuration and metadata.** Generate `app.json` with the client's name as the app name, their logo (sized for iOS) as the icon, brand accent color. Set the slug for Expo's preview service.

The default screen set has four screens for most businesses: Home, Services (or Menu, or Listings, depending on industry), Contact, About. Industry config can override.

The prototype includes one interactive feature beyond static content: a contact action that uses native APIs (tel:, mailto:, calendar) so the client experiences the app doing something real.

When `--publish` runs, the CLI authenticates to Expo using a service account, runs `expo publish`, captures the resulting URL, and renders the QR code as a PNG.

#### 6. Integration with existing pipeline

Register as a stage in `packages/core/src/pipeline/stages.ts` after `clone-fidelity` and before `fixes-plan`.

Add `--include-prototype` flag to `upriver run all` (default false). The prototype is opt-in for the full pipeline because it adds 10-20 minutes and isn't always part of engagement scope.

The prototype gets its own dashboard panel showing: status, last build date, Expo preview URL, QR code preview, screenshots gallery. Add at `packages/dashboard/src/pages/clients/[slug]/prototype.astro`.

The audit report HTML template gets a new optional section "Mobile prototype" that includes the QR code and screenshots when the prototype has been built.

#### 7. Dependencies

New packages added to the monorepo:
- `packages/app-prototype-template/`: the Expo template that gets copied per-client. Inside the template: `expo`, `expo-router`, `react-native`, `nativewind`, `expo-linking`, `expo-image`, `react-native-safe-area-context`.

New CLI dependencies:
- `qrcode` for generating the preview QR PNG.
- `@expo/cli` available as a dependency of the template.

New environment variables:
- `EXPO_TOKEN`: Expo account token for `--publish` flag. Without the token, prototype builds locally and the operator publishes manually.

New industry config field:
```yaml
prototype:
  default_screens:
    - home
    - services
    - contact
    - about
  primary_action: "call"
  feature_flags:
    show_gallery_grid: false
    show_map: true
```

#### 8. Acceptance criteria

- Running `upriver prototype-app audreys` produces a working Expo project at `clients/audreys/app-prototype/` within 15 minutes.
- `cd clients/audreys/app-prototype && npx expo start` launches a development server and the project loads in Expo Go on a real iPhone.
- All four default screens render with the client's actual content and brand colors, using only authentic photos from F01.
- The contact action successfully launches the iPhone's native phone, mail, or calendar app.
- With `--publish` and a valid `EXPO_TOKEN`, the QR code in `qr-code.png` installs the prototype on a fresh iPhone within 30 seconds.
- Auto-generated screenshots match the rendered screens.
- The dashboard's prototype panel correctly shows build status and lets the operator regenerate.
- Industry config for wedding venues produces the correct default screen set when run on a venue test client.

---

### F05 — Natural language admin

#### 1. Purpose

The natural language admin is the retainer hook. Once a client's site is rebuilt, they submit plain English change requests ("add a section about our fall menu to the homepage with a photo of the duck dish") and Claude Code, running headless on the operator's infrastructure, opens a pull request against the client's GitHub repo. The operator reviews the PR in GitHub, approves or refines, and Vercel auto-deploys.

This is the most consequential feature in the suite because it converts one-time $8K rebuild engagements into $300/mo retainer relationships that run indefinitely.

The architecture is built on GitHub primitives. GitHub Issues is the change request queue. GitHub PRs is the approval queue. GitHub issue and PR history is the audit trail. There is no custom database, no custom approval UI, and no custom change history view. The operator already lives in GitHub for code review; consolidating retainer operations around the same tools means no context switching and no parallel infrastructure to maintain.

#### 2. Command interface

```
upriver admin-deploy <slug>
```

Flags:
- `--repo=<github-repo>`: GitHub repo the admin will operate against. Required. Format `owner/repo`.
- `--client-form=<true|false>`: deploy the client-facing form for non-technical clients. Default `true`.
- `--form-domain=<custom-domain>`: deploy the form to a custom subdomain.
- `--form-pin=<6-digit>`: PIN protection for the client-facing form. Default generates a random 6-digit PIN.
- `--no-deploy`: build locally without deploying.

After initial deploy, additional commands:

```
upriver admin-rotate-pin <slug>          # rotate the form PIN
upriver admin-pause <slug>               # disable change request processing
upriver admin-status <slug>              # health check, recent activity
upriver admin-changes <slug>             # list open issues and PRs across the client repo
```

#### 3. Inputs

- `clients/<slug>/site/`: the rebuilt Astro site source. Required.
- `clients/<slug>/voice/voice-rules.json` from F03. Required.
- `clients/<slug>/audit-package.json` for industry context.
- `clients/<slug>/client-config.yaml` for branding and the GitHub repo target.
- `clients/<slug>/schema/site.json` from F02 for any schema-aware changes.

#### 4. Outputs

- A configured GitHub repository with: webhook installed (or Upriver GitHub App configured), issue templates set up under `.github/ISSUE_TEMPLATE/`, labels created (`change-request`, `in-progress`, `awaiting-assets`, `pending-review`, `voice-check-failed`).
- An Inngest event handler registered to receive GitHub webhook events.
- Optional: a deployed client-facing form at the configured Vercel project. The form is a single Next.js page; no database.
- `clients/<slug>/admin/CLIENT_GUIDE.md`. Short markdown guide for the client.
- `clients/<slug>/admin/OPERATOR_GUIDE.md`. Operator-facing reference.

#### 5. Implementation approach

Three components: GitHub configuration, change processor, optional client-facing form.

**Component A: GitHub configuration.** The operator runs `upriver admin-deploy <slug>` which configures the client's repo:

- Installs the Upriver GitHub App (preferred) or registers a fine-grained PAT scoped to the repo.
- Creates issue templates under `.github/ISSUE_TEMPLATE/`. The primary template is `change-request.yml`. Prompts for: what should change (free text), where on the site (free text with examples), priority (low/medium/high), optional file attachment.
- Creates labels: `change-request` (auto-applied to new issues from template), `in-progress` (Claude bot has started work), `awaiting-assets` (bot needs more info from client), `pending-review` (PR is open, operator review needed), `voice-check-failed` (output didn't pass voice rules; operator review required).
- Registers a webhook to send `issue.opened`, `issue.commented`, and `pull_request.closed` events to the Upriver Inngest endpoint.

**Component B: Change processor.** Runs as an Inngest function on the existing worker infrastructure. The flow:

1. Webhook fires when a new issue is opened with the `change-request` label, when a comment is added to an existing change request issue, or when a PR closes.
2. Inngest function receives the event. For new issues, kicks off the change processing job. For comments on `awaiting-assets` issues, resumes the previously paused job. For closed PRs, ensures the linked issue closes too.
3. Job opens by calling Anthropic's API with the issue body plus voice rules plus a system prompt explaining the codebase structure. Output: structured intent (type of change, target files, content additions, design implications, asset requirements).
4. The bot comments on the issue with the parsed intent for transparency. Comment format:

> Working on this now. Here's what I understand:
> - Type: content addition
> - Target: `src/pages/index.astro`
> - New section: "Fall menu" placed below the hero
> - Photo needed: duck dish (I'll check existing media first)
>
> Estimated complexity: low. I'll open a PR within five minutes.

5. The bot adds the `in-progress` label and removes `change-request`.
6. Headless Claude Code session clones the repo, checks out a branch named `change-request/issue-<num>`, makes the changes, pushes, and opens a PR with `Closes #<issue>` in the body.
7. PR opens. Bot comments on the issue with the PR link and adds `pending-review` label. Operator gets a GitHub notification, plus a Slack notification via the existing operator webhook.
8. Operator reviews in GitHub:
   - **Approve** the PR and merge → Vercel auto-deploys → GitHub closes the issue automatically because of `Closes #N` → bot comments confirmation.
   - **Request changes** with comments on the PR → webhook fires → Inngest re-runs the change processor with the operator's feedback as additional context → Claude Code pushes new commits to the same branch → operator re-reviews.
   - **Close without merging** → bot comments on the issue with the rejection reason and closes it.

**Component C: Client-facing form (optional but recommended).** Most retainer clients (wedding venues, restaurants, CPAs) won't have GitHub accounts. The form is a minimal Next.js single-page app deployed to Vercel that:

- Lives at `<slug>-requests.upriverplatform.vercel.app` or a custom subdomain.
- Optionally PIN-protected (single env var, no database).
- Single textarea plus optional file upload field plus a "where on the site" hint field.
- POSTs to a Vercel serverless function that creates a GitHub issue via the GitHub API on the client's behalf.
- Confirms submission with the issue URL and a friendly "I'll get to this within a day" message.

The form is intentionally minimal because complexity should live in GitHub, not in the form.

**Asset handling.** When the intent parser identifies an asset reference but can't find the asset, the bot adds the `awaiting-assets` label, removes `in-progress`, and comments on the issue:

> I need a photo of the duck dish to complete this. Two options:
> - Upload directly to this issue (drag and drop into a comment).
> - Share a Cloudinary URL or a link to where I can find it.
>
> I'll resume as soon as it's available.

When the client comments with the asset, the webhook fires and the change processor resumes from where it paused.

**Voice enforcement.** The headless Claude Code system prompt at `packages/core/src/admin/prompts/implement-change.ts` includes:
- Voice rules from `voice-rules.json`
- Design system tokens from the client's tailwind.config
- The Upriver banned words list, plus client-specific banned words from voice extract
- Instructions to write tests for new components when applicable
- Instructions to update schema files (F02) when content changes affect schema
- Instructions to bail and add the `voice-check-failed` label if the change would violate voice rules in a way that can't be cleanly resolved

#### 6. Integration with existing pipeline

Register as a stage in `packages/core/src/pipeline/stages.ts` after `launch-checklist`.

`run all` includes `admin-deploy` by default when both `voice/voice-rules.json` and a `--repo` value (sourced from `client-config.yaml`) are present. Without the repo, admin-deploy is skipped with a warning.

The admin app source lives at `packages/admin-template/` as a new monorepo package. Per-client deployments copy and customize from this template.

The dashboard gets a new admin section per-client showing: repo connection status, recent issues with their labels, recent PRs awaiting review (pulled from the GitHub API), pause/resume controls, last activity timestamp. Add at `packages/dashboard/src/pages/clients/[slug]/admin.astro`.

A new top-level dashboard page aggregates pending PRs across all client repos, sorted by oldest-first. The aggregation uses GitHub's search API (`is:pr is:open label:pending-review` across the operator's organization). Add at `packages/dashboard/src/pages/admin-queue.astro`.

The worker infrastructure (Phase 3 Inngest + Fly.io) is required for the headless Claude Code sessions. admin-deploy fails fast if the worker isn't provisioned.

#### 7. Dependencies

New packages:
- `packages/admin-template/`: the Next.js client form template plus the Inngest event handler. Includes shadcn/ui for the form, Resend for confirmation emails, Octokit for GitHub API calls.

New environment variables (operator-level, shared across clients):
- `UPRIVER_GITHUB_APP_ID`: the Upriver GitHub App identifier.
- `UPRIVER_GITHUB_APP_PRIVATE_KEY`: the App's private key.
- `UPRIVER_GITHUB_PAT`: alternative to GitHub App.
- `GITHUB_WEBHOOK_SECRET`: shared secret for webhook signature verification.
- `ADMIN_OPERATOR_EMAIL`: where critical alerts go.
- `ADMIN_OPERATOR_SLACK_WEBHOOK`: Slack webhook for PR-ready and asset-needed notifications.
- `ANTHROPIC_API_KEY`: same key as the rest of the pipeline.
- `RESEND_API_KEY`: shared with the rest of the pipeline.

Per-client environment variables (set on the form's Vercel deployment):
- `FORM_PIN_HASH`: bcrypt hash of the form PIN. Optional.
- `GITHUB_REPO_TARGET`: the `owner/repo` for issue creation.
- `CLIENT_NAME`: for confirmation emails and form branding.

Industry config additions for compliance-sensitive verticals:
```yaml
admin:
  enabled: true
  require_legal_review: false
  auto_close_voice_failures: false
```

#### 8. Acceptance criteria

- Running `upriver admin-deploy audreys --repo=lifeupriver/audreys-site` configures the GitHub repo (issue templates, labels, webhook) within five minutes.
- Optionally running with `--client-form=true` deploys the form to Vercel and the form URL is reachable.
- Submitting a test change request through the form ("add a contact section to the about page") creates a GitHub issue with the `change-request` label within ten seconds.
- Submitting the same request directly through GitHub (skipping the form) produces identical downstream behavior.
- Within thirty seconds of issue creation, the bot comments with parsed intent and applies the `in-progress` label.
- Within five minutes, a PR opens against the repo with `Closes #<issue>` in the body and the `pending-review` label is applied to the issue.
- Operator gets both a GitHub notification and a Slack notification when the PR is ready for review.
- Approving the PR through GitHub merges the branch, Vercel deploys the change, and the issue closes automatically.
- Requesting changes on the PR with operator notes triggers a second Claude Code session that addresses the feedback within five minutes.
- Closing the PR without merging triggers the bot to comment on the issue with the close reason and close the issue.
- An issue that references a missing asset transitions to `awaiting-assets` label and the bot comments asking for the asset.
- Adding the asset (via comment with attachment) resumes the change processor and the flow continues normally.
- A change request whose generated content fails voice rules transitions to `voice-check-failed` label for operator review rather than auto-merging.
- The dashboard's per-client admin panel correctly shows recent issues, pending PRs, and last activity, all pulled from the GitHub API.
- The aggregated queue across multiple test clients correctly lists all pending-review PRs sorted by oldest first.
- Form PIN rotation works: `upriver admin-rotate-pin audreys` updates the form's environment variable on Vercel and old PIN stops working within one minute.
- Pausing the admin (`upriver admin-pause audreys`) stops the change processor from acting on new webhook events but doesn't affect already-open PRs.

---

### F06 — Monitor stage

#### 1. Purpose

Monitor runs weekly against active retainer clients, re-audits a focused subset of the original audit, compares scores to the post-rebuild baseline, and emails the client a one-page delta report. It exists to reduce churn. Retainer clients who see monthly evidence of the work paying off cancel less; retainer clients who hear nothing for three months wonder what they're paying for.

The cost of monitor is intentionally low. It's not a full re-audit. It's a focused snapshot of dimensions that matter for ongoing client relationships: Lighthouse performance scores, key page Core Web Vitals, GSC click and impression trends, schema validity, broken link count, and a small selection of high-impact audit passes (SEO basics, content freshness).

#### 2. Command interface

```
upriver monitor <slug>
```

Flags:
- `--baseline=<qa|previous|original>`: which baseline to compare against. `qa` is the post-rebuild snapshot (default), `previous` is the most recent prior monitor run, `original` is the pre-rebuild audit.
- `--no-email`: produce the report file but don't send.
- `--passes=<comma-separated>`: override the default pass set. Default is `seo,content,links,schema,performance`.
- `--lite`: skip Lighthouse and GSC; runs in 90 seconds against scrape-only data.

Invokable via Inngest schedule: a cron entry in `packages/worker/src/schedules/monitor.ts` runs `upriver monitor` against every client where `client_admins.paused = false` and `monitoring_enabled = true`.

#### 3. Inputs

- `clients/<slug>/audit-package.json` for the original audit baseline.
- `clients/<slug>/site/` for the rebuilt site source.
- `clients/<slug>/qa-summary.json` for the post-rebuild baseline.
- `clients/<slug>/monitoring/<previous-date>.json` if `--baseline=previous`.
- Live data: scrape of the live site (uses Firecrawl, cache-bypassing for these passes), Lighthouse runs against the live URL, GSC API for the past 7 days.

#### 4. Outputs

- `clients/<slug>/monitoring/<YYYY-MM-DD>.json`. Structured snapshot.
- `clients/<slug>/monitoring/<YYYY-MM-DD>-report.html`. The one-page email-ready delta report.
- `clients/<slug>/monitoring/<YYYY-MM-DD>-report.pdf`. PDF version.
- `clients/<slug>/monitoring/trend.json`. Rolling history of all monitor runs for trend visualizations.

#### 5. Implementation approach

The monitor report is one page, one column, designed to be read in 30 seconds on a phone. Structure:

**Header.** Client name, date, and a single status badge: "Improving", "Stable", or "Needs attention". Computed from aggregate score delta since the previous monitor run.

**The one chart.** A small line chart showing the past 12 weeks of overall site score. Render server-side as inline SVG so it works in every email client.

**Three callouts.** The three most consequential changes since the last run, prioritized by impact. Examples: "Page speed improved by 18 points on the homepage." "Three new pages were indexed by Google this week." "Schema markup is now valid on all service pages." Callouts are written in plain language that the client can forward to their team without translation.

**Active issues.** A short list of any P0 or P1 findings that surfaced in this run. Limit to 3; if more, link to the full report. Each issue has a one-sentence description and a status: "I'm fixing this in this week's release" or "We're tracking this; no action needed yet."

**Footer.** A reminder of what's coming next month and a single CTA: "Reply to this email if you want to talk through anything."

Implementation runs in five parallel tasks (Promise.all):
1. Lighthouse against the homepage and three key inner pages.
2. Lite scrape and selected audit passes against the live site.
3. GSC pull for the past 7 days plus the same 7-day window from previous monitor.
4. Schema re-validation against the live pages.
5. Broken link scan.

For email delivery, monitor uses Resend with a per-client send domain when configured. Email template at `packages/core/src/monitoring/templates/delta-email.html`. Subject line format: `Your Upriver site update — week of <date>`. The "from" name is the operator's name, not the company name, because retainer relationships are personal.

The Inngest schedule runs every Monday morning at 8am ET by default. Per-client overrides live in `client_admins.monitor_schedule` (cron expression). Failed runs retry once at 2pm; persistent failures alert the operator via Slack.

#### 6. Integration with existing pipeline

Register as a stage in `packages/core/src/pipeline/stages.ts` though it's not part of the linear pipeline; invoked on schedule, not as part of `run all`.

Monitor reads from existing audit-package.json and qa-summary.json structures, so no schema changes to upstream stages.

A new monitoring panel on the dashboard per-client shows: most recent run status, score trend chart, recent reports, schedule controls. Add at `packages/dashboard/src/pages/clients/[slug]/monitoring.astro`.

The aggregated dashboard view (operator's home page) gets a new widget showing all clients' most recent monitor status, sortable by status badge.

The worker package gets a new schedule registration in `packages/worker/src/schedules/`. Document the dependency: monitor schedules require Phase 3 worker provisioning.

#### 7. Dependencies

New packages:
- `lighthouse` (already a dev dependency for the existing audit, promote to runtime).
- `puppeteer` for headless Chrome runs.
- `@inngest/cron` for schedule registration.

New environment variables:
- `GSC_SERVICE_ACCOUNT_JSON`: already used by init stage; required for monitor's GSC pulls.
- `RESEND_FROM_DOMAIN`: optional per-client override.
- `MONITOR_DEFAULT_CADENCE`: cron expression. Default `0 8 * * MON`.

#### 8. Acceptance criteria

- Running `upriver monitor audreys` against a fresh client produces a complete snapshot and report within 6 minutes.
- The HTML report renders cleanly in Gmail, Outlook web, and Apple Mail.
- The status badge correctly reflects aggregate score delta.
- The 12-week trend chart renders as inline SVG and displays correctly even when fewer than 12 weeks of data exist.
- Email delivery succeeds via Resend and clicking through opens the same report at a public URL.
- The Inngest schedule fires on Monday morning at 8am ET for a test client and produces a complete monitor run.
- The dashboard's monitoring panel shows accurate status and lets the operator manually trigger a run.
- A test client with `monitoring_enabled = false` is correctly skipped by the schedule.
- `--lite` mode completes in under 90 seconds against a 30-page site.

---

### F07 — Followup stage

#### 1. Purpose

Followup runs against former clients six months or more after their engagement ended. It re-runs a focused audit against their live site, compares to the QA baseline from when the original work shipped, and produces two outputs: case study evidence (proof the work I did still pays off, or evidence of where it has degraded) and re-engagement sales material.

The strategic value is twofold. Case studies built from real before-and-six-months-after data are more persuasive than testimonials. Re-engagement is also one of the highest-conversion sales motions available; a former client who saw the original work pay off is far more likely to sign for a refresh or expansion than a cold prospect.

#### 2. Command interface

```
upriver followup <slug>
```

Flags:
- `--mode=<case-study|reengagement|both>`: which output to produce. Default `both`.
- `--since=<iso-date>`: explicitly specify the baseline date.
- `--no-send`: produce documents without sending.
- `--target-recipient=<name,email>`: who the re-engagement doc addresses.

Long-cadence schedule: optional Inngest schedule runs every six months for clients with `followup_enabled = true`. Most operators will want to invoke followup on demand rather than on schedule.

#### 3. Inputs

- `clients/<slug>/audit-package.json` for original baseline.
- `clients/<slug>/qa-summary.json` for post-rebuild baseline.
- `clients/<slug>/client-config.yaml` for client contact info and engagement metadata.
- Optional: any monitor data from `clients/<slug>/monitoring/`.
- Live data: full re-scrape of the current live site, full audit pass at base mode, GSC pull for the last 90 days, Lighthouse runs, schema validation.

#### 4. Outputs

- `clients/<slug>/followups/<YYYY-MM-DD>.json`. Full snapshot for archival and case study source data.
- `clients/<slug>/followups/<YYYY-MM-DD>-case-study.md`. Internal case study draft.
- `clients/<slug>/followups/<YYYY-MM-DD>-reengagement.html`. Polished sales doc for the client.
- `clients/<slug>/followups/<YYYY-MM-DD>-reengagement.pdf`. PDF version.

#### 5. Implementation approach

Structurally similar to monitor but produces deeper outputs. The data collection is the same set of tasks (live scrape, audit, Lighthouse, GSC, schema), expanded to cover full audit base passes rather than the focused subset monitor uses.

**Case study generation.** Reads the snapshot JSON and writes a draft case study using a structured template. The template is at `packages/core/src/followup/templates/case-study.md`. Sections: problem statement (sourced from the original audit's executive summary), approach (sourced from the design brief), metrics with deltas (computed from baseline vs current), placeholder for a client quote.

The case study follows Upriver's content rules: no superlatives, specific numbers always, real tool names, no testimonial-language clichés.

**Re-engagement document generation.** The polished sales doc that gets sent to the client. Voice is warm and professional, written in first person:

- Opening: brief acknowledgment of what's worked and a thank-you. Two short paragraphs.
- What's still working: three to five specific data points showing the original work continues to deliver.
- What has drifted: honest assessment of where the site has degraded since launch (broken links accumulated, content gone stale, schema validation regressed). One paragraph per issue.
- Recommended next steps: three to five specific opportunities. Each is named, scoped (rough hours and cost range), and prioritized.
- Closing: a clear next step. "Reply to this email and I'll send a calendar link" works better than a generic CTA.

Generation runs through Anthropic's API with voice rules from F03 baked into the prompt. If F03 hasn't run for the client, doc generation falls back to Upriver's default voice rules.

#### 6. Integration with existing pipeline

Register as a standalone stage in `packages/core/src/pipeline/stages.ts`. Invoked on demand.

The dashboard gets a new "Past clients" view that lists every slug with a completed engagement, sorted by last-followup-date. Each row has a "Run followup" button. Add at `packages/dashboard/src/pages/past-clients.astro`.

A new dashboard panel on each client page shows followup history, last run, and quick links to download the most recent case study and re-engagement docs.

Followup outputs feed back into the Upriver content pipeline. The case study generator outputs are saved to `clients/<slug>/followups/` but a copy goes to `/case-studies/raw/` in the operator's separate content workspace (path configurable via `UPRIVER_CASE_STUDIES_PATH`).

#### 7. Dependencies

No new packages beyond what monitor and audit already require.

New environment variables:
- `UPRIVER_CASE_STUDIES_PATH`: optional. Filesystem path where case study drafts get copied for the operator's content workflow.

#### 8. Acceptance criteria

- Running `upriver followup audreys` produces both output documents within 12 minutes for a 30-page site.
- The case study draft validates against the case study template structure.
- The re-engagement doc reads in the client's voice when voice-rules.json exists; falls back gracefully when it doesn't.
- Computed deltas in both documents are accurate against the QA baseline.
- The PDF version of the re-engagement doc renders correctly with the operator's branding.
- The dashboard's past-clients view correctly lists all clients with completed engagements.
- Running with `--mode=case-study` produces only the case study output.
- Running with `--mode=reengagement` produces only the re-engagement output.
- A client with `followup_enabled = true` and `engagement_ended_at` more than 180 days ago is correctly picked up by the long-cadence schedule.
- The case study draft, when saved to `UPRIVER_CASE_STUDIES_PATH`, is correctly importable into the Upriver site's content workflow.

---

### F09 — Page and feature gap analysis

#### 1. Purpose

Most small business sites are missing the pages and features that would actually move the needle for their visitors. A wedding venue without a booking inquiry form. A restaurant without an online menu. A CPA firm without a "schedule a consultation" page. The gap analysis identifies what's missing, judges whether adding it would genuinely help users or just bloat the site, and recommends a reorganized information architecture.

This is a strategic deliverable that sells the rebuild scope. The audit shows the client what's broken; the gap analysis shows them what's missing. The combination is far more persuasive than either alone.

#### 2. Command interface

```
upriver gap-analysis <slug>
```

Flags:
- `--depth=<quick|standard|deep>`: how thorough. Quick uses heuristics only. Standard uses heuristics plus competitor comparison. Deep adds Anthropic API analysis of UX flows. Default `standard`.
- `--competitors=<comma-separated-urls>`: explicit competitor URLs for comparison. Default reads from `discovery/competitors.json`.
- `--no-ia`: skip the information architecture recommendations and produce only the missing-features list.

The pass also runs automatically when `upriver audit <slug> --mode=deep` is invoked.

#### 3. Inputs

- `clients/<slug>/pages/<page>.{html,md,json}` from the scrape stage.
- `clients/<slug>/discovery/site-map.json` for the existing IA and link structure.
- `clients/<slug>/discovery/competitors.json` for competitor URL list.
- `clients/<slug>/audit/seo.json` and `clients/<slug>/audit/content.json` for issues already identified.
- `clients/<slug>/client-config.yaml` for industry classification.
- Optional: `clients/<slug>/intake.json` from the interview stage.

#### 4. Outputs

- `clients/<slug>/audit/gaps.json`. Structured findings file with three sections: missing pages, missing features, IA reorganization recommendations.
- `clients/<slug>/gap-recommendations.md`. Client-facing markdown deliverable.
- `clients/<slug>/gap-recommendations.html`. HTML rendered for inclusion in the audit report.
- `clients/<slug>/proposed-sitemap.json`. The recommended IA, expressed as a tree structure with current-vs-proposed mapping.

#### 5. Implementation approach

The gap analysis runs three subroutines: industry baseline check, competitor comparison, UX flow analysis.

**Subroutine A: industry baseline check.** Each industry config defines a baseline set of pages and features that businesses in that vertical typically need. The check compares the client's existing site against this baseline.

Industry config additions:

```yaml
gap_analysis:
  required_pages:
    - slug: about
      reason: "Trust signal; bounces are 40% higher on sites without an About page"
      priority: p0
    - slug: contact
      reason: "Direct conversion path"
      priority: p0
  recommended_pages:
    - slug: faq
      reason: "Reduces inbound 'is X included' questions; improves AEO surfaces"
      priority: p1
  required_features:
    - id: contact_form
      reason: "Direct lead capture without phone friction"
      priority: p0
    - id: phone_number_visible
      reason: "Many users prefer phone for first contact"
      priority: p0
  recommended_features:
    - id: booking_calendar
      reason: "Reduces booking friction; eliminates email back-and-forth"
      priority: p1
      condition: "industry sells time-bounded services or appointments"
    - id: pricing_tool
      reason: "Pre-qualifies leads"
      priority: p1
      condition: "industry has standardized pricing or pricing tiers"
```

Industry-specific examples:

**Wedding venues**: required pages include "Plan Your Wedding" (or equivalent inquiry funnel), galleries by event type, pricing or packages page. Required features include inquiry form with date and guest count fields, calendar showing availability windows, preferred vendor list. Recommended: video tour, virtual walkthrough, sample timeline downloads.

**Restaurants**: required pages include menu (always current, never PDF), reservations, hours and location with map. Required features include reservation booking (OpenTable or Resy integration), menu organized by service. Recommended: online ordering, gift card purchase, private events page.

**CPA firms and accounting**: required pages include services with specific tax/bookkeeping/advisory breakdown, team page with credentials, contact with consultation booking. Required features include secure document upload portal mention, schedule a consultation tool. Recommended: client portal login link, tax deadline calendar, blog or resources section.

**Wedding photographers**: required pages include investment/pricing, galleries by venue or style, about. Required features include inquiry form with wedding date field, preferred vendor mentions, sample gallery walkthroughs. Recommended: vendor directory, blog with venue guides, client testimonials with full reviews.

**Subroutine B: competitor comparison.** For each discovered competitor (or industry-default competitors when none have been discovered), run the same baseline check. The comparison flags features the competitors offer that aren't on the client's site, weighted by how many competitors offer them. A feature offered by 4 of 5 competitors is a strong gap signal.

Competitor scrape output (lighter than full client scrape) goes to `clients/<slug>/competitors/<competitor-slug>/`.

For UX-quality judgment, the comparison considers not just whether a feature exists but how well it's implemented. Anthropic's API is called with a prompt that evaluates each existing feature for quality and discoverability.

**Subroutine C: UX flow analysis.** For deep mode only, run an Anthropic API analysis of the primary user flows for the industry. The prompt receives: the site's discovered structure, the industry config's expected flows, and the scraped page content. Output: a flow-by-flow assessment with specific friction points and recommended fixes.

For a wedding venue, the primary flows are: "couple researching venues", "couple comparing pricing", "couple ready to inquire about a date", "wedding planner researching for a client". The analysis traces each flow through the actual site and identifies where it breaks.

**Information architecture reorganization.** The proposed sitemap lives in `proposed-sitemap.json`:

```json
{
  "proposed": {
    "/": {"name": "Home", "section": "primary"},
    "/weddings": {
      "name": "Weddings",
      "section": "primary",
      "children": {
        "/weddings/galleries": {"name": "Galleries"},
        "/weddings/pricing": {"name": "Investment"},
        "/weddings/inquire": {"name": "Plan Your Wedding"}
      }
    }
  },
  "current_to_proposed": {
    "/our-venue": "/about",
    "/photo-gallery": "/weddings/galleries",
    "/contact-us": "/contact"
  },
  "rationale": [
    "The current site has weddings buried as a sub-item under 'events.' Wedding inquiries are 80% of bookings; weddings should be a primary nav item.",
    "Three pages currently exist for pricing (rates, investment, packages). Consolidating into one /weddings/pricing page reduces decision friction."
  ]
}
```

The `current_to_proposed` map is used by the rebuild stages to set up redirects from old URLs to new locations, preserving SEO equity.

#### 6. Integration with existing pipeline

Register as a new audit pass in `packages/core/src/audit/passes/gaps.ts`. Add to the pass registry. Tag as `mode: 'deep'`.

Add `gap-analysis` as a standalone command in `packages/cli/src/commands/gap-analysis.ts`.

Update `packages/core/src/pipeline/stages.ts` to include `gap-analysis` as a stage between `audit` and `synthesize`.

The `design-brief` stage is updated to incorporate gap recommendations and the proposed sitemap.

The `scaffold` stage reads `proposed-sitemap.json` (when present) instead of just the discovered URL set.

The `clone` stage gets a flag `--respect-proposed-sitemap` (default true) that maps old pages to new locations during the clone pass.

The `finalize` stage adds redirect generation. For every entry in `current_to_proposed`, finalize writes a redirect rule to the rebuilt site's hosting config (Vercel `vercel.json` or Astro config).

The `improve` stage reads gap recommendations and optionally generates net-new pages or features.

#### 7. Dependencies

No new packages. No new environment variables.

A new feature catalog at `packages/core/src/gaps/features.ts` defines every feature the gap analysis can recommend:

```ts
export const features = {
  booking_calendar: {
    detection: ['cal.com', 'calendly', 'savvycal', 'iframe[src*="booking"]'],
    complexity: 'low',
    rationale_template: 'Reduces booking friction. Replaces email back-and-forth with self-service scheduling.',
    implementations: ['Cal.com', 'Calendly', 'SavvyCal', 'custom React component'],
  },
  pricing_tool: { /* ... */ },
  video_gallery: { /* ... */ },
  testimonial_carousel: { /* ... */ },
  contact_form: { /* ... */ },
  hours_widget: { /* ... */ },
  map_embed: { /* ... */ },
};
```

#### 8. Acceptance criteria

- Running `upriver gap-analysis audreys` produces all four output files within six minutes at standard depth on a 30-page site.
- The findings in `gaps.json` validate against the existing audit finding schema.
- The recommendations doc reads as strategic prose, not a feature checklist.
- The proposed sitemap is structurally valid JSON and the `current_to_proposed` map is complete.
- The redirect rules generated by the `finalize` stage cover every URL change in `current_to_proposed`.
- A test run against a wedding venue site correctly identifies missing booking calendar, missing pricing page, and missing inquiry form.
- A test run against a CPA firm site correctly identifies missing consultation booking and missing services breakdown.
- The competitor comparison correctly flags features that 3+ competitors have but the client doesn't.
- IA reorganization recommendations include at least three rationale entries for any non-trivial restructure.
- The design brief generated after gap analysis includes both the missing-features list and the proposed IA.
- Token cost stays under $4 at standard depth, under $8 at deep depth, for a 30-page site with three competitors.

---

### F10 — Blog topic generation

#### 1. Purpose

The blog topics feature generates a list of 25 blog post topics the client should write, ranked by SEO opportunity and relevance to their business. It pulls keyword data from Ahrefs, identifies gaps where the client could rank for valuable terms with reasonable effort, and produces a deliverable that includes target keywords, search volume, ranking difficulty, search intent, suggested angles, and an implementation note for each topic.

This is a sellable standalone deliverable and an upsell from the rebuild engagement. As a standalone product, $750. As a rebuild upsell, it's the natural next step: "Now that the site is rebuilt and indexed properly, here are the 25 articles that will drive search traffic over the next year."

For retainer clients, the blog topics feature also feeds the natural language admin (F05). When a client submits an issue saying "write the next blog post," the admin pulls from this list.

#### 2. Command interface

```
upriver blog-topics <slug>
```

Flags:
- `--count=<n>`: number of topics to generate. Default 25. Cap at 100.
- `--difficulty=<easy|medium|hard|all>`: filter by Ahrefs keyword difficulty. Default `medium` (KD 0-30).
- `--intent=<comma-separated>`: filter by search intent. Options: `informational, navigational, commercial, transactional`.
- `--seed-keywords=<comma-separated>`: explicit seed keywords.
- `--no-competitor-mining`: skip the competitor content gap analysis.

#### 3. Inputs

- `clients/<slug>/audit-package.json` for industry classification and existing keyword profile.
- `clients/<slug>/discovery/competitors.json` for competitor URLs.
- `clients/<slug>/client-config.yaml` for business name, location, services, operator-supplied seed topics.
- `clients/<slug>/voice/voice-rules.json` from F03 for voice-matched topic angles.
- Optional: `clients/<slug>/intake.json` from interview.
- Live data: Ahrefs API for keyword data, competitor content gaps, SERP analysis. Uses the existing Ahrefs MCP integration.

#### 4. Outputs

- `clients/<slug>/blog-topics/topics.json`. Structured list of 25 topics. Each topic includes: title, target primary keyword, secondary keywords, search volume, keyword difficulty, search intent, suggested angle, recommended word count, internal linking opportunities, confidence score.
- `clients/<slug>/blog-topics/blog-roadmap.md`. Client-facing markdown deliverable.
- `clients/<slug>/blog-topics/blog-roadmap.html`. HTML rendered for inclusion in the audit report.
- `clients/<slug>/blog-topics/topic-briefs/<slug>.md` (one per topic). Detailed brief.

#### 5. Implementation approach

Five stages: keyword harvest, competitor mining, opportunity scoring, topic synthesis, brief generation.

**Stage 1: keyword harvest.** Pull from Ahrefs using the existing MCP integration:
1. Existing keywords: keywords the client already ranks for, sorted by position improvement opportunity (positions 5-30 are the sweet spot).
2. Branded and topical seed keywords: based on industry config and client-config services.
3. Local modifiers: location-modified versions of seed keywords.

The harvest produces a deduplicated keyword pool of 200-500 candidates.

**Stage 2: competitor mining.** For each competitor (default 3-5 from `discovery/competitors.json`), pull their top organic pages from Ahrefs. For each top competitor page, identify the primary keyword and check whether the client's site ranks for it. Pages where competitors rank in top 10 and the client doesn't rank at all are content gap opportunities.

**Stage 3: opportunity scoring.** Score each candidate keyword on five dimensions:
1. Achievability: keyword difficulty vs. the client's Domain Rating.
2. Relevance: how well the keyword matches the client's services and audience.
3. Traffic potential: Ahrefs' traffic potential metric.
4. Conversion proximity: how close the keyword is to a transaction.
5. Topic uniqueness: penalize keywords that overlap heavily with existing client pages or with already-selected candidates.

Each candidate gets a composite score 0-100. Sort descending; take the top 25. Apply diversity rules: no more than 3 topics in any single sub-cluster, ensure mix of intents (at least 5 commercial/transactional in any 25-topic list).

**Stage 4: topic synthesis.** For each selected keyword, generate a topic title and angle. Anthropic API call with: the keyword, top-ranking competitor titles, the client's voice rules, the client's services and location.

Output per topic:
- Title: SEO-optimized but not keyword-stuffed.
- Angle: the specific take or framing that differentiates from existing top-ranking content.
- Recommended word count.
- Internal linking opportunities.
- Schema markup needed.

**Stage 5: brief generation.** For each topic, generate a writer's brief at `topic-briefs/<topic-slug>.md`. Includes:
- Topic title and target keyword.
- Search intent and what the searcher actually wants.
- Recommended structure (H2/H3 outline with brief notes).
- Key points to cover (extracted from top 3 ranking competitors but rewritten as guidance).
- Sources to cite.
- SEO requirements (target word count, primary keyword density, secondary keywords, internal links, schema).
- Voice notes from voice-rules.json.

The roadmap document structure:
- Opening: what the analysis found about the client's content position relative to competitors.
- Recommended cadence: how often to publish, why, and what budget that implies.
- The 25 topics, organized into 4-5 clusters.
- Closing: how to measure success and what to expect over a 12-month horizon.

The roadmap is approximately 2,500-3,500 words.

#### 6. Integration with existing pipeline

Register as a stage in `packages/core/src/pipeline/stages.ts` after `synthesize` and before `design-brief`.

`run all` includes blog-topics by default unless `--skip-blog-topics` is passed.

The `improve` stage reads `topics.json` and can optionally generate the first three blog posts from their briefs as part of the rebuild. Gated behind `--include-first-posts`.

The natural language admin (F05) reads `topics.json` when an issue says "write the next blog post." The admin's intent parser recognizes blog post requests, looks up the next unpublished topic from the roadmap, and uses the corresponding brief as the system prompt for content generation. The PR includes both the post and a note in `topics.json` marking the topic as published.

The dashboard gets a blog topics panel per-client. Add at `packages/dashboard/src/pages/clients/[slug]/blog-topics.astro`.

#### 7. Dependencies

No new packages. Uses existing Ahrefs MCP integration and Anthropic SDK.

New environment variables:
- `AHREFS_DEFAULT_DR_THRESHOLD`: optional. Sets the default keyword difficulty filter relative to client DR.

Industry config additions:
```yaml
blog_topics:
  seed_keywords:
    - "wedding venue"
    - "wedding photography"
    - "outdoor wedding"
  topic_clusters:
    - name: "Planning resources"
      weight: 0.35
    - name: "Vendor comparisons"
      weight: 0.25
    - name: "Real wedding inspiration"
      weight: 0.25
    - name: "Logistics and FAQs"
      weight: 0.15
  authoritative_sources:
    - "The Knot"
    - "WeddingWire"
    - "Brides"
  recommended_cadence: "2 posts per month"
```

#### 8. Acceptance criteria

- Running `upriver blog-topics audreys` produces all four output files within eight minutes at default settings.
- Generated topics target keywords with achievable KD relative to the client's DR.
- Topics are diverse: no more than 3 topics in any single sub-cluster, intent mix includes at least 5 commercial or transactional out of 25.
- The roadmap doc reads as strategic prose with the client's voice.
- Each topic brief is detailed enough to draft a post without additional research.
- Competitor mining correctly identifies content gap opportunities for at least 5 of the 25 topics.
- A test run against a wedding venue produces topics that include local intent, service-specific, and seasonal variations.
- A test run against a CPA firm produces topics that include service-specific, comparison, and local variations.
- The natural language admin (F05) successfully reads `topics.json`, picks the next unpublished topic, and generates a post draft using the corresponding brief.
- Token cost stays under $6 for a 25-topic generation; Ahrefs API call cost stays within typical plan limits.

---

### F11 — Custom admin tools suggestion

#### 1. Purpose

Every business runs on a few specific operational workflows that are unique to them. A preschool builds curriculum, schedules teachers, and tracks parent communications. A restaurant develops recipes, manages prep schedules, and rotates menus by season. The custom admin tools feature analyzes the client's business and proposes three to five bespoke backend tools that would replace their current spreadsheet-and-email workflow.

This is the highest-margin upsell in the suite. Generic feature additions are commodities. A custom curriculum builder for a Hudson Valley preschool isn't a commodity. It's a software product they can't get from anyone else and it justifies $5,000 to $15,000 in development work per tool.

#### 2. Command interface

```
upriver custom-tools <slug>
```

Flags:
- `--count=<n>`: number of tool concepts. Default 5. Cap at 10.
- `--depth=<standard|deep>`: standard generates from industry config plus client signals. Deep adds Anthropic API analysis of the client's full content. Default `standard`.
- `--operations-input=<path>`: optional path to operator-supplied observations from a discovery call.
- `--budget-tier=<low|medium|high>`: filters concepts by implementation effort. Low excludes anything over 40 hours; medium under 120 hours; high includes all.

The command is opt-in via `--include-custom-tools` in `run all`.

#### 3. Inputs

- `clients/<slug>/audit-package.json` for industry classification and operational signals.
- `clients/<slug>/pages/<page>.{html,md,json}` from the scrape stage.
- `clients/<slug>/client-config.yaml`.
- `clients/<slug>/audit/gaps.json` from F09.
- Optional: `clients/<slug>/intake.json`, operations-input file.

#### 4. Outputs

- `clients/<slug>/custom-tools/concepts.json`. Structured proposals.
- `clients/<slug>/custom-tools/proposal.md`. Client-facing markdown deliverable.
- `clients/<slug>/custom-tools/proposal.html`. HTML.
- `clients/<slug>/custom-tools/sales-talking-points.md`. Operator-facing internal doc.

#### 5. Implementation approach

Four stages: operational signal extraction, concept generation, feasibility scoring, proposal synthesis.

**Stage 1: operational signal extraction.** Reads scraped pages, audit findings, and any optional intake data. Anthropic API call with a structured prompt that asks: what does this business do operationally that they're probably handling with spreadsheets, email threads, or paper? What do they reference on their website that implies a process happening behind the scenes?

Examples:
- A preschool mentioning "weekly curriculum themes" implies a curriculum planning workflow.
- A restaurant with seasonal menus implies recipe development and seasonal menu rotation processes.
- A CPA firm referencing "tax deadlines" and "client document collection" implies deadline tracking and secure document workflows.
- A wedding venue listing "preferred vendors" implies vendor relationship management.

Output: structured list of operational signals at `clients/<slug>/custom-tools/signals.json`.

**Stage 2: concept generation.** For each high-confidence signal, generate one or more tool concepts using an industry-aware prompt template combined with the signals.

Industry config additions:
```yaml
custom_tools:
  common_workflows:
    - id: scheduling
      keywords: ["schedule", "calendar", "availability", "appointments"]
    - id: content_planning
      keywords: ["curriculum", "menu", "calendar", "themes"]
  example_tools:
    - name: "Curriculum builder"
      problem: "Teachers spend 4-6 hours per week building lesson plans from scratch"
      industry_specific: true
      complexity: "medium"
      effort_hours_min: 40
      effort_hours_max: 80
```

Industry-specific examples:

**Preschools and daycares**: curriculum builder (themes by week, age group templates, NAEYC alignment), teacher schedule manager (shifts, ratios, sub coverage), parent communication portal (daily reports, photo sharing, messaging), enrollment pipeline tracker, allergy and medication tracker, tuition autopay integration, CACFP meal compliance tracker.

**Restaurants**: recipe development system (with cost per plate, allergens, prep time), seasonal menu builder (rotates by season with ingredient availability), prep schedule generator (from reservations and walk-in averages), inventory threshold tracker, staff meal planner, private events booking and quote builder, gift card balance manager.

**CPA firms**: tax deadline tracker (per client, per filing type), document collection portal (with reminders and status), engagement letter generator (per service type), client communication log, year-end planning workflow, billable hours calculator with non-billable visibility, advisory meeting prep doc generator.

**Wedding venues**: inquiry pipeline manager (with date conflict detection), preferred vendor relationship tracker, package builder (mix-and-match items with auto-pricing), couple portal (timeline, vendor coordination, payment schedule), seasonal pricing rules engine, year-over-year capacity reports, vendor commission tracker.

**Wedding photographers**: shoot scheduling with second-photographer coordination, gallery delivery tracker (per client status), vendor cross-promotion log, year-over-year venue analytics, sample gallery generator from past work, contract generator with line-item customization, tax-ready income reporter.

The concept generator combines extracted signals with industry config examples. Generation uses Anthropic API with a prompt that requires specificity: vague concepts ("a CRM") get rejected and regenerated as specific tools ("a wedding inquiry pipeline that flags date conflicts against the existing booking calendar and generates personalized response emails using the client's voice").

**Stage 3: feasibility scoring.** Score each concept on five dimensions:
1. Operational impact: how much time or friction it would remove.
2. Implementation complexity: technical difficulty.
3. Integration burden: how many third-party APIs the tool would need.
4. Sales narrative strength: how easy it is to explain the value.
5. Reusability: whether the tool concept could be templated and resold to other clients in the same industry.

Composite score 0-100 per concept.

**Stage 4: proposal synthesis.** For each selected concept, generate a full proposal:
- Name: short, specific, no jargon.
- The problem: two to three sentences in concrete terms. Names hours, frequencies, current workarounds.
- What it would do: bulleted feature list, specific. Five to eight bullets.
- What it integrates with: named tools, not categories.
- Technical sketch: one paragraph describing architecture.
- Effort estimate: hour range with confidence interval.
- Pricing: dollar range based on operator's hourly rate plus margin.
- Prerequisites: what the client needs in place before this tool can be built.
- Sales angle: one paragraph the operator can use as the opening of a pitch.

The client-facing proposal doc reads as strategic recommendations, not a feature checklist.

The sales-talking-points.md is operator-only. Per concept: questions to ask in a discovery call, objections most likely to come up and how to address them, specific stories or analogies, trade-offs the client should understand.

#### 6. Integration with existing pipeline

Register as a stage in `packages/core/src/pipeline/stages.ts` after `gap-analysis` and before `design-brief`.

`run all` does not include `custom-tools` by default. Opt-in via `--include-custom-tools`.

The natural language admin (F05) reads `concepts.json` when issues reference operational pain points.

The dashboard gets a custom tools panel per-client showing the proposed concepts, their build status (proposed, approved, in-progress, shipped), and quick links. Add at `packages/dashboard/src/pages/clients/[slug]/custom-tools.astro`.

The followup stage (F07) reads `concepts.json` when generating re-engagement docs. Tools that were proposed but not built become natural re-engagement angles.

#### 7. Dependencies

No new packages. No new environment variables.

A new tool template catalog at `packages/core/src/custom-tools/templates/` stores reusable tool concept templates organized by industry:

```
packages/core/src/custom-tools/templates/
  preschool/
    curriculum-builder.yaml
    parent-portal.yaml
    teacher-scheduler.yaml
  restaurant/
    recipe-development.yaml
    prep-scheduler.yaml
  cpa/
    tax-deadline-tracker.yaml
    document-collection-portal.yaml
```

When a tool is built for one client, the operator can save it back to the catalog as a template. Future clients in the same industry get the templated version surfaced as a high-confidence concept with discounted pricing.

#### 8. Acceptance criteria

- Running `upriver custom-tools audreys` produces all four output files within seven minutes at standard depth.
- Generated concepts are specific to the client's industry and operational signals.
- Concepts pass the specificity test: vague output is regenerated as specific output.
- Effort estimates are reasonable: low-complexity tools 20-50 hours, medium 50-120, high 120-300.
- The client-facing proposal reads as strategic prose, not a feature list.
- Sales talking points are detailed enough to use directly in a sales call.
- A test run against a preschool fixture produces concepts including curriculum, scheduling, or parent communication tools.
- A test run against a restaurant fixture produces concepts including recipe development, prep scheduling, or seasonal menu tools.
- A test run against a CPA fixture produces concepts including deadline tracking, document collection, or engagement workflow tools.
- The natural language admin (F05) successfully recognizes operational pain in client issues and references the appropriate concept.
- Tools saved to the catalog are correctly surfaced as high-confidence concepts for future clients in the same industry.
- Token cost stays under $5 at standard depth, under $10 at deep depth.

---

### F12 — Video content suggestions audit

#### 1. Purpose

Video on a small business website is the single highest-impact content type that almost no small business has. The audit looks at every page on the client's site and answers a specific question: "what video would belong here, what would it accomplish, and what would it cost to make?" Output is a page-by-page video plan plus a strategic narrative explaining why video matters and which pieces would move the needle first.

This is the audit deliverable that sells the photography and videography work. Most clients understand intellectually that video matters but can't picture what would actually go on their site. A page-by-page plan makes the work concrete.

The feature is core to Upriver's positioning. The operator shows up with a Sony FX3, can shoot the proposed video the next week, and edits the rebuild and the video work together.

#### 2. Command interface

```
upriver video-audit <slug>
```

Flags:
- `--depth=<standard|deep>`: standard uses heuristics plus industry config. Deep adds Anthropic API analysis. Default `standard`.
- `--count=<n>`: target number of total video pieces. Default 8.
- `--budget-tier=<starter|professional|premium>`: filters by production complexity.
- `--include-existing`: include analysis of any existing video on the client's site.

The pass also runs automatically when `upriver audit <slug> --mode=deep` is invoked.

#### 3. Inputs

- `clients/<slug>/pages/<page>.{html,md,json}` from the scrape stage.
- `clients/<slug>/audit/media.json` from F01.
- `clients/<slug>/audit-package.json` for industry classification.
- `clients/<slug>/client-config.yaml`.
- `clients/<slug>/audit/gaps.json` from F09. New pages proposed by gap analysis are also evaluated for video opportunities.
- Optional: `clients/<slug>/voice/voice-rules.json` for voice-matched script suggestions.

#### 4. Outputs

- `clients/<slug>/video-audit/plan.json`. Structured page-by-page video plan.
- `clients/<slug>/video-audit/video-plan.md`. Client-facing markdown deliverable.
- `clients/<slug>/video-audit/video-plan.html`. HTML rendered for inclusion in the audit report.
- `clients/<slug>/video-audit/shot-lists/<video-slug>.md` (one per proposed video). Detailed shot list and script outline.
- `clients/<slug>/video-audit/production-budget.md`. Operator-facing internal doc.

#### 5. Implementation approach

Four stages: video type identification, page-by-page mapping, prioritization, shot list generation.

**Stage 1: video type catalog.** The audit recommends from a catalog of ten video types, each appropriate to specific page contexts. The catalog lives at `packages/core/src/video-audit/types.ts`:

**Owner introduction** (1-2 minutes, low-medium production). The owner speaking to camera about who they are, why they started the business, what makes their approach different. Goes on About pages, Services pages, sometimes Home pages for service businesses where the owner is the brand.

**Customer reviews and testimonials** (30-90 seconds each, low production). Real clients on camera describing their experience. The most valuable conversion content for high-consideration purchases.

**Drone overview** (45-90 seconds, medium production). Aerial footage of the property, location, or surroundings. Ideal for venues, hospitality, real estate, outdoor experiences.

**Service explainer** (1-3 minutes, medium production). What happens when you work with us. The process from inquiry to delivery, condensed.

**Behind-the-scenes documentary short** (2-4 minutes, medium-high production). The day-to-day of the business.

**Brand film** (2-5 minutes, high production). The atmospheric, emotional anchor video for the business. Often a Home page hero. Less about explaining what they do and more about communicating who they are.

**FAQ video answers** (30-60 seconds each, low production). Owner or team member answering individual common questions on camera. More personal and trustable than text FAQs.

**Process or how-to** (90 seconds to 4 minutes, low-medium production). For service businesses where part of the value is education.

**Product or service detail** (45-90 seconds each, low-medium production). Short videos of specific offerings.

**Real moments compilation** (60-90 seconds, low production from existing footage). Short, fast-cut compilation of authentic moments. Often the easiest video to start with.

Each video type in the catalog includes typical length range, production complexity tier, required equipment, capture time estimate, post-production time estimate, cost range, page contexts it suits, audience segment.

**Stage 2: page-by-page mapping.** For every page (existing plus proposed by gap analysis), determine what video would belong there. The mapping logic considers page role, page audience, existing media, industry context, and conversion proximity.

The mapping produces 1-3 video suggestions per page. High-priority pages (Home, primary services) get multiple options ranked by impact.

For deep mode, an Anthropic API call refines per-page suggestions by reading the actual page content and reasoning about what video would best serve that specific page.

**Stage 3: prioritization.** Take all per-page video suggestions and prioritize them into a coherent content plan. The total plan size is the `--count` value. Prioritization rules:

1. Foundation first: every business plan should include the brand-defining anchor videos (owner introduction, real moments compilation, customer testimonials).
2. Conversion proximity: prioritize videos on conversion-proximate pages.
3. Production efficiency: cluster videos that can be captured in a single shoot day.
4. Industry pattern matching: every industry has 2-3 video types that disproportionately convert.
5. Budget tier filtering: respects the `--budget-tier` flag.

Output: prioritized plan with explicit phase ordering. Phase 1 is "shoot first" videos that should ship with or shortly after the rebuild. Phase 2 is "shoot in months 2-3." Phase 3 is "longer-term."

**Stage 4: shot list generation.** For each video, generate a shot list at `shot-lists/<video-slug>.md`. Detailed enough to use as a production document on shoot day:
- Concept summary: one paragraph describing the video's purpose and feel.
- Run-of-show: the structure from open to close, with approximate timing per beat.
- Talking head outline (when applicable): questions or prompts for the on-camera subject. Voice-matched when voice-rules.json is available.
- B-roll requirements: specific shots needed, organized by location and time of day.
- Equipment list: cameras, lenses, drone (if applicable), audio, lighting, gimbal.
- Locations: every location the shoot needs to access, with notes on permissions.
- Subject coordination: who needs to be on camera, how long their commitment is, what they should wear.
- Music direction: type of music, pacing, where to source (Musicbed for most projects).
- Post-production notes: cuts, color, graphics, captions for accessibility.

For shot lists involving real customers (testimonials), include operator-facing recruitment guidance.

The voice-matched script outlines pull from voice-rules.json when present. The owner introduction's outline reads in the same voice the owner uses on the website.

**Production budget output.** The production-budget.md is operator-only. For each proposed video:
- Capture time estimate in hours.
- Post-production time estimate in hours.
- Total billable hours.
- Recommended pricing.
- Equipment line items.
- Music licensing cost.
- Travel or external expenses.
- Total project cost range.

#### 6. Integration with existing pipeline

Register as a new audit pass in `packages/core/src/audit/passes/video.ts`. Add to the pass registry. Tag as `mode: 'deep'`.

Add `video-audit` as a standalone command in `packages/cli/src/commands/video-audit.ts`.

Update `packages/core/src/pipeline/stages.ts` to include `video-audit` as a stage between `audit-media` (F01) and `synthesize`.

The `synthesize` stage incorporates video plan findings into the executive summary.

The `design-brief` stage incorporates the video plan into a content strategy section, especially Phase 1 priority videos that should ship with the rebuild.

The `improve` stage doesn't generate video itself but reads the plan to leave space on pages where video is recommended. A page slated for an owner introduction gets a video player component placeholder so the rebuild is video-ready when actual footage arrives.

The natural language admin (F05) reads `plan.json` when issues request adding video to specific pages.

The dashboard gets a video plan panel per-client showing the prioritized plan, production status per video (proposed, scheduled, captured, edited, delivered), and quick links to shot lists. Add at `packages/dashboard/src/pages/clients/[slug]/video-plan.astro`.

#### 7. Dependencies

No new packages.

For accurate cost estimates:
- `client-config.yaml` operator section: hourly rate for video production work.
- Env var `OPERATOR_VIDEO_DAY_RATE`: optional override for full-day shoot pricing.

Industry config additions:
```yaml
video_audit:
  recommended_video_types:
    - id: brand_film
      weight: 0.25
      page_contexts: ["home", "about"]
    - id: drone_overview
      weight: 0.20
      page_contexts: ["home", "location"]
    - id: testimonials
      weight: 0.20
      page_contexts: ["reviews", "service_detail"]
    - id: real_moments
      weight: 0.15
      page_contexts: ["home", "galleries"]
    - id: service_detail
      weight: 0.20
      page_contexts: ["services", "service_detail"]
  typical_first_phase_count: 3
  typical_total_plan_count: 8
```

#### 8. Acceptance criteria

- Running `upriver video-audit audreys` produces all five outputs within six minutes at standard depth.
- The plan covers every existing page plus pages proposed by gap analysis, with at least one video suggestion per page.
- The prioritized plan honors `--count` and `--budget-tier` flags.
- Phase 1 priority videos cluster into single-shoot-day groupings where possible.
- Each shot list is detailed enough to use as a production document without significant rewriting.
- Voice-matched script outlines pull from voice-rules.json correctly when present.
- A test run against a wedding venue produces a plan that includes brand film, drone overview, real moments compilation, and at least two service-specific videos.
- A test run against a restaurant produces a plan that includes owner introduction, kitchen/prep behind-the-scenes, and dish-focused service detail videos.
- A test run against a CPA firm produces a plan that includes owner introduction, FAQ video answers, and process explainer.
- Production budget estimates align with realistic Upriver production rates: a single-day shoot with 1-2 videos comes in at $1,500-$3,500; a brand film with drone comes in at $3,500-$7,000.
- The natural language admin (F05) correctly references proposed videos from the plan when handling video-related issues.
- Token cost stays under $4 at standard depth, under $8 at deep depth.

---

## Part 4: Cross-Cutting Implementation Concerns

### 4.1 Files modified across multiple features

These files in the existing repo will be touched by this feature suite. Read each before modifying to understand current structure.

**Critical files (touched by most features):**

- `packages/core/src/pipeline/stages.ts`. New stage registrations for: voice-extract, audit-media, schema-build, gap-analysis, video-audit, blog-topics, prototype-app, monitor, followup, custom-tools, admin-deploy. The order of stages in this file matters; refer to each individual feature's "Integration with existing pipeline" section for correct positions.

- `packages/cli/src/commands/`. New command files: `audit-media.ts`, `schema-build.ts`, `voice-extract.ts`, `gap-analysis.ts`, `video-audit.ts`, `blog-topics.ts`, `prototype-app.ts`, `custom-tools.ts`, `admin-deploy.ts`, `admin-rotate-pin.ts`, `admin-pause.ts`, `admin-status.ts`, `admin-changes.ts`, `monitor.ts`, `followup.ts`. Each follows the existing oclif command pattern.

- `packages/core/src/audit/passes/`. New audit passes: `media.ts`, `gaps.ts`, `video.ts`. Add to registry in `packages/core/src/audit/registry.ts`.

- `packages/dashboard/src/pages/clients/[slug]/`. New client subpages: `monitoring.astro`, `prototype.astro`, `admin.astro`, `voice.astro`, `schema.astro`, `gaps.astro`, `blog-topics.astro`, `custom-tools.astro`, `video-plan.astro`. Each follows the existing client subpage pattern.

- `packages/dashboard/src/pages/`. New top-level pages: `past-clients.astro`, `admin-queue.astro`. The existing operator dashboard home page gets a new monitor status widget.

**Files modified to support specific features:**

- `packages/core/src/improve/runner.ts`. Updated to call schema-build as a sub-task, to read voice-rules.json when generating content, to optionally generate net-new pages from gap analysis recommendations, to generate first blog posts from topic briefs, and to leave video player placeholders on pages slated for video.

- `packages/core/src/scaffold/runner.ts`. Updated to read `proposed-sitemap.json` from gap analysis (when present) and seed the rebuilt project's page list from the proposed IA rather than the discovered URL set.

- `packages/core/src/clone/runner.ts`. Updated to support `--respect-proposed-sitemap` flag for mapping old pages to new locations during clone.

- `packages/core/src/finalize/runner.ts`. Updated to read `current_to_proposed` map from gap analysis and generate redirect rules in the rebuilt site's hosting config.

- `packages/core/src/design-brief/generator.ts`. Updated to incorporate gap analysis findings, proposed IA, blog topic roadmap, video plan, and custom admin tool concepts into the brief.

- `packages/core/src/industry/configs/*.yaml`. Each industry config gets new sections for media expectations, schema preferences, prototype defaults, admin compliance requirements, gap analysis baselines, blog topic seeds and clusters, custom tool common workflows and example tools, and video audit recommended types per page context.

- `packages/worker/src/schedules/`. New schedule registrations: `monitor.ts`, `followup.ts`. Document worker provisioning requirement.

- `packages/core/src/reports/templates/audit-report.html`. New optional sections for media inventory, mobile prototype previews, gap recommendations, blog roadmap, custom tool proposals, and video plan.

- `packages/core/src/gaps/features.ts`. New file: feature catalog defining every feature gap analysis can recommend.

- `packages/core/src/video-audit/types.ts`. New file: video type catalog defining every video type the video audit can recommend.

- `packages/core/src/custom-tools/templates/`. New directory: human-edited tool concept templates organized by industry. Reusable across clients.

### 4.2 New monorepo packages

This suite adds three new packages:

1. **`packages/app-prototype-template/`** (Phase 2, F04). The Expo template that gets copied per-client when `prototype-app` runs. Contains React Native screens, NativeWind theme, navigation, theme provider.

2. **`packages/admin-template/`** (Phase 3, F05). The Next.js client form template plus the Inngest event handler. Smaller than originally specced because GitHub Issues replaces what would have been a custom approval queue, change history view, and database. Contains the optional client-facing form, the GitHub App configuration helpers, and the webhook event handlers.

3. **`packages/voice/`** (optional split, Phase 1, F03). Voice extract logic could live in `packages/core/src/voice/` instead. Make the call based on whether voice rules end up reused outside the CLI.

### 4.3 Environment variables

Document all new environment variables in `.env.example` as part of each feature's implementation. Aggregate list:

```
# F01 Media audit
TINEYE_API_KEY=
GOOGLE_VISION_API_KEY=

# F02 Schema build
GOOGLE_GEOCODING_API_KEY=

# F04 iOS prototype
EXPO_TOKEN=

# F06 Monitor
MONITOR_DEFAULT_CADENCE="0 8 * * MON"
RESEND_FROM_DOMAIN=

# F07 Followup
UPRIVER_CASE_STUDIES_PATH=

# F09 Gap analysis (no new env vars)

# F10 Blog topic generation
AHREFS_DEFAULT_DR_THRESHOLD=

# F11 Custom admin tools (no new env vars; uses operator hourly rate from client-config.yaml)

# F12 Video audit
OPERATOR_VIDEO_DAY_RATE=

# F05 Natural language admin (operator-level, shared across clients)
UPRIVER_GITHUB_APP_ID=
UPRIVER_GITHUB_APP_PRIVATE_KEY=
UPRIVER_GITHUB_PAT=          # alternative to GitHub App
GITHUB_WEBHOOK_SECRET=
ADMIN_OPERATOR_EMAIL=
ADMIN_OPERATOR_SLACK_WEBHOOK=

# F05 per-client (set on each form's Vercel deployment)
FORM_PIN_HASH=
GITHUB_REPO_TARGET=
CLIENT_NAME=
```

`upriver doctor` should be updated to check for the presence of these variables and warn (not error) when feature-specific keys are missing. The relevant features should fail fast at runtime when their required keys are absent.

### 4.4 Database migrations

Only one Supabase migration is required for the entire suite. The original spec had a `change_requests` table for tracking the natural language admin queue. With F05 using GitHub Issues as the source of truth, that table is no longer needed.

Apply during Phase 2 (the monitor stage uses these columns; Phase 3 admin extends usage of the same table):

```sql
create table client_admins (
  slug text primary key,
  github_repo text,
  vercel_form_project_id text,
  form_url text,
  paused boolean default false,
  monitoring_enabled boolean default true,
  monitor_schedule text default '0 8 * * MON',
  monitor_baseline text default 'previous',
  last_monitor_run timestamptz,
  followup_enabled boolean default false,
  last_followup_run timestamptz,
  engagement_ended_at timestamptz,
  deployed_at timestamptz default now()
);
```

The `engagement_ended_at` column is set when the original engagement closes (manually, by the operator). Followup will only schedule itself for clients where this date is at least 180 days in the past.

### 4.5 Voice and copy rules

All client-facing output (reports, emails, share-link pages, the prototype app, the admin) follows the Upriver design system and voice rules:

- First person present tense from the operator's perspective.
- Sentence case in body; UPPERCASE only for headings, buttons, pills, table headers.
- No em dashes anywhere. Apostrophes in JSX use `&apos;`.
- Plain USD prices ($500, $2,000/mo). No "starting at" - use "from $X" when there's a floor.
- Real tool names always (Cloudinary, HoneyBook, OpenTable). Never generic categories.
- Banned words: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer.

Operator-facing output (the design brief, fixes plan, monitor delta reports, sales talking points) uses a more functional tone but follows the same banned-words list.

### 4.6 Testing approach

Each feature gets its own test fixture client in `packages/core/test/fixtures/clients/`. Fixtures are stripped-down clients with just enough scraped data to exercise the feature.

For Phase 1 features, unit tests cover the analyzer logic (voice extraction, media classification, schema generation). Integration tests run the CLI command end to end against the fixture and assert output file structure and content.

For Phase 2 features, integration tests cover cross-feature scenarios: voice extract output successfully consumed by improve stage; media audit findings successfully filtering images for the iOS prototype; monitor delta computation against fixture baseline data.

For Phase 3, end-to-end tests run against a sandbox GitHub repo and Vercel project. The natural language admin deserves its own test environment because of the security implications. Add a `packages/admin-template/test/e2e/` directory with playwright tests.

Run the full test suite after each phase: `pnpm test`. The CI pipeline should fail any phase that introduces regressions to existing tests.

### 4.7 Documentation updates

**Phase 1:**
- Update README.md command table with voice-extract, audit-media, schema-build, gap-analysis, video-audit, blog-topics.
- Update Operator User Guide with the same.
- Add a section to the User Guide titled "Sellable standalone deliverables" listing voice extract, schema build, gap analysis, video audit, blog topic roadmap, and the upcoming prototype.
- Add a section titled "Information architecture and rebuild scope" covering how gap analysis drives the proposed sitemap and how the rebuild stages consume it.
- Add a section titled "Selling video work" covering how the video audit deliverable creates the conversation about photography and videography production work.

**Phase 2:**
- Add monitor and followup to the README and User Guide.
- Add custom-tools to the README and User Guide.
- Add a new section "Long-running and scheduled work" covering monitor schedules, follow-up cadence, and worker provisioning requirements.
- Add iOS prototype to the User Guide with screenshots of a sample prototype.
- Add a new section "Custom tooling engagements" covering how custom-tools output flows into separate scoped projects, including pricing guidance and template catalog management.

**Phase 3:**
- Add admin commands to the README and User Guide.
- Add a new top-level section "Retainer operations" covering admin deploy, the GitHub Issues to PR change request flow, label semantics, and the operator's responsibility for PR review.
- Add a security note explaining the form PIN model's appropriate use cases and limitations, and clarifying that the GitHub App permissions model is the primary security boundary.
- Document the client onboarding step where the operator decides whether the client gets the form-only experience or also receives GitHub access for direct issue submission.

## Part 5: Suite-Wide Acceptance Criteria

The full feature expansion is complete when:

- All eleven new features pass their individual acceptance criteria as specified in the feature sections above.
- All three phase verification gates pass without regressions.
- Documentation is updated as specified in section 4.7.
- The audreys test client successfully completes a full pipeline run including all new stages: `upriver run all audreys --include-prototype --include-custom-tools` produces every expected artifact, including the proposed sitemap, redirect rules, 25 blog topic briefs, video plan with shot lists, and custom tool proposals.
- A second test client (use `barneys-bbq` as the canonical second fixture) runs successfully through all stages, validating that the features work across different industry configs.
- A third test client representing a different vertical (use `montgomery-preschool` as the preschool fixture) successfully exercises the custom admin tools with industry-appropriate concepts.
- The monitor schedule has been running for at least one week without errors against at least one test client.
- The natural language admin has been deployed to at least one real production client (audreys is the recommended first deployment) and successfully processed at least three real change requests, including at least one "write the next blog post" request that consumed the topic roadmap.
- A test rebuild using the proposed IA from gap analysis successfully redirects all original URLs to their new locations.
- The video audit successfully produces shot lists used by the operator on at least one real shoot day, validating that the production document quality meets field requirements.
- No environment variable, package dependency, or database migration is undocumented.
- Operator's first-time experience with the new features is verified by running through every command from a fresh git clone, following only the README and User Guide.

## Out of Scope

These ideas were discussed but are explicitly not included in this build:

- Greenfield site mode (build from markdown + design system without a clone source). Will be specced separately as G00.
- Schema build sold as standalone product page on the Upriver site. Marketing surface, not a CLI feature.
- TestFlight publishing for iOS prototypes. The prototype publishes to Expo Go via QR code only. Real App Store submission stays a separate engagement.
- Case study generator. The followup stage produces the raw comparison data; the case study writer is a separate (future) feature.
- Subcontractor handoff automation. Will be specced under the subcontractor operations work.
- Auto-generation of all 25 blog posts as part of `improve`. Token-expensive for content the client may never read; current approach generates briefs upfront and posts on demand through the admin.

## How Claude Code Should Approach This Build

Read this document in full before writing any code. Pay particular attention to:

1. **The build phase order in Part 2.** Do not implement features out of phase order. Each verification gate must pass before beginning the next phase.

2. **The integration sections in each feature spec (Part 3, section 6 of each feature).** These specify exactly where new stages register, which existing files get modified, and how new features connect to existing pipeline stages.

3. **The existing repo conventions.** Before adding a new command, read `packages/cli/src/commands/` to understand the oclif pattern. Before adding a new audit pass, read `packages/core/src/audit/passes/` to understand the registration pattern. Before adding a new dashboard subpage, read `packages/dashboard/src/pages/clients/[slug]/` to understand the layout pattern.

4. **Test fixtures.** When implementing each feature, add the fixture client mentioned in its acceptance criteria. The audreys, barneys-bbq, and montgomery-preschool fixtures should exist by the end of Phase 2.

5. **The voice rules.** Every piece of generated content (reports, emails, deliverables, the form, the prototype) must respect the Upriver banned words list and formatting conventions. Build the voice check into generated outputs from day one rather than retrofitting.

6. **Cost discipline.** Each feature has a token cost target in its acceptance criteria. If implementation exceeds the target, prefer cheaper heuristics first and Anthropic API calls second rather than the reverse.

When in doubt about a design choice, prefer the option that matches existing repo conventions over the option that's technically cleaner. Consistency with existing code beats local optimality.
