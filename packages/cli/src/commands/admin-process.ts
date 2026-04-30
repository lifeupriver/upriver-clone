import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { runChangeRequest, loadVoiceRulesFromClient } from '../admin/processor.js';
import { readState, writeState } from '../admin/state.js';

export default class AdminProcess extends BaseCommand {
  static override description =
    'F05 — manually run the change-request processor against a checked-out repo. Same code path the webhook handler uses; convenient for end-to-end testing without setting up a webhook.';

  static override examples = [
    '<%= config.bin %> admin-process littlefriends --repo-dir=/tmp/littlefriends-site --issue-number=1 --issue-title="add fall menu" --issue-body-file=./issue.md',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'repo-dir': Flags.string({
      description: 'Local clone of the client site repo. The processor edits files here in place.',
      required: true,
    }),
    'issue-number': Flags.integer({ description: 'GitHub issue number', required: true }),
    'issue-title': Flags.string({ description: 'GitHub issue title', required: true }),
    'issue-body-file': Flags.string({ description: 'Path to a file with the issue body.' }),
    'issue-body': Flags.string({ description: 'Issue body, inline (alternative to --issue-body-file).' }),
    'operator-feedback': Flags.string({
      description: 'When re-running after operator review, the feedback to incorporate.',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AdminProcess);
    const { slug } = args;
    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const state = readState(dir, slug);
    if (state.paused) {
      this.error(`Admin is paused for ${slug}. Run \`upriver admin-pause ${slug} --resume\` first.`);
    }

    const repoDir = resolve(flags['repo-dir']);
    if (!existsSync(repoDir)) this.error(`--repo-dir not found: ${repoDir}`);

    const issueBody = flags['issue-body-file']
      ? readFileSync(flags['issue-body-file'], 'utf8')
      : flags['issue-body'];
    if (!issueBody) this.error('Provide --issue-body or --issue-body-file.');

    const voiceRules = loadVoiceRulesFromClient(dir);
    if (!voiceRules) {
      this.warn('No voice/voice-rules.json found. Voice-check will only enforce Upriver house rules. Run `upriver voice-extract` first for tighter voice control.');
    }

    this.log(`\nRunning change request for issue #${flags['issue-number']} on ${slug}...`);
    const t0 = Date.now();

    const result = await runChangeRequest({
      slug,
      repoDir,
      issueNumber: flags['issue-number'],
      issueTitle: flags['issue-title'],
      issueBody,
      voiceRules,
      ...(flags['operator-feedback'] !== undefined ? { operatorFeedback: flags['operator-feedback'] } : {}),
    });

    state.last_change_processed_at = new Date().toISOString();
    writeState(dir, state);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Intent type: ${result.intent.type} (confidence ${result.intent.confidence}%)`);
    this.log(`Branch: ${result.branch}`);
    this.log(`Files changed: ${result.changed_files.length === 0 ? '(none reported)' : result.changed_files.join(', ')}`);
    this.log(`Summary: ${result.summary}`);
    this.log('');
    this.log(`Voice check: ${result.voice_check.passed ? 'PASS' : 'FAIL'}`);
    if (result.voice_check.banned_word_hits.length > 0) {
      this.log(`  Banned words: ${result.voice_check.banned_word_hits.map((h) => `${h.word} ×${h.count}`).join(', ')}`);
    }
    if (result.voice_check.em_dash_hits > 0) {
      this.log(`  Em dashes added: ${result.voice_check.em_dash_hits}`);
    }
    for (const note of result.voice_check.notes) this.log(`  Note: ${note}`);
    if (result.blocked) {
      this.log('');
      this.log(`Blocked: ${result.block_reason}.`);
      this.log('Webhook handler should add the corresponding label and skip the auto-merge path.');
    } else {
      this.log('');
      this.log('Ready to commit. Webhook handler should: git commit, git push, gh pr create, gh issue label add pending-review.');
    }
    this.log('');
    this.log(`Done in ${elapsed}s.`);
  }
}
