import { UPRIVER_BANNED_WORDS } from '@upriver/core';

/**
 * Deterministic signals extracted from raw copy. Feeds the LLM second pass
 * (richer dimension breakdown) and is also written verbatim into
 * voice-rules.json so downstream consumers don't need the LLM output to make
 * yes/no decisions about banned words or sentence length.
 */
export interface VoiceSignals {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  sentenceLength: { mean: number; p50: number; p90: number; shortShare: number };
  paragraphLengthMean: number;
  bannedHits: Array<{ word: string; count: number }>;
  topPhrases: string[];
  /** Raw token frequency, top 30, lowercase, stopwords stripped. */
  topWords: Array<{ word: string; count: number }>;
  emDashCount: number;
  oxfordCommaUses: number;
  oxfordCommaSkips: number;
  exclamationCount: number;
  rhetoricalQuestionCount: number;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'us', 'my', 'your',
  'his', 'her', 'its', 'our', 'their', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'as', 'by', 'from', 'about', 'into', 'through', 'over', 'up', 'down',
  'out', 'so', 'if', 'than', 'then', 'too', 'very', 's', 't', 'just', 'not',
  'no', 'yes', 'all', 'any', 'some', 'one', 'two', 'three', 'who', 'what',
  'when', 'where', 'why', 'how', 'which', 'there', 'here',
]);

/** Strip markdown markers, code fences, urls, image alt blocks. */
function cleanCopy(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/_+([^_]+)_+/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/ /g, ' ');
}

function splitSentences(text: string): string[] {
  // Conservative split: . ! ? followed by whitespace + capital, or paragraph
  // break. Keep the punctuation off the end. Skip empty fragments.
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[a-zA-Z]/.test(s));
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function wordCount(s: string): number {
  const m = s.match(/\b[\w'-]+\b/g);
  return m ? m.length : 0;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

/**
 * Tokenize, lowercase, strip stopwords, return top N by frequency. Used to
 * surface "vocabulary fingerprint" candidates for the LLM second pass.
 */
function topTokens(text: string, n = 30): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  const tokens = text.toLowerCase().match(/\b[a-z][a-z'-]{2,}\b/g) ?? [];
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

/** Find 2-3 word phrases that recur (signature phrase candidates). */
function topPhrases(text: string, n = 10): string[] {
  const cleaned = text.toLowerCase().replace(/[^a-z\s'-]/g, ' ').replace(/\s+/g, ' ');
  const words = cleaned.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const phraseCounts = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i] ?? '';
    const w2 = words[i + 1] ?? '';
    if (!w1 || !w2) continue;
    const bigram = `${w1} ${w2}`;
    phraseCounts.set(bigram, (phraseCounts.get(bigram) ?? 0) + 1);
    if (i < words.length - 2) {
      const w3 = words[i + 2] ?? '';
      if (w3) {
        const trigram = `${w1} ${w2} ${w3}`;
        phraseCounts.set(trigram, (phraseCounts.get(trigram) ?? 0) + 1);
      }
    }
  }
  return [...phraseCounts.entries()]
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([phrase]) => phrase);
}

function countBanned(text: string): Array<{ word: string; count: number }> {
  const lower = text.toLowerCase();
  const hits: Array<{ word: string; count: number }> = [];
  for (const word of UPRIVER_BANNED_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    const m = lower.match(re);
    if (m && m.length > 0) hits.push({ word, count: m.length });
  }
  return hits;
}

function countOxfordComma(text: string): { uses: number; skips: number } {
  // Rough heuristic: "X, Y, and Z" vs "X, Y and Z".
  const uses = (text.match(/,\s+(?:and|or)\s+/g) ?? []).length;
  const skips = (text.match(/[a-z]\s+(?:and|or)\s+[a-z]+\s+(?:and|or)\s+/gi) ?? []).length;
  return { uses, skips };
}

/** Run the full deterministic pass over the corpus. */
export function analyzeCopy(corpus: string): VoiceSignals {
  const cleaned = cleanCopy(corpus);
  const sentences = splitSentences(cleaned);
  const paragraphs = splitParagraphs(cleaned);

  const sentLengths = sentences.map(wordCount).sort((a, b) => a - b);
  const totalWords = sentLengths.reduce((acc, n) => acc + n, 0);
  const meanSent = sentLengths.length > 0 ? totalWords / sentLengths.length : 0;
  const shortShare =
    sentLengths.length > 0
      ? sentLengths.filter((n) => n < 8).length / sentLengths.length
      : 0;

  const paraLengths = paragraphs.map(wordCount);
  const paraMean =
    paraLengths.length > 0
      ? paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length
      : 0;

  const oxford = countOxfordComma(cleaned);

  return {
    wordCount: totalWords,
    sentenceCount: sentLengths.length,
    paragraphCount: paragraphs.length,
    sentenceLength: {
      mean: round1(meanSent),
      p50: percentile(sentLengths, 50),
      p90: percentile(sentLengths, 90),
      shortShare: round2(shortShare),
    },
    paragraphLengthMean: round1(paraMean),
    bannedHits: countBanned(cleaned),
    topPhrases: topPhrases(cleaned),
    topWords: topTokens(cleaned),
    emDashCount: (cleaned.match(/—/g) ?? []).length,
    oxfordCommaUses: oxford.uses,
    oxfordCommaSkips: oxford.skips,
    exclamationCount: (cleaned.match(/!/g) ?? []).length,
    rhetoricalQuestionCount: (cleaned.match(/\?/g) ?? []).length,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
