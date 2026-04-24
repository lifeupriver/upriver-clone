import type { AuditPackage } from '@upriver/core';

export function buildDesignBrief(pkg: AuditPackage): string {
  const { meta, designSystem, siteStructure, screenshots, findings, contentInventory } = pkg;
  const screenshotLines =
    screenshots.pages.slice(0, 12).map((s) => {
      const desktop = s.desktop ?? '(missing)';
      const mobile = s.mobile ?? '(missing)';
      return `- **${s.slug}** (${s.url})\n  - desktop: \`${desktop}\`\n  - mobile: \`${mobile}\``;
    }).join('\n');

  const palette = Object.entries(designSystem.colors)
    .filter(([k]) => !['primary', 'secondary', 'accent', 'background', 'textPrimary', 'textSecondary'].includes(k))
    .slice(0, 6);
  const extraPalette = palette.length
    ? '\n' + palette.map(([k, v]) => `  - ${k}: \`${v}\``).join('\n')
    : '';

  const missing = siteStructure.missingPages.length
    ? siteStructure.missingPages.map((m) => `- **${m.pageType}** (${m.priority}) — ${m.reason}`).join('\n')
    : '- (none flagged)';

  const dimensions = Object.entries(meta.scoreByDimension)
    .map(([d, s]) => `- ${d}: ${s}/100`)
    .join('\n');

  const p0 = findings.filter((f) => f.priority === 'p0').slice(0, 5);
  const p0Block = p0.length
    ? p0.map((f) => `  - [${f.dimension}] ${f.title}`).join('\n')
    : '  - (none)';

  return `# Claude Design Brief — ${meta.clientName}

> This file goes to Claude Design. Read it top to bottom before generating any deck output.

## Use this base
Use the **Upriver Consulting** repo as your base design system. The blocks below are the per-client overrides — apply them on top of the Upriver shell. The audit deliverable is a Claude Design slide deck (cover → executive summary → scorecard → visual audit → findings → missing pages → brand voice → design system → competitor comparison → implementation plan → scope sign-off → what we need from you).

## Client meta
- Client: **${meta.clientName}** (\`${meta.clientSlug}\`)
- Site: ${meta.siteUrl}
- Audit date: ${meta.auditDate}
- Overall score: **${meta.overallScore}/100**
- Total findings: ${meta.totalFindings} (P0: ${meta.findingsByPriority.p0}, P1: ${meta.findingsByPriority.p1}, P2: ${meta.findingsByPriority.p2})

## Design system (per-client overrides)

### Colors
- primary: \`${designSystem.colors.primary}\`
- secondary: \`${designSystem.colors.secondary}\`
- accent: \`${designSystem.colors.accent}\`
- background: \`${designSystem.colors.background}\`
- textPrimary: \`${designSystem.colors.textPrimary}\`
- textSecondary: \`${designSystem.colors.textSecondary}\`${extraPalette}

### Typography
- heading font: \`${designSystem.typography.headingFont}\`
- body font: \`${designSystem.typography.bodyFont}\`
- mono font: \`${designSystem.typography.monoFont}\`
- scale: ${Object.entries(designSystem.typography.scale).map(([k, v]) => `${k}=\`${v}\``).join(', ')}

### Spacing
- base unit: ${designSystem.spacing.baseUnit}px
- scale: [${designSystem.spacing.scale.join(', ')}]
- border radius: \`${designSystem.spacing.borderRadius}\`

### Components
- primary button: \`${JSON.stringify(designSystem.components.primaryButton)}\`
- secondary button: \`${JSON.stringify(designSystem.components.secondaryButton)}\`
- input field: \`${JSON.stringify(designSystem.components.inputField)}\`

### Brand
- logo: \`${designSystem.logo || '(missing — flag with the client)'}\`
- favicon: \`${designSystem.favicon || '(missing)'}\`
- color scheme: ${designSystem.colorScheme}
- personality: ${designSystem.personality.join(', ') || '(none extracted)'}

## Suggested deck structure (copy-paste prompts per slide)

### Slide 1 — Cover
> Generate a cover slide for "${meta.clientName}". Include the client name, the site URL (${meta.siteUrl}), the audit date (${new Date(meta.auditDate).toLocaleDateString()}), the overall score \`${meta.overallScore}/100\` as a large number with a one-line interpretation, and the Upriver Consulting auditor mark. Use the design system above for colors and typography.

### Slide 2 — Executive summary
> Use the executive summary in \`docs/brand-voice-guide.md\` (the section after "Executive summary (auto-drafted)"). Format as three short cards: "What's working", "What's costing you inquiries", "What we're recommending". Plain language, no jargon.

### Slide 3 — Scorecard (visual)
> Render a radar chart or grid showing the score (0-100) across all 10 dimensions:
${dimensions}
> Color-code: green ≥ 70, amber 40-69, red < 40.

### Slide 4 — Visual audit (before photos)
> Full-page screenshots of the homepage and 3-5 key pages with annotation overlays marking specific problems. Each annotation links to a finding card. Use the screenshots listed below.

${screenshotLines}

> **Note:** screenshots are local files. The human running the design pass uploads them manually to Claude Design — do not assume URLs.

### Slides 5-14 — Findings by dimension (one per dimension)
> For each of the 10 dimensions, generate a section with: dimension score + letter grade, 2-3 sentence summary (use the \`summary\` field from each pass), and finding cards (title, severity badge P0/P1/P2, evidence, business impact, recommendation, estimated effort). Pull every finding from \`audit-package.json#/findings\` filtered by dimension.

Top P0 findings to lead with:
${p0Block}

### Slide 15 — Missing pages analysis
> Render as a table: page type → reason → priority. Every missing page is a P1 or P2 finding. Frame the gap as opportunity.

${missing}

### Slide 16 — Brand voice analysis
> Side-by-side: "How the site sounds now" (3-5 verbatim site quotes) vs. "How it could sound" (rewrites in the proposed voice). Source: \`docs/brand-voice-guide.md\` and \`audit-package.json#/brandVoiceDraft\`. Highlight any banned phrases that appear on the site.

### Slide 17 — Design system audit
> Show the current design system components (buttons, typography, color palette, form fields) using the design system block above, with commentary on consistency. Flag inconsistencies surfaced in the design audit pass.

### Slide 18 — Competitor comparison
> Comparison table: ${meta.clientName} vs. 2-3 competitors. Rows: Domain Rating, referring domains, top keyword positions, page count, has pricing page (Y/N), has virtual tour (Y/N), has team page (Y/N), has FAQ page (Y/N), mobile score. Source: \`audit/competitors.json\`. Include one competitor homepage screenshot for visual contrast.

### Slide 19 — Implementation plan
> Lay out the phased plan as a visual timeline. Source: \`audit-package.json#/implementationPlan\`. Each phase = a card with name, what's included, estimated effort, estimated impact. Phase order: 1=Quick wins, 2=Structural fixes, 3=Content build-out, 4=AEO and authority.

### Slide 20 — Scope sign-off
> Render a checklist where every material item in the implementation plan has three checkboxes: "Include in rebuild scope", "Skip for now", "Needs discussion". Below: proposed price (derived from what they check), proposed timeline, signature line. This is the decision point — when the client returns this page signed, we have a scoped agreement.

### Slide 21 — What we need from you
> List the items in \`audit-package.json#/implementationPlan/requiresClientInput\`, \`/requiresNewContent\`, and \`/requiresAssets\`. Frame as a checklist the client can work through after signing scope.

## Content inventory snapshot (for reference)
- Testimonials: ${contentInventory.testimonials.length}
- Team members: ${contentInventory.teamMembers.length}
- FAQs: ${contentInventory.faqs.length}
- Pricing items: ${contentInventory.pricing.length}
- Event spaces: ${contentInventory.eventSpaces.length}
- Social links: ${contentInventory.socialLinks.length}
- Contact info: ${contentInventory.contactInfo.email ? 'email ✓' : 'email ✗'} · ${contentInventory.contactInfo.phone ? 'phone ✓' : 'phone ✗'} · ${contentInventory.contactInfo.address ? 'address ✓' : 'address ✗'}
`;
}
