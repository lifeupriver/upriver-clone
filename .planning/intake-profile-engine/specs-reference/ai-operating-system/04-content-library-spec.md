# Document Production Spec 04: Content Library and Asset Inventory

## What This Spec Is

This is the production specification for Document 4 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what to ask the client to fill it out, and how to know when it's done.

The Content Library and Asset Inventory is the index of everything the business has already created or owns that can be used in future content. Photos, video, blog posts, testimonials, reviews, press, brand assets, and existing templates. Without this document, AI-generated content invents claims, misses opportunities to reuse strong existing material, and treats the business as if it has no history. With this document, every blog post can pull a relevant testimonial, every social post can reference an existing photo, every email can cite a real recognition, and every chatbot answer can be supported by something the business has already produced.

This is the most operational of the foundational documents. It's less about discovery and more about cataloging. But the catalog determines what the AI can credibly say.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 04 of 12 |
| **Priority** | High |
| **Total length target** | Variable. Structured reference, not prose. Often 2,000-5,000 words depending on how much content the business has. |
| **Total time to produce** | 2-3 hours |
| **Joshua's time** | 1.5-2 hours |
| **Claude's time** | 30-45 minutes |
| **Client's time** | 30 minutes (sharing access and answering inventory questions) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge |
| **File naming convention** | `[client-slug]-04-content-library.md` |
| **Foundation for** | Documents 8 (Social Media Playbook), 9 (Website Audit), and every blog post, social post, email, and AI-generated content piece |

---

## When This Document Gets Built

**Phase 2 of engagement, Week 2.** Built after the Brand Voice Guide (01) and Business Facts Reference (02) are in place. Doesn't depend on the Sales Process Map.

**Triggers:** Client has shared access to photo storage, social accounts, website admin, and any other content repositories. Onboarding questionnaire is submitted.

**Blocks:** Social Media Playbook (Document 08), Email Templates (Document 07's content), Website Audit (Document 11) — all reference what assets exist.

---

## Section-by-Section Template

The finished document follows this exact structure. Sections are required unless flagged optional.

### Header Block

```markdown
# [Business Name] Content Library and Asset Inventory

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last full inventory:** [Month Year]
**Next scheduled inventory refresh:** [Month Year — quarterly default for active assets, annual for static assets]

**For:** Content generation, social media planning, email design, blog writing, sales collateral, and any AI-generated work that should reference real existing material.

**Companion documents:**
- Document 01: Brand Voice Guide (how the assets get described)
- Document 02: Business Facts Reference (the facts the assets support)
- Document 06: SEO and Keyword Strategy (which keywords the content addresses)
- Document 08: Social Media Playbook (which assets get used in social)
- Document 11: Website Audit (which assets are on the site, which should be)

**Critical principle:** Every claim made in marketing content should be supported by an asset in this library. If you can't point to the photo, the testimonial, the press mention, or the project that supports a claim, don't make the claim.
```

**Word count:** 100-150 words.

---

### Section 1: Photography Inventory

**Purpose:** Catalog of all professional and high-quality photos the business owns or has rights to use, organized so AI tools and human writers can find what they need.

**Word count target:** Variable — 300-1,000 words depending on volume.

**Required structure:**

```markdown
## 1. Photography Inventory

### Storage and access
- **Primary photo storage:** [Cloudinary / Google Drive / Dropbox / hard drives / mixed]
- **Access for the team:** [Who has access, how]
- **Naming convention used:** [If any — e.g., "YYYY-MM-DD-event-type-photographer"]
- **Total photo count:** [Approximate]
- **Date range covered:** [Earliest to most recent]

### Organization
For each major category of photos:

**Category: [Name — e.g., "Property exterior" or "Wedding receptions" or "Project before/after"]**
- **Where they live:** [Folder path or Cloudinary tag]
- **Approximate count:** [Number]
- **Date range:** [Earliest to most recent]
- **Best representative shots:** [3-5 specific filenames or asset IDs flagged as hero images]
- **Photographer credits and usage rights:** [Who shot them, what license, any attribution requirements]
- **Notes:** [What's well-represented, what's missing, what's outdated]

### Photo gaps
[Categories of photos that the business needs but doesn't have. This drives future content shoot planning.]

### Photographer relationships
[List of photographers who have shot for this business, with usage rights notes. Critical for venue and hospitality businesses where many photographers contribute content.]
```

**How to source the data:**
- Direct access to client's photo storage (Cloudinary, Drive, Dropbox)
- Website crawl for photos already published
- Onboarding questionnaire response on photo assets
- Scrape Instagram feed for high-engagement photos

**Industry adaptation:**
- **Wedding venue:** Photos organized by photographer, by season, by event style, by space (ceremony lawn, barn, lodging). Need to track usage rights per photographer carefully.
- **Contractor:** Before/after photos by project type. In-progress photos. Detail shots of craftsmanship. Crew photos. Often poorly organized; cataloging itself is a deliverable.
- **Preschool:** Classroom photos by age group, outdoor play, special events. Critical: photos with children require parental release forms; track which photos are cleared for marketing use.
- **Restaurant:** Dish photography, dining room ambiance, chef and team, private events, seasonal menu items. Need to track which dishes are still on the menu.
- **Professional services:** Headshots, team photos, event/speaking photos, office/workspace shots. Often the lightest inventory.

---

### Section 2: Video Inventory

**Purpose:** Catalog of all video assets — full-length productions, short-form clips, raw footage that could be cut into content.

**Word count target:** Variable — 200-600 words depending on volume.

**Required structure:**

```markdown
## 2. Video Inventory

### Storage and access
- **Primary video storage:** [Mux / Vimeo / YouTube / Google Drive / hard drives]
- **Access for the team:** [Who has access, how]
- **Total video count / total runtime:** [Approximate]
- **Date range covered:** [Earliest to most recent]

### Organization
For each major category:

**Category: [Name — e.g., "Property tour video" or "Wedding highlight reels" or "Project walkthrough videos"]**
- **Where they live:** [Mux IDs, YouTube URLs, folder paths]
- **Approximate count and total runtime:** [Number, minutes]
- **Best representative pieces:** [3-5 specific titles or IDs with their use case]
- **Production credits and usage rights:** [Who produced them, license terms]
- **Notes:** [Quality, age, current relevance]

### Short-form clips inventory
- **Clips already cut for social (Instagram Reels, TikTok, YouTube Shorts):** [Count, where they live]
- **Raw footage available to cut into clips:** [Approximate hours, who has access]

### Video gaps
[Video assets the business needs but doesn't have. Drives future production planning.]

### Mux IDs reference (if Mux is in use)
[Quick lookup table of Mux playback IDs for the most-used videos so embeds and references are easy.]

| Video title | Mux Playback ID | Length | Best use |
|---|---|---|---|
| [Title] | [ID] | [Length] | [Where it gets used] |
```

**Industry adaptation:**
- **Wedding venue:** Full venue tour video, highlight reels from real weddings, drone footage, behind-the-scenes prep videos. Mux is the standard hosting for venues.
- **Contractor:** Project walkthrough videos, time-lapse construction, customer testimonial videos. Often light on video; flag as a content gap.
- **Preschool:** Tour videos, classroom activity videos, parent testimonials. Privacy considerations heavy.
- **Restaurant:** Chef interviews, dish prep videos, dining room ambiance, private event highlights. Instagram Reels are often the bulk of the video library.
- **Professional services:** Talking-head expert content, webinar recordings, client testimonial videos, conference talks.

---

### Section 3: Written Content Inventory

**Purpose:** Catalog of all existing written content — blog posts, articles, ebooks, white papers, case studies, FAQs, whatever the business has published.

**Word count target:** 200-500 words.

**Required structure:**

```markdown
## 3. Written Content Inventory

### Blog posts
- **Total count:** [Number]
- **Date range:** [First post to most recent]
- **Posting frequency:** [Active / dormant / sporadic]
- **Where they live:** [URL pattern, e.g., "audreysfarmhouse.com/blog/[slug]"]
- **Average word count per post:** [Approximate]

| Post title | URL | Date | Word count | Topic / target keyword | Performance notes |
|---|---|---|---|---|---|
| [Title] | [URL] | [Date] | [Count] | [Topic] | [Traffic, links, etc. if known] |

[Continue for top 10-15 posts. For posts beyond top 15, note total count and where the full list lives.]

### Long-form content (ebooks, white papers, guides)
[List with location and use case. Often empty for small businesses; relevant for professional services.]

### Existing FAQ content
- **Where it lives:** [Website FAQ page URL]
- **Number of questions covered:** [Count]
- **Last updated:** [Date]
- **Quality notes:** [Comprehensive / thin / outdated]

### Press / media features
[List of every press mention, podcast appearance, magazine feature, or third-party publication. Each with date, source, link, and a one-line note on the content.]

### Awards and recognitions (with documentation)
[Each award with year, awarding body, link or proof if available, current visibility on the website.]

### Newsletters / email content history
- **Email platform in use:** [Mailchimp, ConvertKit, HoneyBook campaigns, Resend, etc.]
- **Total subscribers:** [Count]
- **Sending cadence:** [Active / dormant]
- **Content archive:** [Where past emails can be referenced]
- **Top-performing past emails (by open rate or revenue):** [List 3-5 if data is available]
```

---

### Section 4: Testimonials and Reviews

**Purpose:** Curated index of the best testimonials and reviews, organized by theme so AI tools can pull relevant proof for whatever claim is being made.

**Word count target:** 400-1,000 words. This is one of the highest-value sections; spend time on it.

**Required structure:**

```markdown
## 4. Testimonials and Reviews

### Review platforms in use
| Platform | Total reviews | Average rating | Last review date | Response rate |
|---|---|---|---|---|
| Google Business Profile | [#] | [#] | [Date] | [%] |
| The Knot | [#] | [#] | [Date] | [%] |
| WeddingWire | [#] | [#] | [Date] | [%] |
| Yelp | [#] | [#] | [Date] | [%] |
| Industry-specific (Junebug, Houzz, etc.) | [#] | [#] | [Date] | [%] |

### Best-of testimonials by theme

Curate the strongest 15-30 testimonials, organized by what they prove. AI tools pull from this when they need a quote that supports a specific claim.

**Theme: [Category — e.g., "In-house catering quality" or "Project quality and craftsmanship" or "Teacher warmth and care"]**

> "[Direct quote from the testimonial — 30-100 words, picked for impact]"
> — [First name + last initial], [date], [platform]
> **Use cases:** [Where this quote is well-suited — e.g., "catering page hero quote, social posts about food, blog posts about menu philosophy"]

[Repeat for each theme.]

### Common themes Joshua identified

After reading 30+ reviews, what does the business get praised for most consistently? Document these so AI tools know what to lean into.

1. [Theme 1] — mentioned in [X]% of reviews
2. [Theme 2] — mentioned in [X]% of reviews
3. [Theme 3] — mentioned in [X]% of reviews

### Critical reviews and lessons

Reviews that contain criticism, even if the overall rating was high. AI tools should know the friction points so they don't accidentally over-promise on weak areas.

| Critique | Frequency | Already addressed? | Notes |
|---|---|---|---|
| [Issue] | [How often this comes up] | [Yes / No / Partial] | [What the business has done about it] |

### Quotes from non-platform sources
[Quotes from emails, thank-you cards, DMs, planner introductions, vendor referrals — testimonial-quality language that didn't end up on a review platform but can be used with permission.]
```

**Critical detail:** Pulling testimonials is a high-touch task. Joshua should personally read 30+ reviews per client to identify the best material. Don't outsource this to a fast skim.

---

### Section 5: Visual Brand Assets

**Purpose:** Logos, colors, fonts, and other brand identity assets that any content should adhere to.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 5. Visual Brand Assets

### Logos
- **Primary logo file:** [Filename, location, format]
- **Secondary / alternate logos:** [If applicable]
- **Logo on dark background variant:** [Filename, location]
- **Logo on light background variant:** [Filename, location]
- **Icon / mark only:** [Filename, location]
- **Usage rules:** [Minimum size, clearspace, what NOT to do]

### Color palette
| Color name | Hex | RGB | Use case |
|---|---|---|---|
| Primary | [Hex] | [RGB] | [Where it's used] |
| Secondary | [Hex] | [RGB] | [Where it's used] |
| Accent | [Hex] | [RGB] | [Where it's used] |
| Neutral / background | [Hex] | [RGB] | [Where it's used] |

### Typography
- **Heading typeface:** [Name, weights used, where licensed from]
- **Body typeface:** [Name, weights used, where licensed from]
- **Accent typeface (if any):** [Name, weights used]
- **Font usage rules:** [Pairings, sizes, when to deviate]

### Existing brand guidelines document (if one exists)
[Link or file path. If none exists, flag as a gap.]

### Templates and design files
- **Email signature template:** [Where it lives]
- **Proposal template:** [Where it lives]
- **Social post templates (Canva, etc.):** [Where they live]
- **Print collateral templates:** [Where they live]
```

**If the business has no formal brand guidelines:** Document what's actually in use (pull hex codes from the website, identify fonts using a tool like WhatTheFont). Flag this as a gap that the AI Foundation Package could fill.

---

### Section 6: Vendor and Partner Network

**Purpose:** The relationships and partnerships that can be referenced in content. Vendors the business works with regularly, partner businesses, photographers who shoot the property, etc.

**Word count target:** 200-500 words.

**Required structure:**

```markdown
## 6. Vendor and Partner Network

### Preferred vendor list (if applicable)
| Vendor | Category | Relationship strength | Permission to feature publicly? |
|---|---|---|---|
| [Name] | [Category] | [Years working together / volume] | [Yes / Yes with credit / No / Ask first] |

### Photographers who have shot here
| Photographer | Instagram | # of shoots | Usage rights | Tag in posts? |
|---|---|---|---|---|
| [Name] | [@handle] | [#] | [Photo credit required / commercial use included] | [Yes / per asset] |

### Partner businesses
[Other businesses with cross-referral or partnership relationships — e.g., a venue's relationship with caterers, a contractor's relationship with designers, a preschool's relationship with pediatricians.]

### Industry associations and memberships
[Trade associations, BBB, certifications, industry groups. Each with current standing.]
```

---

### Section 7: Content Themes and Editorial Patterns

**Purpose:** The recurring topics, angles, and content patterns the business has used or could use. This becomes the input for content calendar planning.

**Word count target:** 200-500 words.

**Required structure:**

```markdown
## 7. Content Themes and Editorial Patterns

### Top-performing content themes (historical)

What topics have performed well in past content? Use blog traffic, social engagement, email open rates as evidence.

| Theme | Evidence | Why it likely works |
|---|---|---|
| [Theme] | [Top blog post in this theme + traffic, top Instagram post + engagement] | [Hypothesis] |

### Underused themes the business should be covering

Topics the business has expertise in but hasn't created content around. Often surfaces during the discovery call.

### Recurring content formats that work

- [Format — e.g., "Real wedding feature blog posts," "Project before-after Instagram carousels," "Monthly menu update emails"]

### Content series (existing or proposed)
[Series the business runs or could run — e.g., "Couple Spotlight," "Behind the Scenes," "Project of the Month"]

### Hashtag and tag strategy notes
- **Branded hashtags:** [List]
- **Local/regional hashtags used:** [List]
- **Industry hashtags used:** [List]
- **Accounts regularly tagged:** [Photographers, vendors, planners]
```

---

### Section 8: Content Production Capacity

**Purpose:** What the business can realistically produce, in what volume, with what resources. This grounds content strategy in reality.

**Word count target:** 150-300 words.

**Required structure:**

```markdown
## 8. Content Production Capacity

### Who creates content currently
- **Writing:** [Owner / staff member / outsourced / none]
- **Photography:** [Hired pros / staff / phone photos / mixed]
- **Video:** [Hired pros / staff / phone / none]
- **Social posting:** [Owner / staff / outsourced / scheduled in batches]

### Time budget per week / month
[Realistic estimate of how many hours per week the business currently puts into content.]

### Tools currently used
- [Canva / Figma / Lightroom / Capture One / Final Cut / etc.]

### What the business is willing to invest in going forward
[Capacity for shoots, interviews, time investment in interviews for written content, etc.]

### Production gaps that limit content strategy
[Things the business can't do today that limit what content can be produced. Drives recommendations for the AI Foundation Package or production add-ons.]
```

---

### Section 9: Content Inventory Gaps and Production Priorities

**Purpose:** The list of what's missing. Often the most actionable section because it drives the content production calendar.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 9. Content Inventory Gaps and Production Priorities

### Critical gaps (must be filled before key content can be produced)
[Things missing that block other work. Examples: "No professional photos of the kitchen — required for any catering-focused content." "No project photos from last 12 months — needed for case study content."]

### High-value gaps (should be filled for material content lift)
[Things missing that would meaningfully expand what content can be made. Examples: "No video of the property tour." "No customer testimonial videos." "No behind-the-scenes content of the team at work."]

### Production priorities for the next 90 days
1. [Specific shoot or content production with rough scope and time estimate]
2. [Specific shoot or content production]
3. [Specific shoot or content production]

### Content audit findings
[Quick observations from going through the inventory — what's outdated, what's mislabeled, what's strong but underused, what should be archived.]
```

---

## How to Build This Document

The full process, in order. Total time: 2-3 hours including client time.

### Step 1: Get Access (15 minutes, mostly client)

Before doing anything else, get access to:
- Photo storage (Cloudinary, Drive, Dropbox)
- Video hosting (Mux, Vimeo, YouTube)
- Website admin (for content audit)
- Google Business Profile (for review pull)
- Social media accounts (Instagram especially)
- Email platform admin (Mailchimp/HoneyBook/Resend)
- Any brand guidelines document or design files

If access takes time to set up, this document can be partially drafted from public sources (website, social, public reviews) and finished after access is granted.

### Step 2: Public Inventory Sweep (45 minutes, Joshua)

Without client access, you can already gather:

1. Browse the website and catalog every photo and video on every page
2. Scroll the Instagram feed and note top-performing posts and themes
3. Pull all Google reviews into a working document
4. Pull all The Knot / WeddingWire / Yelp / industry-specific reviews
5. List press mentions, awards, features that are publicly visible
6. Note brand colors, fonts, and visual patterns from the website

### Step 3: Private Inventory Sweep (45 minutes, Joshua + access)

Once access is granted:

1. Open the photo storage and document folder structure, total counts, naming conventions
2. Open the video hosting and document the library
3. Open the email platform and document subscriber counts, sending cadence, top-performing past emails
4. Pull any brand guidelines or design templates the client has

### Step 4: Testimonial Curation (30 minutes, Joshua)

This is the highest-value step. Read 30+ reviews across all platforms. For each:
- Identify the theme(s) it speaks to
- Extract the strongest quote (30-100 words)
- Note any specific details that make it usable

Organize quotes into themes that match what the business actually wants to be known for.

### Step 5: Draft Generation (45 minutes, Claude)

In the consulting Claude Project, run this prompt:

```
Generate a Content Library and Asset Inventory for [Business Name] using Document Production Spec 04 as the structure. Industry: [industry].

Source materials:

[Paste: notes from public inventory sweep — website photos, video, social patterns]

[Paste: notes from private inventory sweep — folder structures, counts, platforms]

[Paste: full text of 30+ reviews you read, with platform and date]

[Paste: any brand guidelines, color codes, font names you identified]

[Paste: list of press, awards, partnerships, and vendor relationships]

Build all 9 sections following the spec. For testimonials specifically (Section 4), curate the best quotes by theme — don't include all 30+ reviews verbatim, only the strongest 15-30 organized by the themes the business wants to lean into.

For Section 9 (Gaps and Priorities), be specific. "Better photos" is not a gap. "Professional photography of the kitchen for catering-focused content" is a gap.
```

### Step 6: Joshua Review (30 minutes)

Read the full draft. For each section, check:

- Are inventory counts realistic and verifiable?
- Are testimonials in Section 4 actually pulled from real reviews (not paraphrased)?
- Are themes in Section 4 the right themes to lean into?
- Are gaps in Section 9 specific enough to be actionable?
- Are usage rights clearly documented for photos and video?

### Step 7: Client Review and Confirmation (30 minutes client time)

Send to client with this email:

```
Subject: Content Library — what you have and what you're missing

Attached: the Content Library and Asset Inventory for [Business Name].

This document indexes everything you already own and have published, plus what you don't have yet but probably need.

Two asks:

1. Read Section 9 (Gaps and Priorities) first. These are the production priorities I'd recommend for the next 90 days. Tell me which ones you agree with, which ones you'd reorder, and which ones don't feel right.

2. Read Section 4 (Testimonials by theme). I curated the strongest reviews into themes. Tell me if any are misattributed or if there are quotes I should swap in.

The rest is reference material — you don't need to memorize it, but skim it so you know what's in there.
```

### Step 8: Final Edits and Delivery (15 minutes)

- Apply client edits
- Save with naming convention `[client-slug]-04-content-library-v1.0.md`
- Upload to client's Claude Project as knowledge

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] All 9 sections are complete
- [ ] Photo inventory documents storage location, organization, count, and gaps
- [ ] Video inventory includes Mux IDs (or equivalent) for the most-used videos
- [ ] Written content inventory has top 10-15 blog posts indexed with URLs and topics
- [ ] Testimonials section has 15-30 curated quotes organized by theme (not just a dump)
- [ ] Visual brand assets section has logo files identified, hex codes, and fonts
- [ ] Vendor/partner network is documented with permission-to-feature notes
- [ ] Content themes section identifies what's worked historically and what's underused
- [ ] Production capacity section honestly reflects what the business can produce
- [ ] Gaps section identifies 3-5 specific production priorities for the next 90 days
- [ ] Cross-reference pass against Brand Voice Guide complete (themes match voice attributes)
- [ ] Cross-reference pass against Business Facts Reference complete (testimonials don't claim things facts contradict)
- [ ] Client has reviewed and approved
- [ ] File saved with correct naming convention and uploaded to Claude Project

---

## Common Failure Modes

**Failure 1: Section 4 is a dump of every review instead of a curated index.** Pulling all 80 reviews into the document defeats the purpose. AI tools then can't find the best quote. Fix: select the 15-30 strongest, organize by theme.

**Failure 2: Photo inventory lacks usage rights.** A photographer's photos get used in a paid ad without permission and the photographer pulls usage rights. Fix: every photographer in Section 1 gets a clear rights notation.

**Failure 3: Themes in Section 4 don't match the brand.** Reviews praise "the affordable pricing" but the brand positions as premium. The themes pulled forward should align with what the business wants to be known for, not just what shows up in reviews. Fix: cross-check themes against the Brand Voice Guide identity statement.

**Failure 4: Brand assets section is empty because the business doesn't have brand guidelines.** Then the section gets skipped. Fix: document what's actually in use (extract hex codes from the website, identify fonts), and flag the gap as a recommendation for the AI Foundation Package to address.

**Failure 5: Gaps section is vague.** "Need more video content" is not a gap. Fix: every gap must be specific enough to be a project — what kind of video, of what subject, for what use.

**Failure 6: Document doesn't get updated.** A year later, the inventory is stale. New photos exist, new reviews accumulated, new partnerships formed. Fix: schedule the quarterly inventory refresh as part of any retainer engagement.

**Failure 7: Testimonials are paraphrased instead of pulled verbatim.** Voice and credibility are lost. AI tools then can't reliably quote. Fix: every testimonial in Section 4 is a direct quote with attribution.

---

## Worked Example: Audrey's Farmhouse Content Library and Asset Inventory

The following is a complete sample of what a finished Content Library looks like. Use this as the quality bar.

---

# Audrey's Farmhouse Content Library and Asset Inventory

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Last full inventory:** April 2026
**Next scheduled inventory refresh:** July 2026 (quarterly)

**For:** Content generation, social media planning, email design, blog writing, sales collateral, and any AI-generated work that should reference real existing material.

**Companion documents:**
- Document 01: Brand Voice Guide
- Document 02: Business Facts Reference
- Document 06: SEO and Keyword Strategy
- Document 08: Social Media Playbook
- Document 11: Website Audit

**Critical principle:** Every claim made in marketing content should be supported by an asset in this library.

---

## 1. Photography Inventory

### Storage and access
- **Primary photo storage:** Cloudinary (audreysfarmhouse account) + Dropbox archive of older shoots
- **Access for the team:** Owner, booking coordinator, Megan, Joshua (consulting)
- **Naming convention used:** `YYYY-MM-DD-[event]-[photographer]-[seq]` for newer shoots; older Dropbox archive is loosely organized by year folder
- **Total photo count:** ~12,000 across Cloudinary; another ~25,000 in Dropbox archive
- **Date range covered:** 2014–present in Dropbox; 2022–present in Cloudinary

### Organization

**Category: Property exterior (the farmhouse, the barn, the lawn, the orchard)**
- **Where they live:** Cloudinary tag `property-exterior`; ~480 photos
- **Date range:** 2022–present (older property photos in Dropbox archive)
- **Best representative shots:** `2024-10-14-property-jbrown-001.jpg` (golden-hour barn exterior), `2025-06-22-ceremony-lawn-jbrown-014.jpg` (ceremony lawn at golden hour, west-facing), `2024-08-03-aerial-jbrown-007.jpg` (drone shot of property)
- **Photographer credits:** Joshua Brown Photography (full commercial use), [Other photographer name] (credit required for social use)
- **Notes:** Strong golden-hour and seasonal coverage. Limited winter exterior photos. No spring (April-May) coverage of full property.

**Category: Wedding ceremonies**
- **Where they live:** Cloudinary tag `wedding-ceremony`; ~2,400 photos across 40+ weddings
- **Date range:** 2022–present
- **Best representative shots:** Hero ceremony shots flagged with `hero` tag; ~30 hero shots curated
- **Photographer credits:** Mixed — 12 different photographers have shot ceremonies here. Each has different usage rights. See Section 6 for the photographer-by-photographer breakdown.
- **Notes:** Excellent fall (Sept-Oct) coverage. Lighter on summer (July-August) ceremonies. Almost no winter ceremonies (off-season).

**Category: Wedding receptions in the barn**
- **Where they live:** Cloudinary tag `wedding-reception`; ~3,200 photos
- **Date range:** 2022–present
- **Best representative shots:** ~40 curated hero shots tagged `hero`
- **Photographer credits:** Same mixed photographer credits as ceremonies
- **Notes:** Strong coverage. Good range of seating layouts represented (long tables, round tables, mixed).

**Category: Lodging interiors (farmhouse, cottage, carriage house)**
- **Where they live:** Cloudinary tag `lodging`; ~180 photos
- **Date range:** 2023 refresh shoot + scattered additions
- **Best representative shots:** Full lodging shoot from 2023, all photographed by Joshua Brown Photography with full commercial use
- **Notes:** Strong coverage, all rooms documented. Could use updated photos after the 2025 cottage refresh.

**Category: Kitchen and food**
- **Where they live:** Cloudinary tag `food`; ~340 photos
- **Date range:** 2022–present
- **Best representative shots:** ~20 hero food shots, mostly from professional shoots with the chef
- **Photographer credits:** Joshua Brown Photography (commercial use), and chef's own photos (limited use)
- **Notes:** Decent but not as strong as it should be given that in-house catering is a key differentiator. Need a dedicated food shoot focused on plating and ingredient sourcing.

**Category: Detail and ambient shots**
- **Where they live:** Cloudinary tag `details`; ~1,200 photos
- **Notes:** Good for social content. Mixed usage rights. Always check before commercial use.

### Photo gaps

- Spring (April-May) property exteriors — chronic gap
- Winter exteriors with snow (off-season but useful for "see you in May" content)
- Dedicated food and beverage shoot focused on plating and ingredient sourcing
- Updated cottage interior shoot post-2025 refresh
- Behind-the-scenes shots of the team setting up an event
- Interior photos of the farmhouse great room outside of event setup

### Photographer relationships

See Section 6 for the photographer-by-photographer breakdown with usage rights.

---

## 2. Video Inventory

### Storage and access
- **Primary video storage:** Mux (audreysfarmhouse account) for production embeds; YouTube unlisted channel for raw archive; Vimeo for older highlight reels
- **Access for the team:** Owner, Joshua (consulting), [Video producer name]
- **Total video count / total runtime:** ~25 produced videos, ~15 hours total runtime; plus ~80 hours raw footage in Dropbox

### Organization

**Category: Property tour videos**
- **Where they live:** Mux IDs `prop-tour-2024-full` and `prop-tour-2024-short`
- **Approximate count and total runtime:** 2 videos, 4:30 min and 1:15 min
- **Best representative pieces:** Both currently in use — long version on website homepage, short version on Instagram pinned reel
- **Production credits:** Joshua Brown Photography, full commercial use
- **Notes:** Shot fall 2024. Will need refresh in 2026 if any property changes.

**Category: Wedding highlight reels**
- **Where they live:** Vimeo album `audrey-wedding-highlights`
- **Approximate count and total runtime:** 18 highlight reels, ~90 minutes total
- **Best representative pieces:** Most reels are 3-5 minutes. Best three: Anna+Devin Oct 2024 (most-shared), Maddie+Sam Sept 2024 (full weekend coverage), Lauren+James June 2024 (peak summer aesthetic)
- **Production credits:** Various videographers (each couple's hired videographer). Usage rights granted per couple — most allow venue social use with credit. Check before reuse beyond social.
- **Notes:** Couple-specific reels are great for social and the website's wedding gallery, but should be credited to the videographer.

**Category: Short-form clips for Instagram Reels and TikTok**
- **Where they live:** Mux + a Dropbox folder for source clips
- **Approximate count:** ~60 clips published to date
- **Notes:** Clips are cut from full wedding footage by Joshua's team or the original videographer.

**Category: Behind-the-scenes / staff content**
- **Where they live:** Limited — mostly raw phone footage in Dropbox
- **Notes:** This is a content gap. Behind-the-scenes content would be high-engagement and isn't being produced.

### Video gaps

- Updated property tour video for 2026
- Chef interview / kitchen behind-the-scenes video
- Megan-led "what to expect on your wedding weekend" video
- Lodging walkthrough video (separate from the property tour)
- Off-season / winter atmospheric video for early-engagement-season content

### Mux IDs reference

| Video title | Mux Playback ID | Length | Best use |
|---|---|---|---|
| Property tour (full) | prop-tour-2024-full | 4:30 | Website homepage, embed in proposals |
| Property tour (short) | prop-tour-2024-short | 1:15 | Instagram pinned reel, paid ads |
| Anna+Devin highlight | wed-anna-devin-oct-2024 | 4:12 | Wedding gallery, blog post on October weddings |
| Maddie+Sam highlight | wed-maddie-sam-sept-2024 | 5:30 | Full-weekend showcase, blog post on weekend format |

---

## 3. Written Content Inventory

### Blog posts
- **Total count:** 38 published posts
- **Date range:** 2019–present
- **Posting frequency:** Sporadic — averaged 2 posts/month in 2023-2024; dropped to ~1 post/quarter in 2025
- **Where they live:** audreysfarmhouse.com/blog/[slug]
- **Average word count per post:** ~1,200 words

| Post title | URL | Date | Word count | Topic / target keyword | Performance notes |
|---|---|---|---|---|---|
| A Guide to Hudson Valley Fall Weddings | /blog/hudson-valley-fall-weddings | 2024-09-01 | 1,800 | hudson valley fall wedding venue | Top-performing post; ranks page 1 for target keyword |
| What's Included in Our Wedding Weekend | /blog/wedding-weekend-included | 2024-06-15 | 1,400 | wedding venue weekend included | High-converting post; cited in inquiries |
| Choosing Between a Saturday and a Friday Wedding | /blog/saturday-vs-friday-wedding | 2024-04-22 | 1,100 | friday vs saturday wedding | Solid traffic, evergreen |
| The Case for In-House Catering | /blog/in-house-catering | 2023-11-10 | 1,500 | in house catering wedding venue | Strong differentiator content |
| October Light at Audrey's | /blog/october-light | 2023-10-05 | 900 | october wedding hudson valley | Photo-heavy, popular on social |
| [Continue for top 15...] | | | | | |

### Press / media features

| Source | Date | Type | Link | Use |
|---|---|---|---|---|
| Junebug Weddings | 2024-09 | Real wedding feature | [URL] | Feature on the homepage; cite in pitch decks |
| The Knot | 2024-06 | Vendor profile feature | [URL] | Cite in proposals as third-party validation |
| Brides Magazine | 2023 | Hudson Valley venue roundup | [URL] | Cite as press in proposals |
| Hudson Valley Magazine | 2022 | Local feature article | [URL] | Cite as local press |

### Awards and recognitions

- The Knot Best of Weddings winner — 2022, 2023, 2024 (badge displayed on website)
- WeddingWire Couples' Choice Award — 2022, 2023, 2024
- Hudson Valley Magazine "Best Wedding Venue" — 2023

### Newsletters / email content history

- **Email platform in use:** HoneyBook campaigns (basic) — recommend migration to Resend for richer functionality
- **Total subscribers:** ~1,400 (mostly past couples + some inquiry leads who opted in)
- **Sending cadence:** Dormant — last newsletter sent August 2024
- **Top-performing past emails:** "October Wedding Open House" (52% open rate), "Holiday Greeting + 2025 Calendar Preview" (44% open rate)

---

## 4. Testimonials and Reviews

### Review platforms in use
| Platform | Total reviews | Average rating | Last review date | Response rate |
|---|---|---|---|---|
| Google Business Profile | 87 | 4.9 | March 2026 | 95% |
| The Knot | 62 | 4.9 | February 2026 | 100% |
| WeddingWire | 41 | 4.9 | December 2025 | 100% |
| Junebug | 4 (real wedding features w/ couple notes) | N/A | 2024 | N/A |

### Best-of testimonials by theme

**Theme: In-house catering quality**

> "We had heard 'venue food' jokes our whole engagement, so we genuinely braced ourselves. Then dinner came out and it was, hands down, the best food at any wedding any of our guests had ever been to. People are still texting us about the short rib three months later."
> — Anna B., October 2024, Google
> **Use cases:** Catering page hero quote, social posts about food, blog posts about menu philosophy

> "The chef sat with us at our menu tasting and walked through every course. He suggested swaps we'd never have thought of based on what was going to be in season the week of our wedding. It felt like having a private dinner planned by someone who actually cooks for a living."
> — Maddie F., September 2024, The Knot
> **Use cases:** Chef-focused content, menu tasting blog post, planning timeline content

**Theme: The on-site coordinator (Megan)**

> "Megan ran our wedding day end to end. Every problem that almost happened — and there were several, including a vendor running 90 minutes late — was solved before we knew about it. We didn't carry a single worry from 4pm until the end of the night."
> — Lauren D., June 2024, Google
> **Use cases:** Day-of-coordination content, what's-included content, "why us vs. other venues" content

> "I had a planner for the rest of the planning process, but on the day, Megan was the one I trusted. She knew the property, knew the vendors, knew where the bathrooms were, and somehow knew exactly when I needed water versus when I needed a moment alone."
> — Sarah K., May 2024, The Knot
> **Use cases:** Coordination content, comparison-to-outside-planner content

**Theme: The lodging and weekend format**

> "Having all our family and friends staying on property turned a wedding into a three-day vacation. Our parents had breakfast together for the first time. Our cousins from both sides got to hang out by the fire pit. We went into the wedding actually relaxed because we'd already had a whole day of just being with everyone."
> — James T., July 2024, Google
> **Use cases:** Weekend format content, lodging-focused content, "why include the rehearsal dinner" content

> "We booked the cottage rooms for our parents and immediate family and ended up booking the carriage house for the wedding party. It cost more than we'd planned to spend on lodging but it was the best money we spent on the whole wedding."
> — Devin R., October 2024, Google
> **Use cases:** Lodging upsell content, weekend format ROI content

**Theme: The property and atmosphere**

> "We toured nine venues in the Hudson Valley before Audrey's. The other eight were beautiful. This was the first one that felt like a place we'd want to actually stay at, even without a wedding."
> — Olivia M., August 2023, Google
> **Use cases:** Property and atmosphere content, comparison to other Hudson Valley venues

> "There's a particular light that happens on the ceremony lawn around 4:45 in October. Our photographer mentioned it on the tour. We saw it on our wedding day. The photos are unreal."
> — Anna B., October 2024, Google
> **Use cases:** October wedding content, photography-focused content, ceremony lawn content

**Theme: The booking and planning experience**

> "Joshua [the booking coordinator — note: different Joshua from the consultant] gave us a real number on our first email. No 'let's hop on a call to discuss pricing.' Just 'here's what your date costs, here's what's included, here's what's not.' That alone moved Audrey's to the top of our list."
> — Lauren D., June 2024, The Knot
> **Use cases:** Sales process content, transparency content, comparison to opaque-pricing competitors

### Common themes Joshua identified

After reading 90+ reviews:

1. **In-house catering quality** — mentioned in 65% of reviews. The single most-praised element.
2. **Megan's day-of coordination** — mentioned in 50% of reviews. Often by name.
3. **The weekend format and on-site lodging** — mentioned in 45% of reviews. Often described as "what set Audrey's apart."
4. **Transparency in pricing and booking process** — mentioned in 30%. Often as a contrast to other venues toured.
5. **The kitchen and Sunday brunch ritual** — mentioned in 25%. Specific moment couples remember.

### Critical reviews and lessons

| Critique | Frequency | Already addressed? | Notes |
|---|---|---|---|
| 11pm noise curfew felt strict | 4 reviews over 24 months | Partially — flagged in contract | Could be addressed more explicitly in pre-wedding planning communication |
| Lodging beyond farmhouse expensive | 3 reviews | No | Framed in pricing materials but not emphasized as choice for guests vs. couple |
| Limited menu flexibility for very specific dietary requests (kosher, halal) | 2 reviews | Partially | Honestly capped capability; should be flagged earlier |

### Quotes from non-platform sources

> "I've planned weddings at probably 30 venues in the Hudson Valley. Audrey's is in my top three for one reason: when I tell my couples something, I know it's going to happen. Megan delivers."
> — [Planner name], full-service wedding planner, March 2025 referral email

> "Tell Joshua I sent you. The food alone is worth driving up from the city. Don't even bother touring anywhere else first — you'll just waste a Saturday."
> — Past couple, paraphrased from a referral email she forwarded with permission, January 2026

---

## 5. Visual Brand Assets

### Logos
- **Primary logo file:** `audreys-logo-primary.svg` (in Cloudinary brand folder)
- **Secondary / alternate logos:** `audreys-logo-mark.svg` (icon only)
- **Logo on dark background variant:** `audreys-logo-light.svg`
- **Logo on light background variant:** `audreys-logo-dark.svg`
- **Usage rules:** Minimum size 80px wide. Always include 24px clearspace.

### Color palette
| Color name | Hex | RGB | Use case |
|---|---|---|---|
| Cream | #F4EFE6 | 244,239,230 | Primary background, large surfaces |
| Forest | #2C3E2D | 44,62,45 | Headings, accents, primary text |
| Rust | #B0552B | 176,85,43 | CTAs, highlights, links |
| Stone | #6B6358 | 107,99,88 | Secondary text, borders |

### Typography
- **Heading typeface:** Cormorant Garamond, weights 400 and 500 (Google Fonts)
- **Body typeface:** Inter, weights 400 and 500 (Google Fonts)
- **Accent typeface:** None
- **Font usage rules:** Cormorant for H1-H3 only. Inter for body and small UI. No display fonts beyond Cormorant.

### Existing brand guidelines document
None formal. This document and the website serve as the de facto reference. Recommend formalizing as part of any rebrand or website refresh.

### Templates and design files
- **Email signature template:** Standard text-only signature in Gmail
- **Proposal template:** HoneyBook proposal template (visual brand applied)
- **Social post templates:** Canva folder shared with team — ~12 templates for common post types
- **Print collateral templates:** Pricing one-pager (PDF), tour leave-behind (printed)

---

## 6. Vendor and Partner Network

### Photographers who have shot here
| Photographer | Instagram | # of shoots | Usage rights | Tag in posts? |
|---|---|---|---|---|
| Joshua Brown Photography | @joshuabrownphotography | 18+ | Full commercial use granted | Always |
| [Photographer 2] | [@handle] | 8 | Social use with credit; print use requires permission | Always |
| [Photographer 3] | [@handle] | 6 | Social use with credit | Always |
| [Photographer 4] | [@handle] | 4 | Social use with credit; no commercial use | Always |
| [Photographers 5-12] | [@handles] | 1-3 each | Social use with credit; ask for any other use | Always |

### Preferred vendor list
| Vendor | Category | Relationship strength | Permission to feature publicly? |
|---|---|---|---|
| [Florist 1] | Florist | 4 years, 20+ weddings together | Yes, with credit |
| [Florist 2] | Florist | 3 years, 15+ weddings | Yes, with credit |
| [Florist 3] | Florist | 2 years, 8 weddings | Yes, with credit |
| [DJ 1] | Music | 5 years, 30+ weddings | Yes, with credit |
| [Band] | Music (live) | 3 years | Yes, with credit |
| [Officiant 1] | Officiant | 4 years | Yes, with credit |
| [Officiant 2] | Officiant | 2 years | Yes, with credit |
| [Planner 1] | Wedding planner | 5 years, ongoing referrals | Yes, with credit |
| [Planner 2] | Wedding planner | 3 years | Yes, with credit |

### Partner businesses
- [Local hotel] — overflow lodging partner for couples with 80+ guests needing rooms
- [Bus company] — preferred shuttle service from local hotels and Beacon train station
- [Cake studio] — referred for couples wanting custom cakes

### Industry associations and memberships
- The Knot Pro member (paid)
- WeddingWire vendor (paid)
- Hudson Valley Wedding Professionals Association

---

## 7. Content Themes and Editorial Patterns

### Top-performing content themes (historical)

| Theme | Evidence | Why it likely works |
|---|---|---|
| Hudson Valley fall weddings | Top blog post (8K views/year), top-engaging Instagram posts in October | Aligns with peak season, search demand peaks in fall |
| In-house catering | 1,400-word blog post pulls 200 visits/month, food posts on Instagram outperform other content | Differentiator; couples are actively searching for venues that don't require BYO catering |
| Weekend format and lodging | Blog post on this is the second-most-cited page in inquiry conversations | Differentiator that couples are seeking but don't have a clear search query for |

### Underused themes the business should be covering

- The off-season (December-March) — almost no content despite being a lower-volume period when couples plan ahead for next year
- The team behind the property (Megan, the chef, the booking coordinator) — humanizes the brand
- The history of the property and the family — light coverage despite being part of the brand identity
- Couples planning weekends from out of state — a major customer segment with under-served content

### Recurring content formats that work

- Real wedding feature blog posts (~1,500 words, 30+ photos, vendor credits)
- "Behind the scenes" or "what's included" explanatory blog posts
- Instagram carousels of single weddings (8-10 photos)
- Instagram Reels of property b-roll set to music

### Content series

- **Existing:** "Real Weddings at Audrey's" — irregular, ~6 published per year
- **Proposed:** "Behind the Kitchen" — chef-focused content series; quarterly long-form blog + monthly Instagram content
- **Proposed:** "What to Expect" — series targeting couples in early planning who are researching what a weekend wedding looks like

### Hashtag and tag strategy notes
- **Branded hashtags:** #audreysfarmhouse, #audreysweddings
- **Local/regional hashtags used:** #hudsonvalleywedding, #catskillswedding, #upstateny wedding
- **Industry hashtags used:** #realwedding, #weddinginspo (judiciously)
- **Accounts regularly tagged:** Photographer, planner (if applicable), florist, DJ/band, the couple

---

## 8. Content Production Capacity

### Who creates content currently
- **Writing:** Owner writes occasional blog posts; booking coordinator writes some social captions; no dedicated writer
- **Photography:** All commercial shoots hired (Joshua Brown Photography for property and food); event photos come from couple-hired wedding photographers
- **Video:** Hired pros for production work; no in-house video capability
- **Social posting:** Booking coordinator posts to Instagram in bursts; no consistent calendar; some scheduling via Later, mostly manual

### Time budget per week / month
- Owner: ~2-4 hours per month on content (when remembered)
- Coordinator: ~3-5 hours per week on social and inquiry-related content
- Total: ~25-30 hours per month, very inconsistent

### Tools currently used
- Canva (social templates)
- Lightroom (owner edits some property phone photos)
- Later (intermittent social scheduling)
- HoneyBook (email content)

### What the business is willing to invest in going forward
- Quarterly content shoots with Joshua Brown Photography (already in plan)
- One ongoing monthly content partnership / retainer is being considered
- Open to outsourcing blog writing if voice can be maintained

### Production gaps that limit content strategy
- No consistent video production capability
- No dedicated writer for blog posts at consistent cadence
- No dedicated social manager for daily-cadence posting
- No formalized content calendar — posts go out when remembered

---

## 9. Content Inventory Gaps and Production Priorities

### Critical gaps

- **No 2026 property tour video.** Current is from 2024. Property has had subtle changes (cottage refresh) and the video should be re-shot for the 2026 calendar year content push.
- **No dedicated food and beverage shoot.** In-house catering is the #1 differentiator and the food photography library is thin compared to the importance of the topic.
- **No team-focused photography or video.** Megan is named in 50% of reviews but she's not on the team page beyond a name and one headshot. The chef is similarly under-photographed despite being a cited differentiator.

### High-value gaps

- Spring (April-May) property exterior shoot
- Lodging refresh shoot post-2025 cottage updates
- Behind-the-scenes content of an actual wedding setup day
- Off-season atmospheric content (snow, fall, early spring)
- Chef interview video for the "Behind the Kitchen" series

### Production priorities for the next 90 days

1. **Refresh the property tour video.** Two-day shoot with Joshua Brown Photography. Output: long version (4-5 min) for website, short version (60 sec) for Instagram. Estimated turnaround: 2 weeks.
2. **Dedicated food and beverage shoot.** Half-day shoot in the kitchen plus styled plating shoot. Output: 30-50 hero food photos for the catering page, social, and blog content. Estimated turnaround: 2 weeks.
3. **Team photography session.** Half-day on-site shoot with Megan, the chef, the booking coordinator, and the owner. Output: updated headshots, lifestyle team shots for the about page, social content. Estimated turnaround: 1 week.

### Content audit findings

- The blog has 38 posts but ~12 are outdated (referencing old pricing, previous staff, discontinued offerings) and should be updated or archived.
- The Instagram bio links to a Linktree that includes 4 dead links.
- The press section of the website hasn't been updated since 2023; the 2024 Junebug feature isn't there.
- The "Real Weddings" gallery on the website is missing 2024 and 2025 weddings — the most recent featured wedding is from October 2023.

---

## End of Worked Example

The example above is a complete reference Content Library and Asset Inventory. Use this as the quality bar for any new client. The strongest indicator of a thorough job: Section 4 (Testimonials) is curated, not dumped, and Section 9 (Gaps) includes 3+ specific production priorities that could become invoiceable add-on work.
