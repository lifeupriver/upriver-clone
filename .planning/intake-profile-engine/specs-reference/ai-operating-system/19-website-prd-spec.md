# Document Production Spec 19: Website Requirements (PRD)

## What This Spec Is

This is the production specification for the Website Requirements document — the buildable PRD for the client's website. It tells anyone (or any headless generation session) building this document exactly what goes in, what each section looks like, and how to know when it's done.

The Website Audit (Document 10) decides *whether* and *how far* to change the website — it ends in the §9 scope fork (A iterative fixes / B partial rebuild / C full rebuild). This document is what comes *after* that fork is chosen: it translates the audit's recommendations, the verified business facts, and the SEO strategy into a concrete, page-by-page specification that a builder — Claude Code against the scaffold template, or a human — can implement without re-deciding anything. It is the website's equivalent of a software PRD: information architecture, per-page purpose and content sourcing, conversion elements, SEO/AEO requirements, performance budgets, the platform decision, and migration notes.

This document is generated, not whole-built. It is the requirements; the bespoke site build remains operator-driven (per-page Continue gates), guided by this PRD plus the Design System (Document 20).

**Critical principle:** every page, every content block, every requirement in this document must trace to a source — a profile fact, an audit finding, an SEO target, or the scope decision. The PRD never invents pages or copy; it routes verified facts and audit findings into a build plan. Where the inputs are silent, mark `[NEEDS CONFIRMATION: <specific question>]` inline rather than inventing.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 19 (website tier — `--web`) |
| **Priority** | High (gates the website build) |
| **Total length target** | 2,500-5,000 words |
| **Delivery format** | Markdown file loaded into the client's Claude Project and consumed by the build |
| **File naming convention** | `[client-slug]-19-website-prd.md` |
| **Scope gate** | `goals.engagementScope.websiteScope` (HV) — no PRD generates until the fork is verified |
| **Foundation for** | Document 20 (Design System); the scaffold/clone build; later proposal/G1 linkage |

---

## When This Document Gets Built

**After the doc-10 scope fork is chosen and verified.** This document is post-fork by construction: the `websiteScope` field is an HV gate on generation. It rides the `--web` scope (`generate <slug> --web`), not `--all`.

**Triggers:** Documents 01, 02, 06, 10 delivered and approved; `goals.engagementScope.websiteScope` verified (A, B, or C).

**Blocks:** the website build (scaffold/clone for path A/B; new build from references for path C). The build does not start without this PRD.

---

## Required Inputs

| Input | Source | Used for |
|---|---|---|
| `identity.publicName`, address, hours, contact | profile `identity` | NAP, contact/footer requirements, LocalBusiness schema |
| `offerings.core` (names, components, exclusions) | profile `offerings` | service/offering pages, the page set |
| `positioning.keyDifferentiator`, recommended statement | profile `positioning`, doc-01 | homepage hero, what each page must claim |
| `customers.primaryCustomer`, decisionCriteria | profile `customers` | per-page audience + journey fit |
| `seo.primaryKeywordTargets`, `seo.local`, AEO question keywords | profile `seo`, doc-06 | per-page SEO target, AEO/schema requirements, missing pages |
| `salesProcess.conversionEvent`, follow-up | profile `salesProcess`, doc-03 | conversion elements, primary CTA, form requirements |
| `content.written`, assets, FAQ inventory | profile `content`, doc-04, doc-07 | content-source mapping, content gaps |
| Brand voice + banned phrases | doc-01 | copy requirements per page |
| Page-by-page audit, missing pages, technical findings | doc-10 | the rebuild backlog, the platform decision, migration notes |
| `goals.engagementScope.websiteScope` (A/B/C) | profile `goals` (HV) | which path the page set follows (see §1) |

The generation session receives the chosen `websiteScope` value and MUST state which path it is specifying for (§1). It never decides the fork.

---

## Section-by-Section Template

### Header Block

```markdown
# [Business Name] Website Requirements (PRD)

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Scope path:** [A iterative fixes / B partial rebuild / C full rebuild] (from doc-10 §9, websiteScope)
**Platform decision:** [Astro clone of current platform / new Astro build / other]
**Companion documents:** 01, 02, 06, 10, 20 (Design System).

**Critical principle:** every requirement traces to a source — a profile fact, an audit finding (doc-10), an SEO target (doc-06), or the scope decision. No page or copy is invented here.
```

---

### Section 1: Scope and Path

**Purpose:** State the chosen path and what it means for this PRD.

**Word count target:** 150-300 words.

Required content:
- The verified `websiteScope` value and the path it maps to (A: iterate on the current site; B: rebuild the highest-priority pages; C: full rebuild / reimagine).
- One paragraph on what is in scope vs. explicitly out of scope for this build, drawn from doc-10 §9 (the scoped backlog) — not a re-litigation of the fork.
- The content invariant: verified profile facts OVERRIDE any stale scraped copy in every page (capacity, hours, pricing visibility, offerings). List the specific facts that override scraped values.

---

### Section 2: Information Architecture & Sitemap

**Purpose:** The page set the build will produce.

**Word count target:** 400-700 words.

Required content:
- **Sitemap** (hierarchical list of every page in the new/revised site). For path A/B, start from the current sitemap (doc-10 §1) minus pages the audit killed, plus pages the audit flagged missing (doc-10 §4). For path C, derive the page set from the profile (offerings, audiences, conversion path, SEO targets) — the old sitemap is consulted for content salvage only.
- **Navigation** (primary, footer, mobile) — the target structure, with any simplifications the audit recommended.
- **Page inventory table:** for each page — URL/path, page type, in/out of scope this build, status (keep / rebuild / new / archive), source (existing page id or "new").

---

### Section 3: Per-Page Requirements

**Purpose:** The heart of the document. For each significant page, the build-ready requirement.

**Word count target:** 1,000-2,500 words depending on page count.

For each page in scope:

```markdown
### Page: [path] — [page name]

**Page type / role in funnel:** [Per doc-03]
**SEO target (doc-06):** [primary keyword; secondary; AEO question keywords]
**Audience + journey fit (profile customers):** [who this page serves, what they need to decide]

**Content source map** (where each block's content comes from — the build must not invent):
| Block | Content source | Notes |
|---|---|---|
| Hero headline | doc-01 voice + positioning.keyDifferentiator | [the claim it must make] |
| [section] | [profile fact / doc-04 asset / scraped copy id / NEEDS CONTENT] | [override note if a profile fact replaces scraped copy] |

**Conversion elements:** [primary CTA per doc-03 conversionEvent; secondary; form fields if any]
**SEO/AEO requirements:** [title tag, H1, meta description target; schema types — LocalBusiness/FAQ/Service/etc.]
**Copy requirements:** [voice rules from doc-01; banned phrases to avoid; facts that must appear verbatim from doc-02]
**Build notes:** [migration notes for this page; what changes vs. current; effort]
```

Mark any block whose content the inputs do not supply as `[NEEDS CONTENT: <what>]` — never fabricate copy.

---

### Section 4: Conversion & Lead Capture

**Purpose:** The conversion mechanics the build must implement, site-wide.

**Word count target:** 250-450 words.

Required content:
- Primary conversion event and CTA (from `salesProcess.conversionEvent`) — the single consistent primary CTA site-wide.
- Inquiry/booking form: fields (required vs. optional), validation, post-submit experience, integration target (CRM/scheduling from doc-03/profile tools).
- Contact information policy (what NAP appears where; pricing-visibility policy from the profile — HV — applied consistently).
- Per-page CTA placement rules.

---

### Section 5: SEO, AEO & Schema Requirements

**Purpose:** The technical SEO the build must ship, from doc-06.

**Word count target:** 250-450 words.

Required content:
- Per-page primary/secondary keyword targets (table; cross-reference §3).
- AEO: question-keyword coverage and the FAQ/answer requirements (cross-reference doc-07).
- Schema markup required (Organization, LocalBusiness, Service/Product, FAQ, Review/AggregateRating) and which pages carry each.
- Metadata rules: title-tag format, meta-description requirements, canonical/indexation rules, internal-linking requirements.

---

### Section 6: Performance Budgets & Technical Requirements

**Purpose:** The non-negotiable technical bar.

**Word count target:** 200-400 words.

Required content:
- Core Web Vitals budgets (LCP / INP / CLS targets, mobile and desktop) — the targets the build must hit, informed by doc-10 §5.
- Image strategy (formats, responsive sizes, lazy-loading), font-loading strategy.
- Accessibility baseline (contrast, alt text, keyboard nav, ARIA).
- Analytics/measurement instrumentation required at launch (cross-reference doc-12 if present).

---

### Section 7: Platform Decision & Migration

**Purpose:** The platform choice and how content moves.

**Word count target:** 250-450 words.

Required content:
- Platform decision and rationale (e.g., "Astro clone of the current Squarespace site" for path A; "new Astro build" for B/C), grounded in doc-10's platform-limitations findings.
- Migration plan: which existing content is salvaged (page-by-page from the scrape), what is rewritten, what is dropped. Redirect map requirements (old URL → new URL) to preserve SEO equity.
- The fact-override list again, framed for the build: each verified profile fact that REPLACES a scraped value is a visible change — flag it for client review, do not sneak it in.
- Hosting/deploy target and repo ownership (client's GitHub org / Vercel, per I07) — stated as requirements, not performed here.

---

### Section 8: Build Sequence & Acceptance

**Purpose:** The ordered build plan and how "done" is judged per page.

**Word count target:** 300-500 words.

Required content:
- Build order (which pages first; dependencies — e.g., shared components, the design system from doc-20).
- Per-page acceptance criteria (content sourced correctly, SEO target met, CTA present, performance budget met, voice compliant).
- The human gates this build passes through (per-page Continue gate during rebuild; client review; repo handoff; DNS cutover) — the build is operator-driven; this PRD does not authorize unattended whole-site generation.
- Open questions / `[NEEDS CONFIRMATION]` rollup.

---

## How to Build This Document

This document is generated by the Upriver generation engine under `--web`, from the profile slice (the §"Required Inputs" fields) plus the F1 digests of doc-01/02/06/10. The session:

1. Reads the verified `websiteScope` and states the path (§1). If it is not verified, the engine's HV gate blocks generation — this document never runs on an unverified fork.
2. Builds the page set per §2 from the path: audit-derived (A/B) or profile-derived (C).
3. Writes per-page requirements (§3), routing each content block to its source — a profile fact, a doc-04 asset, a scraped page, or `[NEEDS CONTENT]`. Never fabricates copy or facts.
4. Specifies conversion, SEO/AEO/schema, performance, platform/migration, and the build sequence (§§4-8).
5. Marks every gap the inputs do not fill as `[NEEDS CONFIRMATION: <question>]`.

---

## Definition of Done

- [ ] All 8 sections present
- [ ] Scope path stated and matches the verified `websiteScope`
- [ ] Sitemap + navigation + page-inventory table complete
- [ ] Every in-scope page has a requirement with a content-source map (no un-sourced copy)
- [ ] Conversion elements, SEO/AEO/schema, and performance budgets specified
- [ ] Platform decision stated with rationale; migration + redirect + fact-override plan present
- [ ] Build sequence + per-page acceptance criteria present; human gates named
- [ ] Every requirement traces to a source (profile fact / audit finding / SEO target / scope decision)
- [ ] Gaps marked `[NEEDS CONFIRMATION]` rather than invented
- [ ] No instruction to generate the whole site unattended

---

## Common Failure Modes

**Failure 1: Inventing pages or copy.** The PRD adds pages or writes hero copy not traceable to an input. Fix: every page comes from the sitemap logic (§2), every block from a named source (§3).

**Failure 2: Re-deciding the fork.** The PRD argues for a different scope than `websiteScope`. Fix: §1 states the chosen path; the PRD specifies *for* it, never against it.

**Failure 3: Ignoring the fact-override invariant.** Stale scraped numbers (capacity, hours, pricing) survive into the requirements. Fix: the verified profile facts override scraped copy, and each override is flagged as a visible change.

**Failure 4: Authorizing unattended whole-site generation.** The build sequence reads as "generate the site." Fix: the build is operator-driven with per-page Continue gates; this PRD is the requirements, not a generation trigger.

**Failure 5: SEO requirements without targets.** "Improve SEO" with no per-page keyword. Fix: every page's SEO target comes from doc-06; every schema type is assigned to specific pages.
