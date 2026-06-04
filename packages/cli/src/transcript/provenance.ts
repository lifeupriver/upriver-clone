// The provenance artifact written to clients/<slug>/transcripts/<basename>-
// extraction.json (spec §1): a durable record of one extraction run — what was
// applied (with quotes), what conflicted, what was dropped/discarded and why,
// and what had no schema home — so a later reviewer can audit every value.

import { basename } from 'node:path';

import type { ConflictEntry } from '@upriver/schemas';

import type { MergeResult } from '../generate/profile-merge.js';
import type {
  DiscardedDuplicate,
  DroppedCandidate,
  Reconciliation,
  UnmappedTopic,
} from './types.js';

export interface AppliedRecord {
  path: string;
  value: unknown;
  quote: string;
  confidence: string;
  chunks: number[];
}

export interface ProvenanceArtifact {
  version: 1;
  slug: string;
  source: { file: string; format: string; chunks: number; bytes: number };
  model: string;
  generatedAt: string;
  summary: {
    applied: number;
    conflicted: number;
    unchanged: number;
    dropped: number;
    discarded: number;
    unmapped: number;
    chunkErrors: number;
  };
  applied: AppliedRecord[];
  conflicts: ConflictEntry[];
  dropped: DroppedCandidate[];
  discarded: DiscardedDuplicate[];
  unmapped: UnmappedTopic[];
  chunkErrors: Array<{ chunkIndex: number; error: string }>;
}

/** `clients/<slug>/transcripts/<basename>-extraction.json` (relative path). */
export function provenancePath(file: string): string {
  const base = basename(file);
  const stem = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
  return `transcripts/${stem}-extraction.json`;
}

export interface ProvenanceInput {
  slug: string;
  file: string;
  format: string;
  chunkCount: number;
  bytes: number;
  model: string;
  now: string;
  reconciliation: Reconciliation;
  merge: MergeResult;
  chunkErrors: Array<{ chunkIndex: number; error: string }>;
}

export function buildProvenance(input: ProvenanceInput): ProvenanceArtifact {
  const { reconciliation: recon, merge } = input;
  const appliedSet = new Set([...merge.applied, ...merge.unchanged]);
  const applied: AppliedRecord[] = recon.candidates
    .filter((c) => appliedSet.has(c.path))
    .map((c) => ({
      path: c.path,
      value: c.value,
      quote: c.quote,
      confidence: c.confidence,
      chunks: c.chunkIndices,
    }));

  return {
    version: 1,
    slug: input.slug,
    source: { file: input.file, format: input.format, chunks: input.chunkCount, bytes: input.bytes },
    model: input.model,
    generatedAt: input.now,
    summary: {
      applied: merge.applied.length,
      conflicted: merge.conflicts.length,
      unchanged: merge.unchanged.length,
      dropped: recon.dropped.length,
      discarded: recon.discarded.length,
      unmapped: recon.unmapped.length,
      chunkErrors: input.chunkErrors.length,
    },
    applied,
    conflicts: merge.conflicts,
    dropped: recon.dropped,
    discarded: recon.discarded,
    unmapped: recon.unmapped,
    chunkErrors: input.chunkErrors,
  };
}
