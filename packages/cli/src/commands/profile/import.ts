import { existsSync, readFileSync } from 'node:fs';

import { Args, Flags } from '@oclif/core';
import { clientProfileZ, deliverableReadiness, type ClientProfile } from '@upriver/schemas';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { appendConflicts, readProfile, writeProfile } from '../../generate/profile-io.js';
import { planImport } from '../../generate/profile-merge.js';

export default class ProfileImport extends BaseCommand {
  static override description =
    'Validate a hand-filled Client Profile JSON and persist it (per-field merge, or create) through the data source. The day-one path for seeding a profile.';

  static override examples = [
    '<%= config.bin %> profile import littlefriends packages/schemas/src/fixtures/littlefriends.profile.json',
    '<%= config.bin %> profile import littlefriends ./profile.json --replace',
    '<%= config.bin %> profile import littlefriends ./profile.json --dry-run',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
    file: Args.string({ description: 'Path to a hand-filled profile JSON file', required: true }),
  };

  static override flags = {
    replace: Flags.boolean({
      description: 'Overwrite wholesale instead of a per-field merge (still revision-bumped).',
      default: false,
    }),
    'dry-run': Flags.boolean({
      description: 'Validate and report without writing.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProfileImport);
    const { slug, file } = args;

    if (!existsSync(file)) this.error(`File not found: ${file}`);

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      return this.error(`${file} is not valid JSON: ${(err as Error).message}`);
    }

    const result = clientProfileZ.safeParse(raw);
    if (!result.success) {
      this.log(`Profile failed validation (${result.error.issues.length} issue(s)):`);
      const bySection = new Map<string, string[]>();
      for (const issue of result.error.issues) {
        const section = issue.path.length > 0 ? String(issue.path[0]) : '(root)';
        const list = bySection.get(section) ?? [];
        list.push(`${issue.path.join('.') || '(root)'}: ${issue.message}`);
        bySection.set(section, list);
      }
      for (const [section, msgs] of bySection) {
        this.log(`  [${section}]`);
        for (const m of msgs) this.log(`    - ${m}`);
      }
      return this.error('Aborted: profile did not validate against @upriver/schemas.');
    }
    const parsed: ClientProfile = result.data;

    if (parsed._meta.slug !== slug) {
      this.error(`_meta.slug "${parsed._meta.slug}" does not match the slug argument "${slug}".`);
    }

    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const existing = await readProfile(ds, slug);
    const now = new Date().toISOString();

    const plan = planImport(existing, parsed, now, flags.replace);

    if (flags['dry-run']) {
      this.log('[dry-run] validated; no write performed.');
    } else {
      await writeProfile(ds, slug, plan.toWrite);
      if (plan.conflicts.length > 0) await appendConflicts(ds, slug, plan.conflicts);
    }

    this.log('');
    this.log(`Profile ${plan.mode} for "${slug}" (revision ${plan.toWrite._meta.revision}).`);
    this.log(`  applied: ${plan.applied}   conflicted: ${plan.conflicted}   unchanged: ${plan.unchanged}`);
    if (plan.conflicted > 0) {
      this.log(
        `  ${plan.conflicted} conflict(s) ${flags['dry-run'] ? 'would be' : ''} queued to profile-conflicts.json (resolve with operator review — Build Spec 03).`,
      );
    }
    this.log(`  coverage: ${this.coverageTeaser(plan.toWrite)}`);
  }

  private coverageTeaser(profile: ClientProfile): string {
    const d1 = deliverableReadiness(profile, 'doc-01');
    const d2 = deliverableReadiness(profile, 'doc-02');
    const fmt = (id: string, r: ReturnType<typeof deliverableReadiness>): string =>
      r.ready
        ? `${id} ready`
        : `${id} blocked (${r.missingFields.length} missing, ${r.unverifiedHv.length} unverified HV)`;
    return `${fmt('doc-01', d1)}; ${fmt('doc-02', d2)}`;
  }
}
