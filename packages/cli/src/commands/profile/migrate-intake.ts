import { Args, Flags } from '@oclif/core';
import type { ClientIntake } from '@upriver/core';
import { auditDecisionsZ, type AuditDecisions } from '@upriver/schemas';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSource } from '../../generate/data-source.js';
import { appendConflicts, readProfile, writeProfile } from '../../generate/profile-io.js';
import {
  LEGACY_INTAKE_PATH,
  clientIntakeToAuditDecisions,
  planMigration,
} from '../../util/intake-reader.js';
import type { ClientDataSource } from '@upriver/core/data';

/** Marker written beside a frozen `intake.json` once it has been folded in. */
const MIGRATED_MARKER_PATH = `${LEGACY_INTAKE_PATH}.migrated`;

/** One slug's migration result, for `--all` summary reporting. */
type SlugOutcome = 'migrated' | 'noop' | 'conflict' | 'no-legacy' | 'already-migrated' | 'invalid';

export default class ProfileMigrateIntake extends BaseCommand {
  static override description =
    "Fold a client's legacy intake.json into the profile's auditDecisions section (one-shot, idempotent). The original intake.json is frozen with a .migrated marker, never deleted.";

  static override examples = [
    '<%= config.bin %> profile migrate-intake littlefriends',
    '<%= config.bin %> profile migrate-intake --all',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug (omit with --all)', required: false }),
  };

  static override flags = {
    all: Flags.boolean({
      description: 'Migrate every client that has an intake.json.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProfileMigrateIntake);
    const ds = resolveClientDataSource();

    if (flags.all && args.slug) {
      this.error('Pass a slug or --all, not both.');
    }
    if (!flags.all && !args.slug) {
      this.error('Provide a client slug, or pass --all to migrate every client with an intake.json.');
    }

    const slugs = flags.all ? await this.slugsWithIntake(ds) : [args.slug as string];
    if (slugs.length === 0) {
      this.log('No clients with an intake.json to migrate.');
      return;
    }

    const tally: Record<SlugOutcome, number> = {
      migrated: 0,
      noop: 0,
      conflict: 0,
      'no-legacy': 0,
      'already-migrated': 0,
      invalid: 0,
    };
    let anyConflict = false;

    for (const slug of slugs) {
      const outcome = await this.migrateOne(ds, slug);
      tally[outcome] += 1;
      if (outcome === 'conflict') anyConflict = true;
    }

    if (flags.all) {
      this.log('');
      this.log(
        `Done: ${tally.migrated} migrated, ${tally.noop} already-present, ` +
          `${tally['already-migrated']} previously-migrated, ${tally.conflict} conflict(s), ` +
          `${tally.invalid} invalid.`,
      );
    }

    // Non-zero exit on conflict so a caller (or CI) notices the queued conflicts.
    if (anyConflict) this.exit(1);
  }

  /** Slugs that have a legacy intake.json (independent of client-config gating). */
  private async slugsWithIntake(ds: ClientDataSource): Promise<string[]> {
    const slugs = await ds.listClientSlugs();
    const out: string[] = [];
    for (const slug of slugs) {
      if (await ds.fileExists(slug, LEGACY_INTAKE_PATH)) out.push(slug);
    }
    return out;
  }

  /** Migrate a single slug. Returns the outcome for summary tallying. */
  private async migrateOne(ds: ClientDataSource, slug: string): Promise<SlugOutcome> {
    // Marker is the primary idempotency gate: a migrated slug is a no-op.
    if (await ds.fileExists(slug, MIGRATED_MARKER_PATH)) {
      this.log(`${slug}: already migrated (${MIGRATED_MARKER_PATH} present); skipping.`);
      return 'already-migrated';
    }

    const raw = await ds.readClientFileText(slug, LEGACY_INTAKE_PATH);
    if (raw === null) {
      this.log(`${slug}: no ${LEGACY_INTAKE_PATH} to migrate.`);
      return 'no-legacy';
    }

    let legacy: ClientIntake;
    try {
      legacy = JSON.parse(raw) as ClientIntake;
    } catch (err) {
      this.warn(`${slug}: ${LEGACY_INTAKE_PATH} is not valid JSON (${(err as Error).message}); skipping.`);
      return 'invalid';
    }

    // Validate the stripped value before it can enter the profile.
    const parsed = auditDecisionsZ.safeParse(clientIntakeToAuditDecisions(legacy));
    if (!parsed.success) {
      this.warn(
        `${slug}: ${LEGACY_INTAKE_PATH} does not match the auditDecisions shape ` +
          `(${parsed.error.issues.length} issue(s)); skipping. First: ${parsed.error.issues[0]?.message}`,
      );
      return 'invalid';
    }

    const existing = await readProfile(ds, slug);
    const now = new Date().toISOString();
    const plan = planMigration(existing, legacy, slug, now);

    if (plan.kind === 'conflict') {
      await appendConflicts(ds, slug, [plan.conflict]);
      this.log(
        `${slug}: CONFLICT — the profile already has a differing auditDecisions section. ` +
          `Queued to profile-conflicts.json; profile and ${LEGACY_INTAKE_PATH} left untouched ` +
          `(resolve with operator review, then re-run).`,
      );
      return 'conflict';
    }

    if (plan.kind === 'apply') {
      await writeProfile(ds, slug, plan.toWrite);
      this.printApply(slug, plan.before, plan.after, plan.toWrite._meta.revision);
      await this.freeze(ds, slug, now, plan.toWrite._meta.revision);
      return 'migrated';
    }

    // noop: the profile already carries an equal value — freeze the legacy file
    // so the read path is unambiguously profile-first going forward.
    this.log(`${slug}: profile already carries an equal auditDecisions section; freezing ${LEGACY_INTAKE_PATH}.`);
    await this.freeze(ds, slug, now, existing?._meta.revision ?? null);
    return 'noop';
  }

  /** Write the `.migrated` marker beside the (undeleted) original. */
  private async freeze(
    ds: ClientDataSource,
    slug: string,
    now: string,
    profileRevision: number | null,
  ): Promise<void> {
    const marker = {
      migratedAt: now,
      slug,
      profileRevision,
      source: LEGACY_INTAKE_PATH,
      note:
        'Legacy intake.json folded into profile.auditDecisions and kept as a read-only ' +
        'fallback. Deleted after one full client cycle (PRD: "Relationship to the existing ' +
        'intake/interview layer").',
    };
    await ds.writeClientFile(slug, MIGRATED_MARKER_PATH, `${JSON.stringify(marker, null, 2)}\n`);
  }

  /** Operator-facing before/after summary of one migration. */
  private printApply(
    slug: string,
    before: AuditDecisions | null,
    after: AuditDecisions,
    revision: number,
  ): void {
    const b = before;
    const line = (label: string, from: string | number, to: string | number): void =>
      this.log(`  ${label}: ${from} → ${to}`);
    this.log(`Migrated ${slug} → profile.auditDecisions (revision ${revision}):`);
    line('findingDecisions', Object.keys(b?.findingDecisions ?? {}).length, Object.keys(after.findingDecisions).length);
    line('pageWants', Object.keys(b?.pageWants ?? {}).length, Object.keys(after.pageWants).length);
    line('referenceSites', (b?.referenceSites ?? []).length, after.referenceSites.length);
    line('scopeTier', String(b?.scopeTier ?? null), String(after.scopeTier));
    this.log(`  ${LEGACY_INTAKE_PATH} frozen in place (not deleted); ${MIGRATED_MARKER_PATH} written.`);
  }
}
