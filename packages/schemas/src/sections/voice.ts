import { z } from 'zod';
import { field } from '../envelope.js';

/** A brand voice attribute, defined with an example. */
export const voiceAttributeZ = z.object({
  attribute: z.string(),
  definition: z.string().optional(),
  example: z.string().optional(),
});

/** Positions on the four tone spectrums (0–100 or a descriptor). */
export const toneSpectrumZ = z.object({
  formalCasual: z.union([z.number(), z.string()]).optional(),
  seriousPlayful: z.union([z.number(), z.string()]).optional(),
  traditionalModern: z.union([z.number(), z.string()]).optional(),
  understatedBold: z.union([z.number(), z.string()]).optional(),
});

/** Banned vocabulary, grouped by category. */
export const bannedVocabularyZ = z.object({
  category: z.string(),
  terms: z.array(z.string()).optional(),
});

/** Stored references to representative past communications. */
export const sampleCommunicationsZ = z.object({
  emails: z.array(z.string()).optional(),
  socialPosts: z.array(z.string()).optional(),
});

/**
 * `voice` — attributes, tone, vocabulary, and stored sample communications.
 * Interview/transcript-only (the must-ask spine) (PRD §2.2, §2.4).
 */
export const voiceSectionZ = z
  .object({
    attributes: field(z.array(voiceAttributeZ)),
    toneSpectrum: field(toneSpectrumZ),
    operatingModes: field(
      z.object({ marketing: z.string().optional(), client: z.string().optional() }),
    ),
    vocabularyToUse: field(z.array(z.string())),
    bannedVocabulary: field(z.array(bannedVocabularyZ)),
    antiAiRules: field(z.array(z.string())),
    admiredVoices: field(z.array(z.string())),
    sampleCommunications: field(sampleCommunicationsZ),
  })
  .passthrough();

export type VoiceSection = z.infer<typeof voiceSectionZ>;
