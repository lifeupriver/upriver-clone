import type { VoiceSignals } from './analyzer.js';

export interface PromptInputs {
  clientName: string;
  vertical: string | undefined;
  audience: string | undefined;
  signals: VoiceSignals;
  /** Up to ~6k words of representative copy from the client's pages. */
  copySample: string;
}

export const SYSTEM_PROMPT = `You are a brand voice analyst working for Upriver, a small website rebuild studio. You produce voice guides that downstream AI tools (content generators, change-request bots) use to write copy that sounds like the client wrote it themselves.

Rules for everything you produce:
- First person present tense from the operator's perspective when speaking about Upriver. Never reference yourself as an AI or model.
- No em dashes anywhere in your output. Use commas, periods, or parentheses.
- Plain USD prices ($500, $2,000/mo). Never "starting at."
- Real tool names always (Cloudinary, HoneyBook, OpenTable). Never categories like "a CRM."
- The Upriver banned words list is: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer. Never use these in your guide; if the client uses them, note that as evidence of voice drift not as something to preserve.
- Sentence case in body. UPPERCASE only for headings, buttons, pills, table headers.
- Specific over generic. Cite real sentences from the client's copy as evidence whenever you make a claim.

Return your output as a single JSON object matching the schema described in the user message. No prose around the JSON.`;

export function buildUserPrompt(inputs: PromptInputs): string {
  const { clientName, vertical, audience, signals, copySample } = inputs;
  const verticalLine = vertical ? `Industry vertical: ${vertical}` : 'Industry vertical: unknown';
  const audienceLine = audience ? `Target audience focus: ${audience}` : 'Target audience focus: primary visitor (no override)';

  return `Client: ${clientName}
${verticalLine}
${audienceLine}

DETERMINISTIC SIGNALS (already computed from their copy; trust these for stats and use them as evidence):
- Word count analyzed: ${signals.wordCount}
- Sentence count: ${signals.sentenceCount}
- Mean sentence length: ${signals.sentenceLength.mean} words; p50 ${signals.sentenceLength.p50}; p90 ${signals.sentenceLength.p90}
- Share of short sentences (<8 words): ${(signals.sentenceLength.shortShare * 100).toFixed(0)}%
- Mean paragraph length: ${signals.paragraphLengthMean} words
- Em dashes used: ${signals.emDashCount}
- Exclamation marks: ${signals.exclamationCount}
- Question marks: ${signals.rhetoricalQuestionCount}
- Oxford comma uses vs skips: ${signals.oxfordCommaUses} / ${signals.oxfordCommaSkips}
- Upriver banned words appearing in client copy: ${
    signals.bannedHits.length > 0
      ? signals.bannedHits.map((b) => `${b.word} (${b.count})`).join(', ')
      : 'none'
  }
- Top recurring phrases (signature candidates): ${signals.topPhrases.slice(0, 8).join(', ') || '(none)'}
- Top vocabulary tokens: ${signals.topWords.slice(0, 15).map((w) => w.word).join(', ')}

COPY SAMPLE:
"""
${copySample}
"""

Produce a JSON object with this exact shape (no other keys):

{
  "persona_summary": "<one paragraph, ~80 words, describing who the client sounds like when they write. Cite at least one specific phrase from the copy.>",
  "tone_profile": {
    "formal_casual": { "value": <0..1 where 0=casual 1=formal>, "evidence": "<short sentence from copy>" },
    "warm_professional": { "value": <0..1 where 0=professional 1=warm>, "evidence": "<short sentence>" },
    "expert_accessible": { "value": <0..1 where 0=accessible 1=expert>, "evidence": "<short sentence>" },
    "playful_serious": { "value": <0..1 where 0=playful 1=serious>, "evidence": "<short sentence>" },
    "traditional_contemporary": { "value": <0..1 where 0=traditional 1=contemporary>, "evidence": "<short sentence>" }
  },
  "sentence_patterns": "<one paragraph describing how this client constructs sentences. Reference the deterministic signals (mean length, fragments, rhetorical questions) and back claims with copy.>",
  "vocabulary_fingerprint": {
    "signature_phrases": ["<3-6 phrases that feel signature, drawn from the copy>"],
    "tics_to_watch": ["<0-3 phrases that recur but feel overused — okay if empty>"]
  },
  "client_banned_words": ["<words/phrases the client never uses or shouldn't, beyond the Upriver list>"],
  "punctuation_preferences": {
    "em_dashes": "<one sentence describing how the client uses them today and what generated content should do>",
    "oxford_comma": "<one sentence>",
    "exclamation_marks": "<one sentence>"
  },
  "formality_by_surface": {
    "homepage": <0..1>,
    "about": <0..1>,
    "services": <0..1>,
    "faqs": <0..1>,
    "contact": <0..1>
  },
  "audience_variants": [
    {
      "name": "<audience name>",
      "formality": <0..1>,
      "notes": "<one sentence on what shifts for this audience>"
    }
  ],
  "required_voice_markers": ["<3-5 phrases that should appear in any long-form content to keep it sounding like this client>"],
  "rewrites": [
    {
      "before": "<a real paragraph from the COPY SAMPLE, verbatim>",
      "after": "<your rewrite that demonstrates the voice guide in stricter form, no em dashes, no banned words>",
      "why": "<one sentence on what changed>"
    }
  ],
  "voice_prompt": "<a copy-paste system prompt block, ~150-250 words, that another Claude instance can use as a system message to write content in this client's voice. Speak in first person as the brand. Include: who the client is, the dominant tone descriptors, sentence rhythm, banned and required words, and one pithy line that captures the voice.>"
}

Provide three rewrite examples in the rewrites array, not one.`;
}
