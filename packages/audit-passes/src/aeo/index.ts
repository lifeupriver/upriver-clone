// Methodology: .agents/skills/ai-seo/SKILL.md
// Focus: answer engine optimization — FAQ coverage, conversational readiness, featured snippet eligibility
import type { AuditPassResult } from '@upriver/core';
import { loadPages } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';

// Questions AI assistants and voice search commonly ask about wedding venues
const EXPECTED_TOPICS = [
  { pattern: /capacity|how many|guest.*count|maximum/i, label: 'Guest capacity / maximum attendees' },
  { pattern: /pricing|cost|how much|rate|package|investment/i, label: 'Pricing and packages' },
  { pattern: /catering|food|beverage|bar|alcohol|corkage/i, label: 'Catering policy (in-house vs. external)' },
  { pattern: /outdoor|indoor|weather|rain|backup/i, label: 'Indoor/outdoor options and weather backup plan' },
  { pattern: /parking|accomodation|hotel|stay|overnight/i, label: 'Parking and accommodation options' },
  { pattern: /vendor|caterer|planner|photographer|dj|preferred/i, label: 'Vendor policies (preferred list vs. open)' },
  { pattern: /deposit|payment|cancel|refund|policy/i, label: 'Deposit, payment, and cancellation policy' },
  { pattern: /available|booking|date|calendar|hold/i, label: 'Availability and date hold process' },
  { pattern: /ceremony|reception|rehearsal|cocktail/i, label: 'Ceremony, reception, and cocktail hour options' },
  { pattern: /decor|decoration|candle|flower|setup|breakdown/i, label: 'Decoration policies and setup/breakdown time' },
  { pattern: /accessible|wheelchair|ada|mobility/i, label: 'Accessibility accommodations' },
  { pattern: /rehearsal.*dinner|day.before/i, label: 'Rehearsal dinner availability' },
];

function coverageScore(allText: string, topics: typeof EXPECTED_TOPICS): number {
  return topics.filter((t) => t.pattern.test(allText)).length;
}

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings = [];

  const allText = pages.map((p) => p.content.markdown).join(' ');
  const allFaqs = pages.flatMap((p) => p.extracted.faqs);

  // ── Topic coverage (AI answer readiness) ─────────────────────────────────
  const uncoveredTopics = EXPECTED_TOPICS.filter((t) => !t.pattern.test(allText));

  if (uncoveredTopics.length >= 4) {
    findings.push(finding(
      'aeo', 'p0', 'heavy',
      `${uncoveredTopics.length} key venue questions not answered anywhere on the site`,
      `When a couple asks an AI assistant "does ${slug} allow outside catering?" or "what is the cancellation policy?", the AI can only answer from content on the site. ${uncoveredTopics.length} common venue questions have no answers.`,
      'Add dedicated content answering each uncovered topic. FAQ pages are the most efficient format — one question, one direct answer paragraph.',
      {
        evidence: `Uncovered: ${uncoveredTopics.map((t) => t.label).join('; ')}`,
        why: 'AI search engines (ChatGPT, Perplexity, Google AI Overviews) increasingly answer venue questions directly. Sites that answer questions explicitly get cited; sites that don\'t get replaced by competitors.',
      },
    ));
  } else if (uncoveredTopics.length > 0) {
    findings.push(finding(
      'aeo', 'p1', 'medium',
      `${uncoveredTopics.length} venue questions not explicitly answered`,
      `${uncoveredTopics.length} common questions couples ask are not directly answered on the site.`,
      `Add content addressing: ${uncoveredTopics.map((t) => t.label).join(', ')}.`,
      { evidence: `Missing: ${uncoveredTopics.map((t) => t.label).join('; ')}` },
    ));
  }

  // ── FAQ quantity and quality ───────────────────────────────────────────────
  if (allFaqs.length < 10) {
    findings.push(finding(
      'aeo', 'p0', 'heavy',
      `Only ${allFaqs.length} FAQ entries — far below what AI engines need to answer venue questions`,
      'AI assistants and featured snippets favor sites with comprehensive Q&A content. A venue site should answer 40-60 common questions to be competitive in AI search.',
      'Build a comprehensive FAQ section with at least 40 questions grouped by topic: pricing, capacity, catering, vendors, logistics, day-of timeline, planning, accessibility.',
      {
        why: 'When Google\'s AI Overview or ChatGPT answers "what venues allow outside catering near [city]", it pulls from structured Q&A content. Sites without it are invisible to AI search.',
      },
    ));
  }

  // ── Direct answer format ──────────────────────────────────────────────────
  // Check if FAQ answers are substantive (at least 20 words avg)
  if (allFaqs.length > 0) {
    const avgAnswerLength = allFaqs.reduce((sum, f) => sum + f.answer.split(' ').length, 0) / allFaqs.length;
    if (avgAnswerLength < 20) {
      findings.push(finding(
        'aeo', 'p1', 'medium',
        'FAQ answers too brief for featured snippet eligibility',
        `Average FAQ answer length is ${Math.round(avgAnswerLength)} words. Featured snippets and AI citations prefer answers of 40-60 words that directly address the question.`,
        'Expand FAQ answers to 40-60 words each. Start with a direct one-sentence answer, then add 1-2 sentences of supporting detail.',
        { why: 'Google\'s featured snippet algorithm favors answers between 40-60 words. Too short signals insufficient depth; too long gets truncated.' },
      ));
    }
  }

  // ── Conversational keyword coverage ──────────────────────────────────────
  const conversationalPatterns = [
    /\bcan i\b|\bdo you\b|\bis there\b|\bwill you\b|\bhow do\b|\bwhat is\b|\bwhere is\b/i,
  ];
  const pagesWithConversational = pages.filter((p) =>
    conversationalPatterns.some((re) => re.test(p.content.markdown)),
  );

  if (pagesWithConversational.length < pages.length * 0.3) {
    findings.push(finding(
      'aeo', 'p1', 'medium',
      'Low conversational language density — poor voice search and AI search readiness',
      'Few pages use natural question-and-answer language patterns. Voice search and AI answers prefer content written conversationally.',
      'Rewrite key sections using natural Q&A format: "Can I bring my own caterer? Yes, we work with a select list of preferred caterers and also allow..." Address questions directly rather than using marketing language.',
      { why: 'Voice search queries are 3-5x longer and more conversational than typed queries. Conversational content captures both voice and AI overview traffic.' },
    ));
  }

  // ── Entity clarity ────────────────────────────────────────────────────────
  const allContact = pages.map((p) => p.extracted.contact);
  const hasAddress = allContact.some((c) => c.address);
  const hasPhone = allContact.some((c) => c.phone);

  if (!hasAddress || !hasPhone) {
    const missing = [!hasAddress && 'address', !hasPhone && 'phone number'].filter(Boolean).join(' and ');
    findings.push(finding(
      'aeo', 'p1', 'light',
      `Business ${missing} not clearly marked up — AI cannot identify the entity`,
      `AI search engines and Google\'s Knowledge Graph need to clearly identify the business. The ${missing} is not found in a structured, machine-readable format.`,
      `Mark up the ${missing} using Schema.org JSON-LD and display it prominently in the footer of every page.`,
      { why: 'Without clear entity information, AI assistants cannot confidently cite the business in response to "wedding venues near [city]" queries.' },
    ));
  }

  const covered = EXPECTED_TOPICS.length - uncoveredTopics.length;
  const score = scoreFromFindings(findings);
  const summary = `AEO readiness: ${covered}/${EXPECTED_TOPICS.length} topics covered, ${allFaqs.length} FAQ entries detected. ${findings.filter((f) => f.priority === 'p0').length} critical gaps.`;

  return {
    dimension: 'aeo',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
