// Transcript ingest: format detection, cue stripping (.vtt/.srt), and
// overlapping paragraph-boundary chunking. Pure and dependency-free so the
// boundary-spanning behaviour can be tested without any LLM call (spec §1).

export type TranscriptFormat = 'txt' | 'md' | 'vtt' | 'srt';

export interface TranscriptChunk {
  index: number;
  text: string;
}

export interface IngestOptions {
  /** Target maximum characters per chunk (~12k in production). */
  maxChars?: number;
  /** Characters of trailing context repeated at the head of the next chunk. */
  overlapChars?: number;
}

export interface IngestResult {
  format: TranscriptFormat;
  /** Cue-stripped plain text (speaker labels preserved). */
  text: string;
  chunks: TranscriptChunk[];
}

const DEFAULT_MAX_CHARS = 12_000;
const DEFAULT_OVERLAP_CHARS = 500;

/** Map a filename's extension to a supported format; throws otherwise. */
export function detectFormat(filename: string): TranscriptFormat {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'txt' || ext === 'md' || ext === 'vtt' || ext === 'srt') return ext;
  throw new Error(
    `unsupported transcript format ".${ext}" — supported: .txt, .md, .vtt, .srt`,
  );
}

const TIMESTAMP_LINE =
  /^\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}/;
const CUE_INDEX_LINE = /^\s*\d+\s*$/;

/**
 * Strip subtitle scaffolding from .vtt/.srt, leaving spoken text and any
 * "Speaker:" labels intact. Plain .txt/.md is returned unchanged.
 */
export function stripCues(raw: string, format: TranscriptFormat): string {
  if (format === 'txt' || format === 'md') return raw;

  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];
  let inNote = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inNote) {
      if (trimmed === '') inNote = false; // NOTE block ends at a blank line
      continue;
    }
    if (trimmed === 'WEBVTT' || trimmed.startsWith('WEBVTT ')) continue;
    if (trimmed.startsWith('NOTE')) {
      inNote = trimmed === 'NOTE' || trimmed.startsWith('NOTE ');
      continue;
    }
    if (TIMESTAMP_LINE.test(line)) continue; // cue timing (+ any cue settings)
    if (CUE_INDEX_LINE.test(line)) continue; // SRT/numeric cue id
    kept.push(line);
  }
  // Collapse the runs of blank lines the stripping leaves behind.
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Split into trimmed, non-empty paragraphs (blank-line, else per-line). */
function splitParagraphs(text: string): string[] {
  const byBlank = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return text
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const SEP = '\n\n';

/**
 * Greedy paragraph packing into ~maxChars chunks with ~overlapChars of trailing
 * context repeated at the start of the next chunk, so a fact straddling a chunk
 * boundary is seen by the extractor in both chunks.
 */
export function chunkText(text: string, opts: IngestOptions = {}): TranscriptChunk[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const overlapChars = opts.overlapChars ?? DEFAULT_OVERLAP_CHARS;
  const paras = splitParagraphs(text);
  if (paras.length === 0) return [];

  const total = paras.reduce((n, p) => n + p.length + SEP.length, 0);
  if (total <= maxChars) return [{ index: 0, text: paras.join(SEP) }];

  const chunks: string[] = [];
  let i = 0;
  while (i < paras.length) {
    const parts: string[] = [];
    let size = 0;
    let j = i;
    while (j < paras.length) {
      const next = (paras[j] as string).length + SEP.length;
      if (parts.length > 0 && size + next > maxChars) break;
      parts.push(paras[j] as string);
      size += next;
      j++;
    }
    chunks.push(parts.join(SEP));
    if (j >= paras.length) break;

    // Back up from j to repeat ~overlapChars of trailing paragraphs.
    let back = 0;
    let k = j - 1;
    while (k > i && back < overlapChars) {
      back += (paras[k] as string).length + SEP.length;
      k--;
    }
    i = Math.max(i + 1, k + 1); // always make progress
  }

  return chunks.map((text, index) => ({ index, text }));
}

/** Reject empty or binary input with a clear error (spec §1). */
export function assertIngestable(raw: string): void {
  if (raw.trim().length === 0) throw new Error('transcript is empty');
  if (raw.includes('\u0000')) throw new Error('transcript appears to be binary, not text');
}

/** Read-time pipeline: detect → strip cues → chunk. */
export function ingestTranscript(
  raw: string,
  filename: string,
  opts?: IngestOptions,
): IngestResult {
  const format = detectFormat(filename);
  assertIngestable(raw);
  const text = stripCues(raw, format);
  return { format, text, chunks: chunkText(text, opts) };
}
