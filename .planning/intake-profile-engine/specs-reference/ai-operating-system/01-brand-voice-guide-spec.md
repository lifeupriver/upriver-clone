# Document Production Spec 01: Brand Voice Guide

## What This Spec Is

This is the production specification for Document 1 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what questions to ask the client to fill it out, and how to know when it's done.

The Brand Voice Guide is the foundational document. Every other document in the suite inherits from it. Every piece of AI-generated content the client ever produces will reference it. If this document is wrong or thin, everything downstream is worse.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 01 of 12 |
| **Priority** | Critical (everything depends on this) |
| **Total length target** | 2,000-4,000 words |
| **Total time to produce** | 3-4 hours |
| **Joshua's time** | 1.5-2 hours |
| **Claude's time** | 30-45 minutes |
| **Client's time** | 45-60 minutes (discovery call + review) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge |
| **File naming convention** | `[client-slug]-01-brand-voice.md` (e.g., `audreys-farmhouse-01-brand-voice.md`) |
| **Foundation for** | Documents 7 (Email Templates), 8 (Social Media Playbook), 11 (Website Audit), and every AI prompt the client ever runs |

---

## When This Document Gets Built

**Phase 1 of engagement, Week 1.** This is the first document built. Nothing else gets started until this is at least in draft form.

**Triggers:** Discovery call complete, onboarding questionnaire submitted, website and social audit done.

**Blocks:** All content generation (social, email, blog, chatbot prompts) until this exists in at least draft form.

---

## Section-by-Section Template

The finished document follows this exact structure. Every section is required unless flagged optional.

### Header Block

```markdown
# [Business Name] Brand Voice Guide

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**For:** All content creation, AI-generated content, social media, email marketing, website copy, review responses, and staff communications

**Companion documents:**
- Document 02: Business Facts Reference (factual accuracy)
- Document 07: FAQ and Common Questions Bank (pre-approved answers)
- Document 08: Email and Communication Templates (applied voice in email)
- Document 09: Social Media Playbook (applied voice in social)

**How to use this document:** Load this into your Claude Project. Reference it before generating any content. When in doubt about how something should sound, return to this document.
```

**Word count:** 80-120 words. Always include companion document references so the client and any AI sees the dependency map.

---

### Section 1: Identity Statement

**Purpose:** A single paragraph that captures who the business is, who it serves, and why it exists. This paragraph gets pasted into the system prompt of every AI tool the client uses. It's the anchor.

**Word count target:** 80-150 words. One paragraph. No bullet lists.

**Required elements:**
- Business name and category (e.g., "boutique wedding venue," "residential general contractor")
- Geographic location and service area
- Primary customer / who it serves
- One sentence on what makes this business different
- One sentence on the experience or outcome the business delivers

**Industry adaptation:**
- **Wedding venue:** Lead with the venue's character (architecture, setting, vibe), then the type of couple it serves.
- **Contractor:** Lead with the type of work and quality positioning, then the type of homeowner it serves.
- **Preschool:** Lead with the educational philosophy, then the type of family it serves.
- **Restaurant:** Lead with the cuisine and atmosphere, then the type of diner it serves.
- **Professional services:** Lead with the discipline and approach, then the type of client it serves.
- **Hospitality (boutique hotel, retreat center):** Lead with the property and experience, then the type of guest it serves.

**How it appears in the document:**

```markdown
## 1. Identity Statement

[Single paragraph, 80-150 words.]
```

---

### Section 2: Voice Attributes

**Purpose:** Three to five named attributes that describe how this business sounds. Each attribute gets a definition, a positive example, and an anti-example so AI tools and human writers can pattern-match.

**Word count target:** 400-700 words total (roughly 100-150 per attribute).

**How many attributes:**
- **3 attributes** for businesses with a tightly defined voice (most contractors, most professional services)
- **4 attributes** for most businesses (default)
- **5 attributes** only for hospitality, venues, restaurants, or any business where atmosphere and personality are core to the product

**Required structure for each attribute:**

```markdown
### Attribute [N]: [Single Word or Two-Word Name]

**What this means:** [One to two sentences defining the attribute in plain language. Avoid jargon. A new employee should be able to read this and understand it.]

**How it sounds:** "[Example sentence in this voice. Real-sounding, not generic. Should be something the business would actually say or write.]"

**What to avoid:** "[Anti-example. A sentence that sounds wrong for this business. Often the generic industry version of the example above.]"
```

**How to name attributes well:**
- **Good:** "Direct," "Quietly Confident," "Warm but not Precious," "Practical," "Knowledgeable Neighbor"
- **Bad:** "Authentic," "Premium," "Innovative," "Passionate" (these are generic and give AI nothing to work with)

The test: if you swap the business name for a competitor's name and the attribute still applies, the attribute is too generic.

**Industry adaptation:**
- **Wedding venue:** Attributes often include atmosphere words (Warm, Effortless, Grounded). Avoid: Magical, Stunning, Special.
- **Contractor:** Attributes often include trust words (Straightforward, Knowledgeable, Reliable). Avoid: Premium, Excellence, Quality (overused).
- **Preschool:** Attributes often include warmth + competence (Warm, Steady, Curious). Avoid: Nurturing, Loving, Caring (every preschool says this).
- **Restaurant:** Attributes often include cuisine + atmosphere (Seasonal, Unfussy, Lively). Avoid: Authentic, Farm-to-table, Elevated.
- **Professional services:** Attributes often include posture (Plain-spoken, Rigorous, Practical). Avoid: Trusted, Expert, Innovative.

**How it appears in the document:**

```markdown
## 2. Voice Attributes

The way this business sounds rests on [3-5] attributes. Every piece of content should reflect at least two of these. Content that reflects all of them is the strongest signal of the brand.

### Attribute 1: [Name]
[As specified above.]

### Attribute 2: [Name]
[As specified above.]

[Continue for all attributes.]
```

---

### Section 3: Tone Spectrum

**Purpose:** A position on four sliders that tells AI tools and writers where this business sits on common voice axes. Useful for resolving ambiguity ("should this be funnier? more formal?").

**Word count target:** 200-300 words total.

**The four required spectrums:**

1. **Formal ←→ Casual**
2. **Serious ←→ Playful**
3. **Traditional ←→ Modern**
4. **Understated ←→ Bold**

**Required format for each:**

```markdown
**[Spectrum name]:** [Position description, e.g., "Lean casual" or "Strongly traditional" or "Middle, slightly formal."]
- What this looks like: [One sentence on how this shows up in writing.]
- Where this might break: [One sentence on the situation where the business should shift, e.g., "Lean more formal in contract communications" or "Lean more playful in Instagram captions."]
```

**Optional fifth spectrum (use only when relevant):**

5. **Restrained ←→ Effusive** (for hospitality and creative businesses where emotional warmth varies)

**How it appears in the document:**

```markdown
## 3. Tone Spectrum

These four (sometimes five) sliders calibrate the voice when you're not sure how something should land.

[Each spectrum, formatted as specified.]
```

---

### Section 4: Operating Modes

**Purpose:** Most businesses have two distinct voices depending on the audience. Marketing audiences (cold prospects on the website, social media followers) get one voice. Active customers (in the inquiry-to-close window or post-purchase) get a related but different voice. This section makes that distinction explicit.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 4. Operating Modes

The voice has two modes. Use the right one for the audience.

### Marketing Mode

**Audience:** [Who this voice talks to — e.g., "Couples in the early-research stage browsing the website or Instagram"]

**Where it shows up:** [List of channels — website, social, blog, paid ads, brochures]

**What's different about this mode:** [Two to three sentences. Usually: more atmospheric, more about painting a picture, more about why this business exists, less transactional.]

**Sample line in this mode:** "[A real-sounding marketing-mode sentence.]"

### Client Mode

**Audience:** [Who this voice talks to — e.g., "Couples who've inquired and are in the booking conversation, or current clients"]

**Where it shows up:** [List of channels — inquiry email replies, follow-ups, contract emails, post-booking communication, day-of coordination]

**What's different about this mode:** [Two to three sentences. Usually: warmer, more direct, more practical, faster to give specifics like price and dates, more first-person.]

**Sample line in this mode:** "[A real-sounding client-mode sentence.]"
```

**Industry adaptation:**
- **Wedding venue:** Marketing Mode is dreamy and atmospheric; Client Mode is direct, helpful, and fast with specifics (couples in booking conversations want answers, not poetry).
- **Contractor:** Marketing Mode emphasizes craftsmanship and reliability; Client Mode is logistical, clear about timelines and money.
- **Preschool:** Marketing Mode emphasizes philosophy and outcomes; Client Mode is warm but operational (pickup, sick days, schedule changes).
- **Restaurant:** Marketing Mode emphasizes seasonality, chef, atmosphere; Client Mode (reservations, private events) is brisk and confirmatory.
- **Professional services:** Marketing Mode emphasizes thinking and approach; Client Mode is direct, deadline-oriented, and specific.

---

### Section 5: Vocabulary — Words and Phrases to Use

**Purpose:** A working vocabulary that AI tools and human writers should pull from. Not every word a business uses, but the ones that feel distinctly theirs.

**Word count target:** Variable — 30-60 entries, formatted as a list with brief notes.

**What to include:**
- Words and phrases the business uses naturally
- Industry-specific terms that fit the brand voice
- Geographic or local references that ground the business (e.g., "Hudson Valley," "the Catskills," "the river")
- Phrases the owner uses when describing the business
- Words that came up repeatedly in the discovery conversation

**Required format:**

```markdown
## 5. Vocabulary — Use These

### Descriptive language for the business itself
- [Word or phrase] — [optional brief note on when to use]
- [Word or phrase]

### Words for the customer / experience
- [Word or phrase]
- [Word or phrase]

### Local or category-specific language
- [Word or phrase]
- [Word or phrase]

### Phrases that capture how the owner talks
- "[Direct quote or near-quote from discovery]"
- "[Direct quote or near-quote from discovery]"
```

**Pulling these from discovery:** During the discovery call, write down phrases the owner says verbatim. The strongest entries here are direct quotes from the owner reframed slightly for general use.

---

### Section 6: Vocabulary — Words and Phrases to Avoid

**Purpose:** Equally important. Tells AI tools what NOT to generate. This section prevents 80% of generic AI output.

**Word count target:** 200-400 words.

**Required categories:**

```markdown
## 6. Vocabulary — Avoid These

### Industry clichés
[Words and phrases that have been so overused in this industry that they're meaningless. Examples below.]

### Generic marketing language
[Words and phrases that could appear on any business's website. The "so what" test: if removing the word doesn't change the meaning, it's marketing filler.]

### AI writing tells
[Words and phrases that signal AI-generated content. Site-wide bans.]

### Business-specific avoids
[Things this specific business doesn't want to say. Could be competitor language, could be a word the owner has personal feelings about, could be regional or cultural sensitivities.]
```

**Default site-wide bans (apply to every Brand Voice Guide regardless of industry):**

- Stunning, magical, transform, elevate, unlock, seamlessly, robust, synergy, game-changer, leverage, curated (overused), best-in-class, world-class, premier, luxurious (when not literally true), passionate, dedicated, experienced (without specifics), proven, results-driven
- "Look no further"
- "Whether you're [X] or [Y], we have you covered"
- "We pride ourselves on..."
- "At [Business Name], we believe..."
- Any sentence that starts with "In today's [adjective] world,"
- Em dashes (Joshua's site-wide rule, applies to all client work too)

**Industry-specific banned-word additions:**

- **Wedding venue add-ons:** "Special day," "magical moments," "fairytale," "elegant" (overused), "dream wedding," "tied the knot," "your love story"
- **Contractor add-ons:** "One-stop shop," "no job too big or too small," "we treat your home like our own," "honest and reliable" (every contractor says this)
- **Preschool add-ons:** "Nurturing environment," "where children thrive," "loving, caring teachers," "our little learners," "second family"
- **Restaurant add-ons:** "Farm-to-table" (use only if literally true and tied to specific farms by name), "elevated," "carefully crafted," "passion for food"
- **Professional services add-ons:** "Trusted advisor," "thought leader," "industry-leading," "comprehensive solutions"

---

### Section 7: Anti-AI Writing Rules

**Purpose:** Specific construction-level rules that prevent the most common AI tells. This is more granular than the banned-word list.

**Word count target:** 250-400 words.

**Default rules (apply to every client):**

```markdown
## 7. Anti-AI Writing Rules

These are construction-level rules. Every piece of content this business publishes should pass these checks.

### No throat-clearing openers
Don't start with "In today's fast-paced world," "When it comes to [X]," "It's no secret that," or any variation. Start with the point.

### No three-item lists where two will do
"Beautiful, elegant, and refined" → "Beautiful and refined." If two items make the point, use two. Three is the AI default; resist it.

### No em dashes
Site-wide rule. Use a period or a comma. Never an em dash.

### No "not just X but Y" constructions
"Not just a venue, but an experience" type sentences. Banned.

### No bullet-point soup in place of paragraphs
Real prose paragraphs of 2-4 sentences carry voice better than bulleted fragments. Use bullets only when the content is genuinely a list.

### Vary sentence length
Three medium-length sentences in a row is the AI default. Break the pattern. Short sentence. Then a longer one that develops the thought further. Then short again.

### Lead with the specific, not the general
"We host weddings of 75 to 200 guests on a 40-acre farm in the Catskills" beats "We host beautiful weddings in a stunning location."

### Real numbers beat adjectives
"22 minutes from the train" beats "convenient to the city." "12 years of business" beats "experienced." "94 reviews averaging 4.9" beats "loved by clients."

### Acknowledge trade-offs when relevant
Pure positive language reads as marketing. Naming a real limitation builds trust. "Outdoor ceremonies are weather-dependent and we have a covered backup space" is stronger than "Beautiful outdoor and indoor ceremony options."

### No emoji in any client-facing copy
Site-wide rule across all clients.
```

**Industry adaptations:** Add 2-3 industry-specific anti-rules where relevant. Example for wedding venue: "Don't write about the couple's emotional state ('your most important day,' 'the love of your life'). Let the couple bring that. The venue's job is to be specific about what it provides."

---

### Section 8: Sample Content

**Purpose:** Five worked examples showing the voice in actual use. These are reference patterns AI tools and human writers can mimic.

**Word count target:** 400-700 words across all five samples.

**Required samples:**

```markdown
## 8. Sample Content

### Sample 1: Social Media Caption (event highlight)
**Context:** [One sentence describing what the post is about.]

**Caption:**
"[The actual caption, written in voice. Length matches platform — Instagram caption typically 60-150 words, with line breaks for rhythm.]"

### Sample 2: First Reply to a New Inquiry
**Context:** [One sentence — e.g., "Couple has filled out the contact form asking about a Saturday in October 2026."]

**Email:**
[Full email including subject line and signoff.]

### Sample 3: Blog Post Opening Paragraph
**Context:** [Topic and target keyword.]

**Opening:**
[2-3 paragraph opening that demonstrates voice and pulls the reader in without throat-clearing.]

### Sample 4: Positive Review Response
**Context:** [Brief description of what the review said.]

**Response:**
[Full response, 50-100 words.]

### Sample 5: Negative or Critical Review Response
**Context:** [Brief description of the criticism.]

**Response:**
[Full response, 75-150 words. Should acknowledge, address without defensiveness, offer to take the conversation private if appropriate.]
```

**Industry swaps for samples:**

| Industry | Sample 1 | Sample 2 | Sample 3 |
|---|---|---|---|
| Wedding venue | Wedding highlight reel | Inquiry from couple | Blog post on planning topic |
| Contractor | Project before/after | Estimate request | Blog post on common project type |
| Preschool | Classroom moment / event | Tour request from parent | Blog post on educational topic |
| Restaurant | Dish or chef feature | Private event inquiry | Blog post on seasonal menu |
| Professional services | Client win or insight | New client inquiry | Blog post on industry topic |

---

### Section 9: Key Facts Block for AI Prompts

**Purpose:** A copy-paste block that can go into any AI prompt to ground the model in this business's reality. This is what AI tools reference when generating content.

**Word count target:** 200-400 words. Structured, not prose.

**Required format:**

```markdown
## 9. Key Facts Block for AI Prompts

Copy this block into any AI prompt about this business to ground the output in reality.

```
BUSINESS: [Name]
CATEGORY: [Wedding venue / contractor / preschool / etc.]
LOCATION: [City, state, region]
SERVICE AREA: [Geographic radius or specific markets]
ESTABLISHED: [Year]
OWNER / KEY PEOPLE: [Names and roles]
WHAT THEY DO: [One sentence]
WHO THEY SERVE: [Customer description in 1-2 sentences]
PRICE POSITION: [Budget / mid-market / premium / luxury, with rough range if shareable]
KEY DIFFERENTIATORS:
- [Differentiator 1]
- [Differentiator 2]
- [Differentiator 3]
SEASONALITY: [If relevant — peak / off / blackout]
KEY NUMBERS: [Capacity, volume, team size, years in business — whatever is concrete]
WEBSITE: [URL]
INSTAGRAM: [@handle if relevant to industry]
GOOGLE BUSINESS PROFILE: [URL if relevant]
```
```

This block is what differentiates a Claude Project that produces accurate output from one that hallucinates. Every fact in the block should be verifiable against Document 02 (Business Facts Reference).

---

## How to Build This Document

The full process, in order. Total time: 3-4 hours including client time.

### Step 1: Pre-Discovery Prep (30 minutes, Joshua only)

Before the discovery call:

1. Read the onboarding questionnaire response
2. Browse the website front to back
3. Read the last 10-20 Instagram captions
4. Read 5-10 Google reviews (look for the language customers use)
5. Read 1-2 competitor websites (note the generic industry voice this business should NOT sound like)
6. Note 3-5 specific questions to ask the owner that the questionnaire didn't cover

### Step 2: Discovery Conversation (45 minutes, Joshua + client)

Run as a recorded call. Use these questions in this order:

**Identity questions (10 min):**
1. How would you describe this business to a friend at a dinner party? Not a customer pitch — how you actually talk about it.
2. What's the one thing customers say after they work with you that you're proudest of?
3. If you had to pick one competitor, who do you not want to sound like? Why?
4. What's the thing about your business that's true but hard to say in marketing language?

**Voice questions (15 min):**
5. Read me a recent review that sounds exactly like you would describe yourself.
6. Now read me one that doesn't — even if it's positive.
7. Show me a recent email you sent to a customer. Walk me through why you wrote it that way.
8. What words do you find yourself using a lot when you talk about the business?
9. What words do you actively avoid? Even if other businesses in your space use them?

**Customer questions (10 min):**
10. Describe your favorite customer from the last year. Not the highest-paying one — the one who got it.
11. Describe a customer who wasn't a fit. What made them not a fit?
12. What does a customer typically not know coming in that you wish they did?

**Mode questions (5 min):**
13. Walk me through how you talk to a brand-new prospect vs. a customer who's already booked. What changes?
14. Where do you feel most yourself in your communications — Instagram? Email? In person?

**Closing (5 min):**
15. Anything I haven't asked that I should know to write for your business in your voice?

### Step 3: Website + Social Audit (30 minutes, Joshua)

After the call, with notes in hand:

1. Pull 10-15 sentences from the existing website that sound right
2. Pull 5-10 sentences that sound generic or wrong
3. Pull 5-10 captions or DMs that sound right
4. Pull 5-10 reviews where the customer's language matches the brand
5. Note any words or phrases that came up in 3+ places

### Step 4: Competitor Voice Scan (20 minutes, Joshua)

Read 2-3 competitor websites. Make a list of:
- Generic phrases the competitors use that this business should NOT use
- Any positioning the competitors own that this business needs to avoid copying
- Voice patterns that are common in this industry that this business can stand out by avoiding

### Step 5: Draft Generation (30-45 minutes, Claude)

In the consulting Claude Project, run the following prompt:

```
Generate a Brand Voice Guide for [Business Name] using the structure from Document Production Spec 01. Source materials are below.

[Paste: discovery call transcript or detailed notes]

[Paste: website voice samples — both right-sounding and wrong-sounding]

[Paste: social media samples]

[Paste: review samples with customer language]

[Paste: competitor voice notes — what to avoid sounding like]

[Paste: completed onboarding questionnaire]

Output the full document following the spec exactly. Use the worked example in the spec as a quality reference. Industry: [industry].
```

Claude produces the draft. Joshua reviews.

### Step 6: Joshua Review and Refinement (45-60 minutes)

Read the full draft. For each section, check:

- Does the Identity Statement sound like the owner described the business, not like a marketing brochure?
- Are the Voice Attributes specific enough that swapping in a competitor's name would make them not fit?
- Do the sample sentences in the attributes sound real, or generic?
- Is the Tone Spectrum positioning consistent with what the owner said?
- Are the Operating Modes distinct, or do they blur?
- Is the Vocabulary list pulled from the owner's actual language, or invented?
- Are the Anti-AI Writing Rules complete and industry-appropriate?
- Do the Sample Content pieces actually sound like the brand?
- Is the Key Facts Block accurate (cross-check against questionnaire)?

Edit directly. Don't accept Claude's draft as final without at least 30 minutes of human editing.

### Step 7: Client Review (30 minutes client time, async)

Send to client with this email:

```
Subject: Your Brand Voice Guide — review and feedback

Attached / linked: your Brand Voice Guide draft.

This is the foundation for everything we'll build next. It's what every AI tool, every email template, every blog post, and every social caption will reference.

Please read all of it, but pay closest attention to:

1. The Identity Statement (Section 1). Does this sound like how you'd describe your business?
2. The Voice Attributes (Section 2). Do these feel right? Are any of them off?
3. Sample Content (Section 8). If these sound like you, we're good. If they sound like a different business, tell me which one and why.

Reply with line-edits, replacements, or "looks good." Once you sign off, this becomes the source of truth.
```

### Step 8: Final Edits and Delivery (15-30 minutes)

Apply client feedback. Save final version with `[client-slug]-01-brand-voice-v1.0.md` filename. Upload to client's Claude Project as knowledge.

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] Identity Statement is 80-150 words, reads like the owner talking, includes all required elements
- [ ] 3-5 Voice Attributes, each with name + meaning + how-it-sounds + what-to-avoid
- [ ] Tone Spectrum covers all 4 required axes (and 5th if hospitality/creative)
- [ ] Operating Modes section distinguishes Marketing Mode and Client Mode with sample lines for each
- [ ] Vocabulary "Use These" list has 30-60 entries pulled from real discovery
- [ ] Vocabulary "Avoid These" includes site-wide bans + industry-specific bans + business-specific bans
- [ ] Anti-AI Writing Rules section includes the default rules + 2-3 industry-specific additions
- [ ] All 5 Sample Content pieces are written and sound like the brand
- [ ] Key Facts Block is complete and cross-checked against the onboarding questionnaire
- [ ] Client has reviewed and approved
- [ ] File is saved with the correct naming convention and uploaded to the client's Claude Project
- [ ] Total document length is between 2,000 and 4,000 words

---

## Common Failure Modes

When this document is wrong, it's usually because of one of these:

**Failure 1: Generic Voice Attributes.** "Authentic, Professional, Welcoming" applies to every business in the industry. The Brand Voice Guide is useless. Fix: name attributes that would feel wrong if applied to a direct competitor.

**Failure 2: Identity Statement reads as marketing copy.** If the paragraph could appear on a competitor's website with the name swapped, it's wrong. Fix: rewrite using language the owner actually used in the discovery call.

**Failure 3: Sample Content is too short or too generic.** AI tools mimic the samples. If the samples are weak, all generated content is weak. Fix: spend 20+ minutes per sample. Make them as good as the best content the business has ever published.

**Failure 4: "Avoid These" list is too short.** Default vocabulary list of 8 banned words is the floor, not the ceiling. Fix: add at least 10 industry-specific bans and at least 5 business-specific bans.

**Failure 5: No Operating Modes.** A single voice doesn't work for both cold marketing and active customer communication. Fix: always include both modes, even if the difference is subtle.

**Failure 6: Owner sees the draft and says "this could be any wedding venue / contractor / preschool."** That's the worst feedback to get. It means the discovery wasn't deep enough. Fix: go back to discovery with more specific questions, find the things that are actually unique.

---

## Worked Example: Audrey's Farmhouse Brand Voice Guide

The following is a complete sample of what a finished Brand Voice Guide looks like. Use this as a pattern reference when building one for a new client.

---

# Audrey's Farmhouse Brand Voice Guide

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**For:** All content creation, AI-generated content, social media, email marketing, website copy, review responses, and staff communications

**Companion documents:**
- Document 02: Business Facts Reference (factual accuracy)
- Document 07: FAQ and Common Questions Bank (pre-approved answers)
- Document 08: Email and Communication Templates (applied voice in email)
- Document 09: Social Media Playbook (applied voice in social)

**How to use this document:** Load this into your Claude Project. Reference it before generating any content. When in doubt about how something should sound, return to this document.

---

## 1. Identity Statement

Audrey's Farmhouse is a boutique multi-venue hospitality property in the Catskills foothills, an hour and a half from Manhattan, that hosts weddings of 80 to 180 guests across a working farmhouse, a restored barn, and 23 on-site guest rooms. We host couples who care more about the room being full of the right people than the room being big, and who'd rather the food be good than the centerpieces tall. The weekend feels like staying at a friend's family property in the country, except the friend's family happens to know how to throw a wedding.

---

## 2. Voice Attributes

The way Audrey's Farmhouse sounds rests on four attributes. Every piece of content should reflect at least two. Content that reflects all four is the strongest signal of the brand.

### Attribute 1: Grounded

**What this means:** We talk about real things. The room, the food, the trees, the schedule, the price, the catch. We don't lean on atmosphere words to do work that specifics could do better.

**How it sounds:** "The barn holds 180 seated. The ceremony lawn faces west, so we ask couples to plan for late-afternoon light. The kitchen is in-house and we don't bring in catering."

**What to avoid:** "Step into a magical world where every detail is curated to perfection."

### Attribute 2: Warm but not Precious

**What this means:** We're hospitable. We care about the couples and the families. But we don't perform warmth, and we don't treat the wedding as sacred — we treat it as a really good party that we're good at hosting.

**How it sounds:** "Most of our couples end up in the kitchen at some point during the weekend. We don't discourage it."

**What to avoid:** "Your love story deserves a setting as beautiful and unique as your bond."

### Attribute 3: Quietly Confident

**What this means:** We've been doing this a long time. We know what works. We say what we think without hedging. If a couple's plan won't work for the space, we tell them that directly and offer the alternative.

**How it sounds:** "We've tried that layout. It looks great in photos but the dance floor ends up too far from the bar. Here's what works better."

**What to avoid:** "We can absolutely accommodate any vision you have!"

### Attribute 4: Slightly Skeptical of Wedding Industry Conventions

**What this means:** We've been in the wedding business long enough to find a lot of it silly. We don't lean into wedding industry tropes. When we mention them, we're often pushing back.

**How it sounds:** "You don't need a signature cocktail. Two good cocktails the couple actually likes will outperform a custom list of six every time."

**What to avoid:** "Make your wedding day uniquely yours with these 27 personalization ideas!"

---

## 3. Tone Spectrum

These four sliders calibrate the voice when you're not sure how something should land.

**Formal ←→ Casual:** Lean casual, but not chatty.
- What this looks like: First-name basis, contractions, conversational sentences, but full thoughts and complete sentences. We don't write like we text.
- Where this might break: Lean slightly more formal in the contract conversation and in any communication with a couple's parents who are paying.

**Serious ←→ Playful:** Middle, with occasional dry humor.
- What this looks like: We can be funny but we're not jokey. The humor is observational, often pointed at wedding industry conventions.
- Where this might break: Lean serious in any communication about logistics, weather contingencies, or money.

**Traditional ←→ Modern:** Lean modern, but with respect for the property's history.
- What this looks like: We don't pretend the farmhouse is older or more historic than it is. We don't romanticize the past. But we do honor the building.
- Where this might break: When describing the property's actual history (the structures, the land, the family that had it before us), let the traditional voice through.

**Understated ←→ Bold:** Strongly understated.
- What this looks like: We don't oversell. We let the photos and the reviews do the bold work. The copy is quiet.
- Where this might break: Almost never. If the copy ever feels bold, it's probably wrong.

**Restrained ←→ Effusive:** Lean restrained.
- What this looks like: We don't do exclamation points. We don't do "absolutely thrilled" or "couldn't be more excited." If we feel something, we say what it is in plain language.
- Where this might break: A response to a 5-star review can be slightly warmer, but never effusive.

---

## 4. Operating Modes

The voice has two modes. Use the right one for the audience.

### Marketing Mode

**Audience:** Couples in the early-research stage, browsing the website, scrolling Instagram, looking at vendor lists in The Knot or Junebug. Also: planners scouting venues for clients.

**Where it shows up:** Website copy, blog posts, Instagram captions, paid ads, brochures, vendor directory listings.

**What's different about this mode:** Slightly more atmospheric. More room for the property to do the talking. Specifics over adjectives. Says less. Trusts the photos.

**Sample line in this mode:** "23 rooms on site. The bridal party stays in the farmhouse. Most families end up in the kitchen on Sunday morning."

### Client Mode

**Audience:** Couples who've inquired and are in the booking conversation, couples who have signed contracts, couples in the 3-month planning window before the wedding, couples on their wedding weekend.

**Where it shows up:** Inquiry email replies, follow-up emails, contract conversations, planning calls, day-of communication, post-wedding thank-yous.

**What's different about this mode:** Warmer. More direct. Faster with specifics — we share pricing, dates, room counts, and rules upfront. First-person plural (we, our) is fine. Practical.

**Sample line in this mode:** "October 11th is open. The all-in for that Saturday is $14,500 — that includes the venue, the on-site coordinator for the day, the rooms in the farmhouse for the couple's family, and the use of the kitchen for the rehearsal dinner if you want it. Want me to hold the date for 7 days?"

---

## 5. Vocabulary — Use These

### Descriptive language for the property
- The farmhouse — when referring to the main house specifically
- The barn — restored, beam-and-board, used for receptions
- The ceremony lawn — west-facing, late-afternoon light
- The kitchen — in-house catering, working kitchen, where things actually happen
- The orchard — the south-facing slope behind the barn
- The Catskills foothills — geographic anchor
- 90 minutes from Manhattan — practical anchor for NYC couples

### Words for the customer / experience
- Couples (not "brides" or "the bride and groom" — partners-neutral default)
- The weekend (the wedding is a weekend, not a day)
- The room (the people, not the building)
- A really good party (what we're trying to throw)
- Their people (the couple's friends and family)

### Local or category-specific language
- Hudson Valley
- The Catskills
- Upstate
- The river (the Hudson, when the context is clear)
- October light (a real thing, late-afternoon golden)
- The shoulder season (April-May, October-early November)

### Phrases that capture how the owner talks
- "Most of our couples end up in the kitchen at some point."
- "We've done this enough times to know what works."
- "You don't need [thing the wedding industry says you need]."
- "The room being full of the right people."
- "The food being actually good."
- "It's a party, not a production."

---

## 6. Vocabulary — Avoid These

### Industry clichés (wedding-specific)
- Special day, magical, fairytale, dream wedding, your love story, tied the knot, said yes, intimate (overused), elegant, romantic (overused), enchanting, breathtaking, picture-perfect, unforgettable, once-in-a-lifetime, your big day

### Generic marketing language
- Stunning, transform, elevate, unlock, seamlessly, robust, synergy, game-changer, leverage, curated, best-in-class, world-class, premier, luxurious, passionate, dedicated, experienced, proven, results-driven

### AI writing tells
- "Look no further"
- "Whether you're [X] or [Y], we have you covered"
- "We pride ourselves on..."
- "At Audrey's Farmhouse, we believe..."
- Any sentence starting with "In today's [adjective] world,"
- Em dashes (site-wide rule)
- "Not just a venue, but an experience"

### Audrey's Farmhouse specific avoids
- "Rustic" — overused for barn venues, doesn't describe what we are accurately
- "Vintage" — same
- "Charming" — generic
- "Hidden gem" — we're not hidden
- "Boutique" in the body of the copy (it's fine in a header or category descriptor, but we don't use it as praise)
- Any reference to the wedding being the "best day of your life" — too much pressure, not our brand
- "Tablescape," "florals" (just say "flowers"), "guest experience" (just say "for your guests")

---

## 7. Anti-AI Writing Rules

These are construction-level rules. Every piece of content should pass these checks.

### No throat-clearing openers
Don't start with "In today's wedding industry," "When it comes to choosing a venue," "It's no secret that," or any variation. Start with the point.

### No three-item lists where two will do
"Beautiful, elegant, and refined" → "Beautiful and refined." Two items is the default.

### No em dashes
Site-wide rule. Period or comma.

### No "not just X but Y" constructions
Banned.

### No bullet-point soup in place of paragraphs
Real paragraphs of 2-4 sentences carry voice better. Use bullets only for actual lists.

### Vary sentence length
Three medium-length sentences in a row is the AI default. Break the pattern. Short sentence. Then a longer one. Then short again.

### Lead with the specific, not the general
"180 seated in the barn, 23 rooms on site, in-house kitchen" beats "spacious accommodations and exceptional catering."

### Real numbers beat adjectives
"23 rooms" beats "ample accommodations." "90 minutes from Manhattan" beats "convenient to NYC." "12 years hosting weddings" beats "experienced."

### Acknowledge trade-offs
"The ceremony lawn faces west, so plan for late-afternoon light, and bring sunglasses for the early arrivals" is stronger than "Our beautiful ceremony lawn." The honest detail is what sells.

### No emoji in any client-facing copy
Site-wide rule.

### Audrey's-specific rules
- Never write about the couple's emotional state. Don't tell them this is "the most important day of their lives." Let them bring that. Our job is to be specific about what we provide.
- Don't overuse "we." When it's about the property or the experience, the property is the subject. "The barn holds 180" not "We can host 180 in the barn."
- Don't romanticize the past of the property. Stick to facts about the buildings and the history.

---

## 8. Sample Content

### Sample 1: Social Media Caption (event highlight)

**Context:** Recent fall wedding, 140 guests, ceremony on the lawn, reception in the barn.

**Caption:**
"Saturday at the farm. 140 people, ceremony at 4:30 (October light, west-facing lawn — the photos came out exactly the way they always do in October), reception in the barn, breakfast in the kitchen on Sunday morning for everyone who stayed.

Couple: Anna and Devin. Photos by @joshuabrownphotography. Catering: us, in-house, as always."

### Sample 2: First Reply to a New Inquiry

**Context:** Couple has filled out the contact form asking about a Saturday in October 2026.

**Email:**

Subject: October 2026 at Audrey's

Hi Lauren,

Thanks for reaching out. October 17th is open, October 24th is open, October 10th is booked.

The all-in for a Saturday in October is $14,500. That includes the venue (farmhouse + barn + ceremony lawn), the on-site coordinator for the wedding day, the rooms in the farmhouse for the couple and immediate family, and the kitchen for the rehearsal dinner if you want it.

What it doesn't include: catering (in-house, separate from the venue fee, ranges $145-$185 per person depending on what you go with), bar (we run it, separate), guest rooms beyond the farmhouse (we have 14 more in the cottage and the carriage house, $295-$395/night).

I can hold a date for you for 7 days. Want me to put a hold on one of the open Saturdays? And if you want to come walk the property, I have openings the next two Saturdays at 10am or 2pm.

Joshua
Audrey's Farmhouse
[phone]

### Sample 3: Blog Post Opening Paragraph

**Context:** Blog post on planning a fall wedding in the Hudson Valley. Target keyword: "fall wedding venues Hudson Valley."

**Opening:**
October is the month people think they want for their Hudson Valley wedding, and most of the time, they're right. The light is the thing. Late afternoon, west-facing — the trees behind the ceremony lawn turn the entire space gold for about 40 minutes. Photographers who've shot here in October all know the schedule.

What people don't always think about: the weather. October in the Catskills is unpredictable. Mid-60s and clear is the average. Mid-40s and raining is also October. We plan for both, every year. The covered porch on the barn is a backup that works, and we've never had a wedding where we couldn't make the layout work for the day we got.

If you're planning an October wedding here, here's what we tell every couple about scheduling, layouts, and the late-afternoon light.

### Sample 4: Positive Review Response

**Context:** Couple left a 5-star Google review praising the in-house kitchen and the on-site coordinator.

**Response:**
Thanks, Maddie. Megan's going to love seeing this — she ran your day end to end and she earned every word. And our kitchen team will be glad to hear the Sunday brunch landed. Hope you and Sam are doing well.

— Joshua

### Sample 5: Critical Review Response

**Context:** Review noted that the 11pm noise curfew was strict and felt abrupt to guests.

**Response:**
Hi Sarah, this is Joshua at Audrey's. The 11pm cutoff is a real thing — it's a township noise ordinance, not our rule, and we enforce it because if we don't, we lose our license to host weddings here. I'm sorry it felt abrupt. We do flag the curfew in the contract and the planning call, but if it landed as a surprise on the night of, that's on us for not making it clearer.

If you want to talk about it, I'm at [email] or [phone]. Either way, thank you for the rest of the review and for choosing us — your weekend was a good one and we're glad to have hosted it.

— Joshua

---

## 9. Key Facts Block for AI Prompts

Copy this block into any AI prompt about Audrey's Farmhouse to ground the output in reality.

```
BUSINESS: Audrey's Farmhouse
CATEGORY: Boutique multi-venue wedding and event property with on-site lodging
LOCATION: Catskills foothills, Ulster County, NY
SERVICE AREA: Couples typically come from NYC (90 min south), Hudson Valley (local), Boston, Philadelphia
ESTABLISHED: [Year]
OWNER / KEY PEOPLE: [Owner name] (owner), Megan [last name] (on-site coordinator and operations), [Chef name] (in-house kitchen)
WHAT THEY DO: Host weekend weddings of 80-180 guests with on-site lodging for the wedding party and family, in-house catering, and full-service event coordination
WHO THEY SERVE: Couples planning weddings of 80-180 guests, often from NYC and the Northeast, who prioritize good food, the right people in the room, and a relaxed weekend over a polished production
PRICE POSITION: Mid-to-upper market for the Hudson Valley. Saturday all-in (venue only): $14,500. Catering: $145-185 per person. Lodging: $295-$395/room/night.
KEY DIFFERENTIATORS:
- In-house kitchen (most Hudson Valley venues are BYO catering)
- 23 on-site guest rooms (most are 0-12)
- Multi-day weekend format (rehearsal dinner Friday, wedding Saturday, brunch Sunday)
- On-site coordinator included (most charge separately or require an outside planner)
SEASONALITY: Peak: late May, June, September, October. Shoulder: April, early May, early November. Off: December-March (limited bookings, mostly elopements).
KEY NUMBERS: 23 guest rooms, 180-guest reception capacity, 12+ years hosting weddings, [X] weddings/year
WEBSITE: [URL]
INSTAGRAM: @audreysfarmhouse
GOOGLE BUSINESS PROFILE: [URL]
```

---

## End of Worked Example

The example above is a complete reference Brand Voice Guide. Use this as the quality bar for any new client. If your draft for a new client is shorter, thinner, or more generic than this example, go back to discovery and fill the gaps before delivering.
