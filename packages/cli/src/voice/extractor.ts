import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import Anthropic from '@anthropic-ai/sdk';

import type { AudienceVariant, VoiceRules } from '@upriver/core';
import { UPRIVER_BANNED_WORDS } from '@upriver/core';

import { cachedClaudeCall, type CacheableTextBlockParam } from '../util/cached-llm.js';
import type { LoadedPage } from '../synthesize/loader.js';
import { analyzeCopy, type VoiceSignals } from './analyzer.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
/** Cap on chars sent to the LLM — ~6k words at ~5 chars/word. */
const COPY_SAMPLE_CHAR_BUDGET = 30_000;

export type Depth = 'quick' | 'standard' | 'deep';

const DEPTH_PAGE_LIMITS: Record<Depth, number> = {
  quick: 5,
  standard: 15,
  deep: Infinity,
};

export interface ExtractInputs {
  slug: string;
  clientDir: string;
  clientName: string;
  vertical: string | undefined;
  depth: Depth;
  audience: string | undefined;
  /** Optional supplemental copy (e.g., emails) appended to the corpus. */
  supplementalText: string | undefined;
}

export interface ExtractResult {
  voiceRules: VoiceRules;
  brandVoiceMarkdown: string;
  sampleRewritesMarkdown: string;
  signals: VoiceSignals;
  fromCache: boolean;
  inputTokens: number;
  outputTokens: number;
}

interface LlmOutput {
  persona_summary: string;
  tone_profile: Record<string, { value: number; evidence: string }>;
  sentence_patterns: string;
  vocabulary_fingerprint: { signature_phrases: string[]; tics_to_watch: string[] };
  client_banned_words: string[];
  punctuation_preferences: {
    em_dashes: string;
    oxford_comma: string;
    exclamation_marks: string;
  };
  formality_by_surface: Record<string, number>;
  audience_variants: AudienceVariant[];
  required_voice_markers: string[];
  rewrites: Array<{ before: string; after: string; why: string }>;
  voice_prompt: string;
}

/** Top-level orchestrator. Runs deterministic analysis, calls the LLM, writes outputs. */
export async function extractVoice(
  inputs: ExtractInputs,
  log: (msg: string) => void,
): Promise<ExtractResult> {
  const pages = loadScrapedPages(inputs.clientDir);
  if (pages.length === 0) {
    throw new Error(`No scraped pages found at ${join(inputs.clientDir, 'pages')}. Run "upriver scrape ${inputs.slug}" first.`);
  }

  const limit = DEPTH_PAGE_LIMITS[inputs.depth];
  const sampledPages = sampleByLength(pages, limit);
  log(`Voice extract analyzing ${sampledPages.length} of ${pages.length} pages (depth=${inputs.depth}).`);

  const corpus = buildCorpus(sampledPages, inputs.supplementalText);
  const signals = analyzeCopy(corpus);

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for voice-extract.');
  }
  const anthropic = new Anthropic({ apiKey });

  const copySample = corpus.length > COPY_SAMPLE_CHAR_BUDGET
    ? corpus.slice(0, COPY_SAMPLE_CHAR_BUDGET)
    : corpus;

  const systemBlocks: CacheableTextBlockParam[] = [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
  ];

  const userPrompt = buildUserPrompt({
    clientName: inputs.clientName,
    vertical: inputs.vertical,
    audience: inputs.audience,
    signals,
    copySample,
  });

  const result = await cachedClaudeCall({
    anthropic,
    slug: inputs.slug,
    command: 'voice-extract',
    model: MODEL,
    maxTokens: MAX_TOKENS,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
    log,
  });

  const llm = parseLlmJson(result.text);
  const voiceRules = buildVoiceRules({
    slug: inputs.slug,
    signals,
    sampledPageCount: sampledPages.length,
    llm,
  });
  const brandVoiceMarkdown = renderBrandVoiceMarkdown(inputs.clientName, voiceRules, signals, llm);
  const sampleRewritesMarkdown = renderSampleRewritesMarkdown(inputs.clientName, llm.rewrites);

  return {
    voiceRules,
    brandVoiceMarkdown,
    sampleRewritesMarkdown,
    signals,
    fromCache: result.fromCache,
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
  };
}

function loadScrapedPages(clientDir: string): LoadedPage[] {
  const pagesDir = join(clientDir, 'pages');
  if (!existsSync(pagesDir)) return [];
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as LoadedPage)
    .filter((p) => p.url && p.content?.markdown);
}

/** Pick the longest pages first; they carry the most voice signal. */
function sampleByLength(pages: LoadedPage[], limit: number): LoadedPage[] {
  const sorted = [...pages].sort(
    (a, b) => (b.content?.markdown?.length ?? 0) - (a.content?.markdown?.length ?? 0),
  );
  return Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
}

function buildCorpus(pages: LoadedPage[], supplemental: string | undefined): string {
  const parts: string[] = [];
  for (const p of pages) {
    const md = p.content?.markdown;
    if (md && md.trim().length > 0) parts.push(md);
  }
  if (supplemental && supplemental.trim().length > 0) parts.push(supplemental);
  return parts.join('\n\n').slice(0, 200_000);
}

/** Strip ```json fences and parse. */
function parseLlmJson(text: string): LlmOutput {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  // Some responses include trailing prose; isolate the first {...} block.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Voice extract LLM returned no JSON object.');
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as LlmOutput;
}

interface BuildRulesArgs {
  slug: string;
  signals: VoiceSignals;
  sampledPageCount: number;
  llm: LlmOutput;
}

function buildVoiceRules(args: BuildRulesArgs): VoiceRules {
  const { slug, signals, sampledPageCount, llm } = args;
  const formality = clamp01(llm.tone_profile['formal_casual']?.value ?? 0.5);
  const warmth = clamp01(llm.tone_profile['warm_professional']?.value ?? 0.5);

  const bannedWords = mergeBanned(llm.client_banned_words);

  return {
    voice_id: `${slug}-v1`,
    extracted_at: new Date().toISOString(),
    corpus_word_count: signals.wordCount,
    source_page_count: sampledPageCount,
    sentence_length: signals.sentenceLength,
    paragraph_length_mean: signals.paragraphLengthMean,
    banned_words: bannedWords,
    required_voice_markers: dedupe(llm.required_voice_markers ?? []),
    formality_score: formality,
    warmth_score: warmth,
    audience_variants: (llm.audience_variants ?? []).map((a) => ({
      name: a.name,
      formality: clamp01(a.formality),
      ...(a.notes ? { notes: a.notes } : {}),
    })),
    uses_em_dashes: signals.emDashCount > 0,
    uses_oxford_comma: signals.oxfordCommaUses > signals.oxfordCommaSkips,
    voice_prompt: llm.voice_prompt,
  };
}

function mergeBanned(clientBanned: string[]): string[] {
  const upriverLower = new Set(UPRIVER_BANNED_WORDS.map((w) => w.toLowerCase()));
  const out: string[] = [...UPRIVER_BANNED_WORDS];
  for (const w of clientBanned ?? []) {
    if (!w) continue;
    if (!upriverLower.has(w.toLowerCase())) out.push(w);
  }
  return out;
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return Math.round(n * 100) / 100;
}

function renderBrandVoiceMarkdown(
  clientName: string,
  rules: VoiceRules,
  signals: VoiceSignals,
  llm: LlmOutput,
): string {
  const lines: string[] = [];
  lines.push(`# Brand voice guide: ${clientName}`);
  lines.push('');
  lines.push(`Extracted ${new Date(rules.extracted_at).toISOString().slice(0, 10)} from ${rules.source_page_count} pages, ${rules.corpus_word_count.toLocaleString()} words analyzed.`);
  lines.push('');
  lines.push('## Persona summary');
  lines.push('');
  lines.push(llm.persona_summary);
  lines.push('');
  lines.push('## Tone profile');
  lines.push('');
  for (const [key, val] of Object.entries(llm.tone_profile)) {
    const label = key.replace(/_/g, ' / ');
    lines.push(`- **${label}**: ${val.value.toFixed(2)} — ${val.evidence}`);
  }
  lines.push('');
  lines.push('## Sentence patterns');
  lines.push('');
  lines.push(llm.sentence_patterns);
  lines.push('');
  lines.push(`Mean sentence length: ${signals.sentenceLength.mean} words. p50 ${signals.sentenceLength.p50}, p90 ${signals.sentenceLength.p90}. ${(signals.sentenceLength.shortShare * 100).toFixed(0)}% of sentences are under 8 words.`);
  lines.push('');
  lines.push('## Vocabulary fingerprint');
  lines.push('');
  lines.push('Signature phrases:');
  for (const p of llm.vocabulary_fingerprint.signature_phrases) lines.push(`- ${p}`);
  if (llm.vocabulary_fingerprint.tics_to_watch.length > 0) {
    lines.push('');
    lines.push('Tics to watch (recurs but reads as overused):');
    for (const p of llm.vocabulary_fingerprint.tics_to_watch) lines.push(`- ${p}`);
  }
  lines.push('');
  lines.push('## Banned words and phrases');
  lines.push('');
  lines.push('The Upriver house list applies to every generated surface:');
  lines.push('');
  for (const w of UPRIVER_BANNED_WORDS) lines.push(`- ${w}`);
  if (llm.client_banned_words.length > 0) {
    lines.push('');
    lines.push('Client-specific additions:');
    for (const w of llm.client_banned_words) lines.push(`- ${w}`);
  }
  if (signals.bannedHits.length > 0) {
    lines.push('');
    lines.push(`Note: the existing site uses ${signals.bannedHits.map((b) => `\`${b.word}\` (${b.count}x)`).join(', ')}. Generated content should not preserve these.`);
  }
  lines.push('');
  lines.push('## Punctuation and formatting');
  lines.push('');
  lines.push(`- **Em dashes**: ${llm.punctuation_preferences.em_dashes}`);
  lines.push(`- **Oxford comma**: ${llm.punctuation_preferences.oxford_comma}`);
  lines.push(`- **Exclamation marks**: ${llm.punctuation_preferences.exclamation_marks}`);
  lines.push('');
  lines.push('## Formality by surface');
  lines.push('');
  for (const [surface, val] of Object.entries(llm.formality_by_surface)) {
    lines.push(`- **${surface}**: ${val.toFixed(2)}`);
  }
  lines.push('');
  if (rules.audience_variants.length > 0) {
    lines.push('## Audience variants');
    lines.push('');
    for (const a of rules.audience_variants) {
      lines.push(`- **${a.name}** (formality ${a.formality.toFixed(2)})${a.notes ? `: ${a.notes}` : ''}`);
    }
    lines.push('');
  }
  if (rules.required_voice_markers.length > 0) {
    lines.push('## Required voice markers');
    lines.push('');
    lines.push('Phrases that should appear in any long-form generated content so it keeps sounding like this client:');
    lines.push('');
    for (const m of rules.required_voice_markers) lines.push(`- ${m}`);
    lines.push('');
  }
  lines.push('## Voice prompt block');
  lines.push('');
  lines.push('Copy-paste this as the system message for any Claude instance writing content for this client:');
  lines.push('');
  lines.push('```');
  lines.push(llm.voice_prompt);
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function renderSampleRewritesMarkdown(
  clientName: string,
  rewrites: Array<{ before: string; after: string; why: string }>,
): string {
  const lines: string[] = [];
  lines.push(`# Voice rewrites: ${clientName}`);
  lines.push('');
  lines.push(`Three rewrites of paragraphs from the existing site, demonstrating the voice guide in stricter form. Use these as references when generating new content.`);
  lines.push('');
  for (let i = 0; i < rewrites.length; i++) {
    const r = rewrites[i];
    if (!r) continue;
    lines.push(`## Rewrite ${i + 1}`);
    lines.push('');
    lines.push('**Before**');
    lines.push('');
    lines.push(`> ${r.before.replace(/\n+/g, '\n> ')}`);
    lines.push('');
    lines.push('**After**');
    lines.push('');
    lines.push(`> ${r.after.replace(/\n+/g, '\n> ')}`);
    lines.push('');
    lines.push(`_Why_: ${r.why}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function writeVoiceOutputs(clientDir: string, result: ExtractResult): {
  rulesPath: string;
  guidePath: string;
  rewritesPath: string;
} {
  const voiceDir = join(clientDir, 'voice');
  mkdirSync(voiceDir, { recursive: true });
  const rulesPath = join(voiceDir, 'voice-rules.json');
  const guidePath = join(voiceDir, 'brand-voice.md');
  const rewritesPath = join(voiceDir, 'sample-rewrites.md');
  writeFileSync(rulesPath, JSON.stringify(result.voiceRules, null, 2), 'utf8');
  writeFileSync(guidePath, result.brandVoiceMarkdown, 'utf8');
  writeFileSync(rewritesPath, result.sampleRewritesMarkdown, 'utf8');
  return { rulesPath, guidePath, rewritesPath };
}
