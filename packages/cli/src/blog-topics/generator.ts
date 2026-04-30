// F10 blog topics — pure topic-generation logic. The Anthropic-backed path
// produces richer angles when a key is present; the deterministic fallback
// produces a usable list from vertical-pack seed topics so the command runs
// offline. Real Ahrefs keyword data integration is documented as a future
// enhancement but the deliverable shape is identical regardless of source.

export type SearchIntent = 'informational' | 'navigational' | 'commercial' | 'transactional';

export interface BlogTopic {
  slug: string;
  title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  search_intent: SearchIntent;
  cluster: string;
  /** 0-100 composite. Higher is better. */
  score: number;
  recommended_word_count: number;
  estimated_kd: number | null;
  estimated_monthly_volume: number | null;
  angle: string;
  internal_links: string[];
  schema_notes: string;
  source: 'heuristic' | 'llm' | 'ahrefs';
}

export interface BlogTopicBrief {
  topic: BlogTopic;
  search_intent_explanation: string;
  outline: Array<{ heading: string; level: 2 | 3; notes: string }>;
  key_points: string[];
  voice_notes: string;
  seo_requirements: {
    word_count: number;
    primary_keyword_density: string;
    internal_link_count: number;
    schema: string[];
  };
}

interface Cluster {
  name: string;
  weight: number;
  templates: Array<{
    titlePattern: string;
    intent: SearchIntent;
    wordCount: number;
  }>;
}

const VERTICAL_CLUSTERS: Record<string, Cluster[]> = {
  preschool: [
    {
      name: 'Choosing a preschool',
      weight: 0.35,
      templates: [
        { titlePattern: 'How to choose a {vertical} in {city}', intent: 'commercial', wordCount: 1500 },
        { titlePattern: 'What to ask on a {vertical} tour', intent: 'commercial', wordCount: 1200 },
        { titlePattern: 'Signs a {vertical} is the right fit for your child', intent: 'commercial', wordCount: 1300 },
        { titlePattern: 'Public versus private {vertical}: how to decide', intent: 'informational', wordCount: 1800 },
      ],
    },
    {
      name: 'Curriculum and approach',
      weight: 0.25,
      templates: [
        { titlePattern: 'Montessori versus Reggio: a parent\'s comparison', intent: 'informational', wordCount: 1700 },
        { titlePattern: 'What a typical day at {brand} looks like', intent: 'commercial', wordCount: 1100 },
        { titlePattern: 'How play-based learning prepares kids for kindergarten', intent: 'informational', wordCount: 1400 },
      ],
    },
    {
      name: 'Logistics and FAQs',
      weight: 0.2,
      templates: [
        { titlePattern: 'When to start the preschool search in {city}', intent: 'informational', wordCount: 900 },
        { titlePattern: 'What to pack for a preschool first day', intent: 'informational', wordCount: 800 },
        { titlePattern: 'How {vertical} tuition works in {state}', intent: 'commercial', wordCount: 1300 },
      ],
    },
    {
      name: 'Local guides',
      weight: 0.2,
      templates: [
        { titlePattern: 'Best parks for after-{vertical} families in {city}', intent: 'informational', wordCount: 1200 },
        { titlePattern: 'Family-friendly weekends in {city}', intent: 'informational', wordCount: 1500 },
      ],
    },
  ],
  'wedding-venue': [
    {
      name: 'Planning resources',
      weight: 0.35,
      templates: [
        { titlePattern: 'Wedding venue checklist for {city} couples', intent: 'commercial', wordCount: 1800 },
        { titlePattern: 'How far in advance to book a {city} wedding venue', intent: 'commercial', wordCount: 1100 },
        { titlePattern: 'Outdoor versus indoor wedding venues in {state}', intent: 'commercial', wordCount: 1500 },
      ],
    },
    {
      name: 'Real weddings',
      weight: 0.25,
      templates: [
        { titlePattern: 'A real {season} wedding at {brand}', intent: 'navigational', wordCount: 1400 },
        { titlePattern: 'Behind the scenes: planning a {vertical} weekend', intent: 'informational', wordCount: 1500 },
      ],
    },
    {
      name: 'Vendor comparisons',
      weight: 0.2,
      templates: [
        { titlePattern: 'Preferred wedding photographers in {city}', intent: 'commercial', wordCount: 1600 },
        { titlePattern: 'How to choose your wedding planner', intent: 'commercial', wordCount: 1400 },
      ],
    },
    {
      name: 'Logistics and FAQs',
      weight: 0.2,
      templates: [
        { titlePattern: 'Average wedding cost in {city}', intent: 'informational', wordCount: 1300 },
        { titlePattern: 'Day-of timeline for a {vertical} wedding', intent: 'informational', wordCount: 1100 },
      ],
    },
  ],
  restaurant: [
    {
      name: 'Menu and seasons',
      weight: 0.35,
      templates: [
        { titlePattern: 'What\'s on the {season} menu at {brand}', intent: 'navigational', wordCount: 1000 },
        { titlePattern: 'Where {city} eats in {season}', intent: 'informational', wordCount: 1500 },
      ],
    },
    {
      name: 'Local guides',
      weight: 0.3,
      templates: [
        { titlePattern: 'Best {vertical} for a date night in {city}', intent: 'commercial', wordCount: 1300 },
        { titlePattern: 'A perfect weekend in {city} for food lovers', intent: 'informational', wordCount: 1800 },
      ],
    },
    {
      name: 'Behind the kitchen',
      weight: 0.2,
      templates: [
        { titlePattern: 'How {brand} sources its produce', intent: 'informational', wordCount: 1200 },
        { titlePattern: 'A day in the life of a {vertical} kitchen', intent: 'informational', wordCount: 1400 },
      ],
    },
    {
      name: 'Private events',
      weight: 0.15,
      templates: [
        { titlePattern: 'How to host a private dinner at {brand}', intent: 'commercial', wordCount: 1100 },
      ],
    },
  ],
  'professional-services': [
    {
      name: 'Tax / advisory how-tos',
      weight: 0.35,
      templates: [
        { titlePattern: 'Year-end tax checklist for {city} small businesses', intent: 'informational', wordCount: 1600 },
        { titlePattern: 'When to switch from cash to accrual accounting', intent: 'informational', wordCount: 1400 },
      ],
    },
    {
      name: 'Choosing an advisor',
      weight: 0.3,
      templates: [
        { titlePattern: 'How to choose a {vertical} firm in {city}', intent: 'commercial', wordCount: 1500 },
        { titlePattern: 'Questions to ask before hiring a CPA', intent: 'commercial', wordCount: 1100 },
      ],
    },
    {
      name: 'Compliance updates',
      weight: 0.2,
      templates: [
        { titlePattern: 'What changed in {state} tax law this year', intent: 'informational', wordCount: 1300 },
      ],
    },
    {
      name: 'Industry deep-dives',
      weight: 0.15,
      templates: [
        { titlePattern: 'Bookkeeping tips for restaurants in {city}', intent: 'informational', wordCount: 1400 },
      ],
    },
  ],
  generic: [
    {
      name: 'How-tos',
      weight: 0.4,
      templates: [
        { titlePattern: 'How to choose a {vertical} in {city}', intent: 'commercial', wordCount: 1400 },
        { titlePattern: 'What to expect when working with {brand}', intent: 'commercial', wordCount: 1100 },
      ],
    },
    {
      name: 'Local guides',
      weight: 0.3,
      templates: [
        { titlePattern: 'Best of {city}: things to do this {season}', intent: 'informational', wordCount: 1500 },
      ],
    },
    {
      name: 'Industry primers',
      weight: 0.3,
      templates: [
        { titlePattern: 'Common questions about {vertical}', intent: 'informational', wordCount: 1200 },
      ],
    },
  ],
};

export interface GenerateInputs {
  brandName: string;
  vertical: string | undefined;
  city: string | undefined;
  state: string | undefined;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'all';
}

const SEASONS = ['fall', 'winter', 'spring', 'summer'];

function fillTemplate(
  pattern: string,
  ctx: { brand: string; vertical: string; city: string; state: string; season: string },
): string {
  return pattern
    .replace(/\{brand\}/g, ctx.brand)
    .replace(/\{vertical\}/g, ctx.vertical)
    .replace(/\{city\}/g, ctx.city)
    .replace(/\{state\}/g, ctx.state)
    .replace(/\{season\}/g, ctx.season);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Heuristic difficulty: shorter, broader terms = harder. */
function estimateKd(title: string, intent: SearchIntent): number {
  let kd = 25;
  if (title.length < 30) kd += 15;
  if (intent === 'transactional' || intent === 'commercial') kd += 10;
  if (/best|top|how to/i.test(title)) kd += 5;
  return Math.max(0, Math.min(100, kd));
}

function estimateVolume(title: string): number {
  // Local intent gets dampened volume estimates; broad terms higher.
  if (/in \w+|near me/i.test(title)) return 200;
  if (/best|top/i.test(title)) return 800;
  return 400;
}

/** Deterministic generator that runs without an LLM. */
export function generateTopics(inputs: GenerateInputs): BlogTopic[] {
  const vertical = inputs.vertical ?? 'generic';
  const verticalNoun = vertical.replace(/-/g, ' ');
  const city = inputs.city ?? 'your area';
  const state = inputs.state ?? '';
  const clusters = VERTICAL_CLUSTERS[vertical] ?? VERTICAL_CLUSTERS['generic']!;

  const topics: BlogTopic[] = [];
  // Round-robin across clusters until we hit the count, weighted so high-weight clusters fill first.
  const slots = distributeSlots(clusters, inputs.count);

  let seasonIdx = 0;
  for (const cluster of clusters) {
    const want = slots.get(cluster.name) ?? 0;
    let added = 0;
    let templateIdx = 0;
    while (added < want && cluster.templates.length > 0) {
      const tmpl = cluster.templates[templateIdx % cluster.templates.length];
      if (!tmpl) break;
      const season = SEASONS[seasonIdx % SEASONS.length] ?? 'fall';
      seasonIdx += 1;
      const title = fillTemplate(tmpl.titlePattern, {
        brand: inputs.brandName,
        vertical: verticalNoun,
        city,
        state,
        season,
      });
      const primary = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 80);
      const intent = tmpl.intent;
      const kd = estimateKd(title, intent);
      const volume = estimateVolume(title);
      topics.push({
        slug: slugify(title),
        title,
        primary_keyword: primary,
        secondary_keywords: [],
        search_intent: intent,
        cluster: cluster.name,
        score: Math.round((cluster.weight * 100) - kd / 4),
        recommended_word_count: tmpl.wordCount,
        estimated_kd: kd,
        estimated_monthly_volume: volume,
        angle: `Position the post around ${inputs.brandName}'s direct experience. Lead with one specific anecdote or data point that no competitor would have.`,
        internal_links: [`/services`, `/about`, `/contact`],
        schema_notes: 'Article + BreadcrumbList + Author Person reference. FAQPage when the post answers 3+ named questions.',
        source: 'heuristic',
      });
      added += 1;
      templateIdx += 1;
      if (templateIdx > cluster.templates.length * 2) break;
    }
  }

  // Apply difficulty filter
  const filtered = topics.filter((t) => {
    if (inputs.difficulty === 'all') return true;
    const kd = t.estimated_kd ?? 50;
    if (inputs.difficulty === 'easy') return kd < 20;
    if (inputs.difficulty === 'medium') return kd < 40;
    if (inputs.difficulty === 'hard') return true;
    return true;
  });

  // Sort by score desc.
  return filtered.sort((a, b) => b.score - a.score).slice(0, inputs.count);
}

function distributeSlots(clusters: Cluster[], count: number): Map<string, number> {
  const total = clusters.reduce((acc, c) => acc + c.weight, 0);
  const slots = new Map<string, number>();
  let used = 0;
  for (const c of clusters) {
    const n = Math.max(1, Math.floor((c.weight / total) * count));
    slots.set(c.name, n);
    used += n;
  }
  // Adjust for rounding.
  const diff = count - used;
  if (diff !== 0 && clusters.length > 0) {
    const top = clusters[0];
    if (top) slots.set(top.name, (slots.get(top.name) ?? 0) + diff);
  }
  return slots;
}

export function generateBrief(topic: BlogTopic, brandName: string, voiceFormality: number | null): BlogTopicBrief {
  const intentExplanation: Record<SearchIntent, string> = {
    informational: 'The searcher wants to learn or understand. Educate clearly without selling.',
    navigational: 'The searcher is looking for a specific brand or page. Make sure the post links into the right destination.',
    commercial: 'The searcher is comparing options. Be specific about what makes the brand the right fit and provide a clear next step.',
    transactional: 'The searcher is ready to act. Make the conversion path obvious and remove friction.',
  };
  const formalityNote =
    voiceFormality === null
      ? 'No voice-rules.json available; use a warm-professional default register.'
      : voiceFormality > 0.7
      ? 'Voice is formal. Lean into precise phrasing, longer sentences, and few contractions.'
      : voiceFormality < 0.4
      ? 'Voice is casual. Use contractions, short sentences, and direct address ("you").'
      : 'Voice is balanced. Mix sentence lengths; allow contractions but avoid slang.';
  const outline: BlogTopicBrief['outline'] = [
    { heading: 'Why this matters', level: 2, notes: 'Open with a specific anecdote or data point. Set the stakes in one paragraph.' },
    { heading: 'The short answer', level: 2, notes: 'Give the answer in one paragraph for searchers who only read the top.' },
    { heading: 'The detail', level: 2, notes: 'Three to five subsections. Use H3s to break them up.' },
    { heading: 'Common questions', level: 2, notes: 'Answer 3-5 named questions for the FAQPage schema.' },
    { heading: 'Next step', level: 2, notes: `Direct the reader to the most relevant page on ${brandName}.` },
  ];
  return {
    topic,
    search_intent_explanation: intentExplanation[topic.search_intent],
    outline,
    key_points: [
      `Cite ${brandName}'s direct experience at least once.`,
      'Include one specific number or data point per H2 section.',
      'Cross-link to at least two existing pages to support the topic cluster.',
    ],
    voice_notes: formalityNote,
    seo_requirements: {
      word_count: topic.recommended_word_count,
      primary_keyword_density: '0.5-1.5%; never stuff',
      internal_link_count: 3,
      schema: ['Article', 'BreadcrumbList', topic.search_intent === 'commercial' ? 'FAQPage (when applicable)' : 'FAQPage (when applicable)'],
    },
  };
}
