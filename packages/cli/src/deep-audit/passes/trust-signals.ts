import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync } from 'node:fs';
import type { AuditPassResult, AuditFinding } from '@upriver/core';
import type { PageData } from '@upriver/audit-passes';
import { loadPages, loadRawHtml } from '@upriver/audit-passes';
import { pickSamplePages } from '../sample.js';
import { parseFindingsJson, findingsRequestPrompt } from '../parse-findings.js';

const MODEL = 'claude-opus-4-7';

interface RunOpts {
  anthropic: Anthropic;
  log: (msg: string) => void;
}

export async function runTrustSignals(slug: string, clientDir: string, opts: RunOpts): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const sample = pickSamplePages(pages, 4);
  if (sample.length === 0) {
    return {
      dimension: 'trust-signals',
      score: 0,
      summary: 'No pages available.',
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  opts.log(`    trust-signals on ${sample.length} sample pages`);

  const allFindings: AuditFinding[] = [];
  for (const page of sample) {
    try {
      const findings = await analyzeTrust(page, opts.anthropic);
      allFindings.push(...findings);
      opts.log(`      ${page.slug.padEnd(28)} +${findings.length}`);
    } catch (err) {
      opts.log(`      ${page.slug.padEnd(28)} ERR ${String(err).slice(0, 100)}`);
    }
  }

  const score = scoreFromFindings(allFindings);
  return {
    dimension: 'trust-signals',
    score,
    summary: `Trust-signal quality audit on ${sample.length} sample pages. ${allFindings.length} findings.`,
    findings: allFindings,
    completed_at: new Date().toISOString(),
  };
}

async function analyzeTrust(page: PageData, anthropic: Anthropic): Promise<AuditFinding[]> {
  const testimonials = page.extracted.testimonials ?? [];
  const teamMembers = page.extracted.teamMembers ?? [];
  const htmlExcerpt = loadRawHtml(page).slice(0, 12_000);

  const inventory = `Testimonials extracted (${testimonials.length}):
${testimonials.slice(0, 8).map((t, i) => `${i + 1}. "${t.quote}" — ${t.attribution ?? '(no attribution)'}${t.rating ? ` (${t.rating})` : ''}`).join('\n')}

Team members shown (${teamMembers.length}):
${teamMembers.slice(0, 6).map((m) => `- ${m.name}${m.role ? ` (${m.role})` : ''}`).join('\n')}`;

  const userPrompt = `Audit the trust signals on this page. Trust signals include: testimonials, reviews, ratings, case studies, client logos, team bios, certifications, awards, press mentions, social proof.

Evaluate quality, not just presence. For each weakness, return a finding.

Quality criteria to evaluate:
1. **Specificity** — vague ("Great service!") vs concrete ("They booked our 200-person wedding in 4 weeks and stayed under budget by $3K.")
2. **Attribution credibility** — full name + role + photo + company beats first-name-only or anonymous.
3. **Recency** — undated testimonials > 2 years old feel stale; dated recent ones build trust.
4. **Schema markup** — Review/AggregateRating schema present? Visible to search engines?
5. **Visual treatment** — buried in walls of text vs given prominence.
6. **Diversity** — testimonials from one customer type only vs multiple persona types.
7. **Risk reversal** — guarantees, money-back, no-risk offers visible?
8. **Authority** — press mentions, certifications, awards displayed?
9. **Quantitative proof** — specific numbers ("12 years in business, 400+ events") vs vague claims.
10. **Photos/faces** — testimonials with attributed faces convert higher than text-only.

Page being audited:

URL: ${page.url}
Title: ${page.metadata.title ?? '(none)'}

${inventory}

HTML excerpt:

\`\`\`html
${htmlExcerpt}
\`\`\`

A screenshot is attached if available.

${findingsRequestPrompt('trust-signals')}`;

  const userContent: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = [];
  for (const path of [page.screenshots.desktop, page.screenshots.mobile]) {
    if (path && existsSync(path)) {
      const data = readFileSync(path).toString('base64');
      userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data } });
    }
  }
  userContent.push({ type: 'text', text: userPrompt });

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: 'You are a conversion-rate optimization expert focused on trust and social proof. You evaluate the quality of trust signals on landing pages and product pages with the rigor of a B2B SaaS CRO consultant.',
    messages: [{ role: 'user', content: userContent }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return parseFindingsJson(text, 'trust-signals', page.url);
}

function scoreFromFindings(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const d = findings.reduce((s, f) => s + (f.priority === 'p0' ? 12 : f.priority === 'p1' ? 6 : 2), 0);
  return Math.max(0, Math.min(100, 100 - d));
}
