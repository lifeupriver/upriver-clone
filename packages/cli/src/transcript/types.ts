// Shared types for the transcript extractor pipeline (spec §1).

import type { Confidence } from '@upriver/schemas';

/** A candidate exactly as the model emits it for one chunk. */
export interface RawCandidate {
  path: string;
  value: unknown;
  quote: string;
  speaker?: string;
  confidence?: Confidence;
}

/** A session topic the model could not place under any schema path. */
export interface UnmappedTopic {
  topic: string;
  quote: string;
}

/** The parsed result of extracting one chunk (error set if the call/parse failed). */
export interface ChunkExtraction {
  chunkIndex: number;
  candidates: RawCandidate[];
  unmapped: UnmappedTopic[];
  error?: string;
}

/** A candidate dropped during reconciliation, with the reason (always reported). */
export interface DroppedCandidate {
  path: string;
  value: unknown;
  quote: string;
  reason: string;
}

/** A surviving candidate after cross-chunk dedupe + validation. */
export interface ReconciledCandidate {
  path: string;
  value: unknown;
  quote: string;
  speaker?: string;
  confidence: Confidence;
  /** Chunks this (path,value) was seen in — length>1 means it spanned a boundary. */
  chunkIndices: number[];
}

/** A same-path/different-value candidate that lost the tie-break (reported). */
export interface DiscardedDuplicate {
  path: string;
  value: unknown;
  quote: string;
  keptValue: unknown;
  reason: string;
}

export interface Reconciliation {
  candidates: ReconciledCandidate[];
  dropped: DroppedCandidate[];
  unmapped: UnmappedTopic[];
  discarded: DiscardedDuplicate[];
}
