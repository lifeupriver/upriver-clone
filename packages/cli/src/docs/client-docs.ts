import type { AuditPackage } from '@upriver/core';

export function buildProductMarketingContext(pkg: AuditPackage): string {
  const { meta, brandVoiceDraft, contentInventory, siteStructure } = pkg;
  const offers =
    contentInventory.pricing.length > 0
      ? contentInventory.pricing.map((p) => `- ${p.item}${p.price ? ` — ${p.price}` : ''}`).join('\n')
      : '- (no pricing detected on the site — needs client input)';

  const proof =
    contentInventory.testimonials.length > 0
      ? contentInventory.testimonials.slice(0, 5).map((t) => `- "${t.quote}"${t.attribution ? ` — ${t.attribution}` : ''}`).join('\n')
      : '- (no testimonials detected — collect from reviews / interview)';

  const missing =
    siteStructure.missingPages.length > 0
      ? siteStructure.missingPages.map((m) => `- ${m.pageType}`).join('\n')
      : '- (none flagged)';

  const audienceLines = brandVoiceDraft.audienceDescription || 'TBD — refine in interview.';
  const tone = brandVoiceDraft.tone || 'TBD';
  const characteristics = brandVoiceDraft.voiceCharacteristics?.join(', ') || 'TBD';

  return `# Product Marketing Context: ${meta.clientName}

## What we do
${meta.clientName} (${meta.siteUrl}) — see the brand voice guide and audit-package.json for the full picture.

## Target audience
${audienceLines}

## Key differentiators
${(brandVoiceDraft.keywords ?? []).map((k) => `- ${k}`).join('\n') || '- TBD'}

## Tone and voice
${tone}

Voice characteristics: ${characteristics}

## Primary conversion goal
Inquiry form submission leading to a venue tour booking.

## Key offers
${offers}

## Proof points
${proof}

## Competitors
- Pulled from the competitors audit pass — see audit/competitors.json.

## Common objections
- Pricing transparency (no published pricing means buyers assume the worst).
- Availability (date conflicts kill momentum if not surfaced).
- Logistics (parking, accommodations, vendor flexibility).

## Gaps to address (missing pages)
${missing}
`;
}

export function buildBrandVoiceGuide(pkg: AuditPackage, executiveSummary: string): string {
  const { meta, brandVoiceDraft, contentInventory } = pkg;
  const voiceWords =
    brandVoiceDraft.voiceCharacteristics?.slice(0, 3).join(', ') || 'TBD, TBD, TBD';

  const currentSamples =
    contentInventory.testimonials.slice(0, 3).map((t) => `> "${t.quote}"`).join('\n\n') ||
    '> (no on-site samples extracted)';

  const proposedSamples =
    (brandVoiceDraft.sampleBodyCopy ?? []).slice(0, 3).map((s) => `> ${s}`).join('\n\n') ||
    '> (none generated)';

  const headlines =
    (brandVoiceDraft.sampleHeadlines ?? []).map((h, i) => `${i + 1}. ${h}`).join('\n') ||
    '(none generated)';

  const useWords =
    (brandVoiceDraft.keywords ?? []).map((k) => `- ${k}`).join('\n') || '- TBD';
  const avoidWords =
    (brandVoiceDraft.bannedWords ?? []).map((k) => `- ${k}`).join('\n') || '- TBD';

  return `# Brand Voice Guide — ${meta.clientName}

> Auto-drafted from the audit. Joshua reviews and the client signs off before this becomes canonical. Goes in the Claude Project knowledge base; every content task uses it.

## Voice in three words
${voiceWords}

## What the brand sounds like now
Verbatim samples pulled from the live site:

${currentSamples}

## What it should sound like
Rewritten samples in the proposed voice:

${proposedSamples}

## Tone guidelines
${brandVoiceDraft.tone || 'TBD'}

## Word choices

### Use
${useWords}

### Avoid
${avoidWords}

## Headlines (10 samples)
${headlines}

## One-sentence business description
${meta.clientName} — see brandVoiceDraft.audienceDescription and audit-package.json meta for elevator-pitch source material.

## Audience
${brandVoiceDraft.audienceDescription || 'TBD — refine in interview.'}

## Content types and tone per type
- **Homepage hero**: Confident, specific. Lead with the differentiator.
- **Inquiry form intro**: Warm, frictionless. Lower the perceived stakes.
- **Email auto-replies**: Personal, fast. Confirm the human got the inquiry.
- **Instagram captions**: Conversational, scene-setting. One detail per caption.
- **Blog / journal posts**: Story-led. Vendor credit, scene, takeaway.
- **FAQ entries**: Direct. Answer the question first, then context.

---

## Executive summary (auto-drafted)

${executiveSummary}
`;
}

function dropBannedFromKeywords(keywords: string[], banned: string[]): string[] {
  // Drop any keyword whose normalized form contains a banned word as a whole token.
  // This prevents contradictions like keywords="unforgettable moments" + banned="unforgettable".
  const bannedTokens = banned.map((b) => b.toLowerCase().trim()).filter(Boolean);
  return keywords.filter((k) => {
    const tokens = k.toLowerCase().split(/[\s,/-]+/).filter(Boolean);
    return !tokens.some((t) => bannedTokens.includes(t));
  });
}

export function buildClientClaudeMd(pkg: AuditPackage): string {
  const { meta, brandVoiceDraft } = pkg;
  const rawKeywords = brandVoiceDraft.keywords ?? [];
  const banned = brandVoiceDraft.bannedWords ?? [];
  const cleanKeywords = dropBannedFromKeywords(rawKeywords, banned);

  return `# CLAUDE.md — ${meta.clientName}

GitHub repo: lifeupriver/${meta.clientSlug}

## What this site is
${meta.clientName} (${meta.siteUrl}). See \`../docs/brand-voice-guide.md\` for full context. Audit summary lives in \`../audit-package.json\`.

## Brand voice rules
- Tone: ${brandVoiceDraft.tone || 'TBD'}
- Voice characteristics: ${(brandVoiceDraft.voiceCharacteristics ?? []).join(', ') || 'TBD'}
- Words to use: ${cleanKeywords.slice(0, 8).join(', ') || 'TBD'}
- Words to avoid: ${banned.slice(0, 8).join(', ') || 'TBD'}

Always defer to \`../docs/brand-voice-guide.md\` when these conflict. Brand context (audience, offer, conversion goals) lives in \`.agents/product-marketing-context.md\` — auto-loaded by the copywriting and copy-editing skills.

## Component inventory
TBD — populated post-scaffold by \`upriver scaffold ${meta.clientSlug}\`.

## Content collection schemas
TBD — Astro Content Collections schemas live in \`src/content/config.ts\` once scaffolded.

## What Claude may do
- Edit pages under \`src/pages/\` and components under \`src/components/\`.
- Add content entries to existing collections (testimonials, faqs, venues, etc.).
- Apply audit findings from \`../audit-package.json\` if the change request matches.
- Refactor for clarity within an existing component's scope.

## What Claude must not do
- Change brand voice rules without an explicit signed-off update to \`docs/brand-voice-guide.md\`.
- Change design tokens (\`src/styles/tokens.css\` or equivalent) without sign-off.
- Add new top-level routes or content collections without an issue describing the request.
- Touch \`src/pages/admin/\` — admin is owned by the platform team.
- Commit secrets, .env files, or anything in \`../audit/\`.

## Change request format
Open an issue titled \`[change] <one-line summary>\` with:
1. **Page or component**: e.g. \`/venues/oak-loft\` or \`Hero.astro\`.
2. **What to change**: paste current copy or screenshot.
3. **Why**: link to the audit finding id (e.g. \`sales-007\`) or business reason.
4. **Done when**: visible result on the Vercel preview URL.

Claude picks up the issue, drafts the change, opens a draft PR, and assigns it to the client owner for review.
`;
}
