// Orchestration: ingest → catalog → extract → reconcile → apply → provenance →
// report (spec §1). Pure-ish and fully injectable (data source, chunk caller,
// clock) so the whole pipeline is unit-tested with no network and no real CLI.
// `--dry-run` performs every computation but writes nothing.

import { basename } from 'node:path';

import { createEmptyProfile, type ClientProfile } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

import { appendConflicts, bumpMeta, writeProfile } from '../generate/profile-io.js';
import { buildPathCatalog } from './catalog.js';
import { extractChunks, type ChunkCaller } from './extract.js';
import { ingestTranscript, type IngestOptions } from './ingest.js';
import { reconcile } from './reconcile.js';
import { applyCandidates } from './apply.js';
import { buildProvenance, provenancePath, type ProvenanceArtifact } from './provenance.js';
import { buildReportModel, renderReport, type ReportModel } from './report.js';
import type { MergeResult } from '../generate/profile-merge.js';

export interface RunInput {
  slug: string;
  /** Path/name of the transcript file (drives format detection + artifact name). */
  file: string;
  /** The transcript file contents (the command reads the file; run stays pure). */
  rawText: string;
  /** Existing profile, or null to start from an empty one. */
  existing: ClientProfile | null;
  ds: ClientDataSource;
  now: string;
  model: string;
  call: ChunkCaller;
  dryRun: boolean;
  keepTranscript: boolean;
  ingestOpts?: IngestOptions;
  log?: (msg: string) => void;
}

export interface RunResult {
  merge: MergeResult;
  provenance: ProvenanceArtifact;
  report: ReportModel;
  reportText: string;
  chunkCount: number;
}

export async function runExtraction(input: RunInput): Promise<RunResult> {
  const { slug, file, rawText, ds, now, model, call, dryRun, keepTranscript } = input;
  const log = input.log ?? (() => {});

  const ingest = ingestTranscript(rawText, file, input.ingestOpts);
  log(`  ingested ${ingest.format}: ${ingest.chunks.length} chunk(s), ${rawText.length} bytes`);

  const existing = input.existing ?? createEmptyProfile(slug, now);
  const activeModules = Object.keys(existing.modules ?? {});
  const catalog = buildPathCatalog({ activeModules });

  const extractions = await extractChunks(ingest.chunks, catalog, call);
  const chunkErrors = extractions
    .filter((e) => e.error !== undefined)
    .map((e) => ({ chunkIndex: e.chunkIndex, error: e.error as string }));

  const reconciliation = reconcile(extractions, ingest.text);
  const merge = applyCandidates(existing, reconciliation.candidates, now);

  const report = buildReportModel(existing, merge.profile, reconciliation, merge, chunkErrors);
  const provenance = buildProvenance({
    slug,
    file,
    format: ingest.format,
    chunkCount: ingest.chunks.length,
    bytes: rawText.length,
    model,
    now,
    reconciliation,
    merge,
    chunkErrors,
  });

  if (!dryRun) {
    await writeProfile(ds, slug, bumpMeta(merge.profile, now));
    if (merge.conflicts.length > 0) await appendConflicts(ds, slug, merge.conflicts);
    await ds.writeClientFile(slug, provenancePath(file), JSON.stringify(provenance, null, 2) + '\n');
    if (keepTranscript) await ds.writeClientFile(slug, `transcripts/${basename(file)}`, rawText);
  }

  const reportText = renderReport(report, { slug, file, dryRun });
  return { merge, provenance, report, reportText, chunkCount: ingest.chunks.length };
}
