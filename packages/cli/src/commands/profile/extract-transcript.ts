import { existsSync, readFileSync } from 'node:fs';

import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { readProfile } from '../../generate/profile-io.js';
import { claudeCliAvailable } from '../../util/claude-cli.js';
import { defaultChunkCaller } from '../../transcript/extract.js';
import { runExtraction } from '../../transcript/run.js';

/**
 * `upriver profile extract-transcript <slug> <file>` — turn a recorded session
 * transcript (.txt/.md/.vtt/.srt) into `source: transcript` profile candidates
 * with verbatim quotes as evidence (PRD §4.3). Read-only LLM calls; merges
 * through the shared path (conflicts queue, nothing is ever auto-verified).
 */
export default class ExtractTranscript extends BaseCommand {
  static override description =
    'Extract Client Profile field candidates from a recorded-session transcript and merge them (source: transcript, quotes as evidence; conflicts queue, never auto-verified).';

  static override examples = [
    '<%= config.bin %> profile extract-transcript littlefriends ./session.txt',
    '<%= config.bin %> profile extract-transcript littlefriends ./session.vtt --dry-run',
    '<%= config.bin %> profile extract-transcript littlefriends ./session.txt --keep-transcript',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
    file: Args.string({ description: 'Path to the transcript (.txt/.md/.vtt/.srt)', required: true }),
  };

  static override flags = {
    'dry-run': Flags.boolean({ description: 'Run extraction and report, but write nothing.', default: false }),
    'keep-transcript': Flags.boolean({
      description: 'Copy the raw transcript into clients/<slug>/transcripts/ (off by default).',
      default: false,
    }),
    model: Flags.string({ description: 'Model alias for the read-only extraction calls.', default: 'sonnet' }),
    'chunk-size': Flags.integer({ description: 'Max characters per chunk (~12000 default).' }),
    overlap: Flags.integer({ description: 'Characters of context repeated between chunks (500 default).' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ExtractTranscript);
    const { slug, file } = args;

    if (!existsSync(file)) this.error(`File not found: ${file}`);
    if (!(await claudeCliAvailable())) {
      this.error(
        'The `claude` CLI is required for transcript extraction but was not found on PATH. ' +
          'Install Claude Code and sign in, or set CLAUDE_BIN.',
      );
    }

    let rawText: string;
    try {
      rawText = readFileSync(file, 'utf8');
    } catch (err) {
      return this.error(`Could not read ${file}: ${(err as Error).message}`);
    }
    if (rawText.trim().length === 0) this.error(`Transcript is empty: ${file}`);
    if (rawText.includes(String.fromCharCode(0))) {
      this.error(`Transcript appears to be binary, not text: ${file}`);
    }

    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const existing = await readProfile(ds, slug);
    const now = new Date().toISOString();
    const log = (msg: string): void => this.log(msg);

    const ingestOpts: { maxChars?: number; overlapChars?: number } = {};
    if (flags['chunk-size'] !== undefined) ingestOpts.maxChars = flags['chunk-size'];
    if (flags.overlap !== undefined) ingestOpts.overlapChars = flags.overlap;

    const result = await runExtraction({
      slug,
      file,
      rawText,
      existing,
      ds,
      now,
      model: flags.model,
      call: defaultChunkCaller({ slug, model: flags.model, log }),
      dryRun: flags['dry-run'],
      keepTranscript: flags['keep-transcript'],
      ...(Object.keys(ingestOpts).length > 0 ? { ingestOpts } : {}),
      log,
    });

    this.log(result.reportText);
  }
}
