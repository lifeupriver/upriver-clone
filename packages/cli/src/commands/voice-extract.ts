import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { extractVoice, writeVoiceOutputs, type Depth } from '../voice/extractor.js';

const DEPTH_OPTIONS = ['quick', 'standard', 'deep'] as const;

export default class VoiceExtract extends BaseCommand {
  static override description =
    'Derive a brand voice guide from scraped copy. Outputs voice/voice-rules.json plus markdown guide and sample rewrites. Consumed by improve, design-brief, blog-topics, video-audit, and the natural-language admin.';

  static override examples = [
    '<%= config.bin %> voice-extract littlefriends',
    '<%= config.bin %> voice-extract audreys --depth=deep',
    '<%= config.bin %> voice-extract barneys-bbq --include-emails=./inbox.txt --audience=couples',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    depth: Flags.string({
      description: 'How thorough the analysis is. quick=5 pages, standard=15, deep=every scraped page.',
      options: [...DEPTH_OPTIONS],
      default: 'standard',
    }),
    'include-emails': Flags.string({
      description: 'Path to a file or directory of supplemental email correspondence to include in the corpus.',
    }),
    audience: Flags.string({
      description: 'Optional audience focus when the client has multiple personas (e.g., couples, planners).',
    }),
    force: Flags.boolean({
      description: 'Re-extract even if voice/voice-rules.json already exists.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(VoiceExtract);
    const { slug } = args;
    this.requireEnv('ANTHROPIC_API_KEY');

    const dir = clientDir(slug);
    if (!existsSync(dir)) {
      this.error(`Client directory not found: ${dir}. Run "upriver init ${slug}" first.`);
    }

    const rulesPath = join(dir, 'voice', 'voice-rules.json');
    if (this.skipIfExists('voice/voice-rules.json', rulesPath, { force: flags.force })) return;

    const pagesDir = join(dir, 'pages');
    if (!existsSync(pagesDir) || readdirSync(pagesDir).filter((f) => f.endsWith('.json')).length === 0) {
      this.error(`No scraped pages at ${pagesDir}. Run "upriver scrape ${slug}" first.`);
    }

    const config = readClientConfig(slug);
    const supplemental = flags['include-emails']
      ? loadSupplemental(flags['include-emails'])
      : undefined;

    this.log(`\nExtracting brand voice for "${slug}"...`);
    const t0 = Date.now();

    const result = await extractVoice(
      {
        slug,
        clientDir: dir,
        clientName: config.name ?? slug,
        ...(config.vertical !== undefined ? { vertical: config.vertical } : { vertical: undefined }),
        depth: flags.depth as Depth,
        ...(flags.audience !== undefined ? { audience: flags.audience } : { audience: undefined }),
        ...(supplemental !== undefined ? { supplementalText: supplemental } : { supplementalText: undefined }),
      },
      (msg) => this.log(msg),
    );

    const paths = writeVoiceOutputs(dir, result);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    this.log('');
    this.log(`Wrote ${paths.rulesPath}`);
    this.log(`Wrote ${paths.guidePath}`);
    this.log(`Wrote ${paths.rewritesPath}`);
    this.log('');
    this.log(`Voice extract complete in ${elapsed}s.`);
    this.log(
      `Tokens: ${result.inputTokens} in / ${result.outputTokens} out${result.fromCache ? ' (cache hit)' : ''}.`,
    );
    if (result.signals.bannedHits.length > 0) {
      this.log(
        `Note: existing site uses Upriver banned words (${result.signals.bannedHits.map((b) => `${b.word} ×${b.count}`).join(', ')}). Generated content will avoid them.`,
      );
    }
  }
}

function loadSupplemental(pathArg: string): string {
  if (!existsSync(pathArg)) {
    throw new Error(`--include-emails path not found: ${pathArg}`);
  }
  const stat = statSync(pathArg);
  if (stat.isFile()) {
    return readFileSync(pathArg, 'utf8');
  }
  if (stat.isDirectory()) {
    return readdirSync(pathArg)
      .filter((f) => /\.(txt|md|eml)$/i.test(f))
      .map((f) => readFileSync(join(pathArg, f), 'utf8'))
      .join('\n\n');
  }
  return '';
}
