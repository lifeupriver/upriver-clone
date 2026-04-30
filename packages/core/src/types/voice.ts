/**
 * Voice extract (F03) types and shared constants.
 *
 * `voice-rules.json` is the machine-readable contract emitted by the
 * `voice-extract` CLI command. It's consumed by the improve stage, the
 * design-brief generator, blog-topic generation (F10), video-audit shot lists
 * (F12), and the natural-language admin (F05) so that every AI-generated
 * surface speaks in the client's voice.
 */

/** Sentence-length distribution computed from the scraped copy corpus. */
export interface SentenceLengthStats {
  mean: number;
  p50: number;
  p90: number;
  /** Percentage of sentences under 8 words. */
  shortShare: number;
}

/** A named audience whose voice register diverges from the default. */
export interface AudienceVariant {
  name: string;
  formality: number;
  notes?: string;
}

/** Machine-readable voice rules. Mirrors the schema documented in F03 §5. */
export interface VoiceRules {
  voice_id: string;
  extracted_at: string;
  /** Number of words analyzed. */
  corpus_word_count: number;
  /** Number of pages sampled for the analysis. */
  source_page_count: number;
  sentence_length: SentenceLengthStats;
  /** Average paragraph length in words. */
  paragraph_length_mean: number;
  /** Words/phrases the client never uses; consumers must avoid these. */
  banned_words: string[];
  /** Phrases that should appear in long-form content to keep voice consistent. */
  required_voice_markers: string[];
  /** 0 = casual, 1 = formal. */
  formality_score: number;
  /** 0 = professional, 1 = warm. */
  warmth_score: number;
  audience_variants: AudienceVariant[];
  /** Whether the client uses em dashes in their own copy (Upriver bans them in generated output regardless). */
  uses_em_dashes: boolean;
  /** Whether the client uses the Oxford comma. */
  uses_oxford_comma: boolean;
  /** Copy-paste prompt block for downstream Claude calls. */
  voice_prompt: string;
}

/**
 * Upriver house-style banned words. F03 cross-references these against the
 * client's existing copy and flags any matches; F05/F10/F12 must never emit
 * these in generated content.
 */
export const UPRIVER_BANNED_WORDS: readonly string[] = [
  'stunning',
  'magical',
  'special day',
  'transform',
  'elevate',
  'unlock',
  'seamlessly',
  'robust',
  'synergy',
  'game-changer',
] as const;
