import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ClientIntake } from '@upriver/core';
import {
  createEmptyProfile,
  type AuditDecisions,
  type AuditDecisionsSection,
  type ClientProfile,
} from '@upriver/schemas';

import { resetClientDataSource } from '../generate/data-source.js';
import {
  auditDecisionsToClientIntake,
  clientIntakeToAuditDecisions,
  planMigration,
  readIntake,
} from './intake-reader.js';

const SLUG = 'acme-co';

/** A representative, fully-populated legacy intake. */
function sampleIntake(): ClientIntake {
  return {
    version: 1,
    findingDecisions: { 'seo-001': 'fix', 'seo-002': 'skip', 'ux-003': 'discuss' },
    pageWants: { home: 'Hero feels too corporate.', about: 'Tell the founder story.' },
    referenceSites: ['https://example.com', 'https://stripe.com'],
    scopeTier: 'rebuild',
    submittedAt: '2026-04-28T00:00:00.000Z',
    updatedAt: '2026-05-01T12:34:56.000Z',
  };
}

/** The auditDecisions value that `sampleIntake()` strips down to. */
function sampleDecisions(): AuditDecisions {
  return {
    findingDecisions: { 'seo-001': 'fix', 'seo-002': 'skip', 'ux-003': 'discuss' },
    pageWants: { home: 'Hero feels too corporate.', about: 'Tell the founder story.' },
    referenceSites: ['https://example.com', 'https://stripe.com'],
    scopeTier: 'rebuild',
    submittedAt: '2026-04-28T00:00:00.000Z',
  };
}

/** Build a profile carrying an auditDecisions section with the given value. */
function profileWithDecisions(
  value: AuditDecisions,
  envelope: Partial<AuditDecisionsSection> = {},
): ClientProfile {
  const base = createEmptyProfile(SLUG, '2026-01-01T00:00:00.000Z');
  base._meta.revision = 3;
  const section: AuditDecisionsSection = {
    value,
    source: 'operator',
    confidence: 'high',
    verified: false,
    updatedAt: '2026-04-28T00:00:00.000Z',
    ...envelope,
  };
  return { ...base, auditDecisions: section };
}

describe('intake transforms', () => {
  it('clientIntakeToAuditDecisions strips version and updatedAt', () => {
    assert.deepEqual(clientIntakeToAuditDecisions(sampleIntake()), sampleDecisions());
  });

  it('auditDecisionsToClientIntake reconstructs version:1 + envelope.updatedAt in canonical key order', () => {
    const section: AuditDecisionsSection = {
      value: sampleDecisions(),
      source: 'operator',
      confidence: 'high',
      verified: false,
      updatedAt: '2026-05-01T12:34:56.000Z',
    };
    const intake = auditDecisionsToClientIntake(section);
    assert.deepEqual(intake, sampleIntake());
    assert.deepEqual(Object.keys(intake), [
      'version',
      'findingDecisions',
      'pageWants',
      'referenceSites',
      'scopeTier',
      'submittedAt',
      'updatedAt',
    ]);
  });
});

describe('planMigration', () => {
  const NOW = '2026-06-04T09:00:00.000Z';

  it('fresh (no profile): creates a revision-1 profile with the section, preserving legacy updatedAt on the envelope', () => {
    const plan = planMigration(null, sampleIntake(), SLUG, NOW);
    assert.equal(plan.kind, 'apply');
    if (plan.kind !== 'apply') return;
    assert.equal(plan.toWrite._meta.revision, 1);
    assert.equal(plan.toWrite._meta.slug, SLUG);
    assert.equal(plan.toWrite._meta.createdAt, NOW);
    assert.equal(plan.toWrite._meta.updatedAt, NOW);
    const section = plan.toWrite.auditDecisions;
    assert.ok(section);
    assert.deepEqual(section.value, sampleDecisions());
    assert.equal(section.source, 'operator');
    assert.equal(section.confidence, 'high');
    assert.equal(section.verified, false);
    // The invariant: envelope.updatedAt == the intake's updatedAt.
    assert.equal(section.updatedAt, '2026-05-01T12:34:56.000Z');
    assert.equal(plan.before, null);
    assert.deepEqual(plan.after, sampleDecisions());
  });

  it('fresh (profile without auditDecisions): applies and bumps the existing revision', () => {
    const base = createEmptyProfile(SLUG, '2026-01-01T00:00:00.000Z');
    base._meta.revision = 7;
    const plan = planMigration(base, sampleIntake(), SLUG, NOW);
    assert.equal(plan.kind, 'apply');
    if (plan.kind !== 'apply') return;
    assert.equal(plan.toWrite._meta.revision, 8);
    assert.equal(plan.toWrite._meta.createdAt, '2026-01-01T00:00:00.000Z');
    assert.deepEqual(plan.toWrite.auditDecisions?.value, sampleDecisions());
  });

  it('idempotent: equal existing auditDecisions is a no-op', () => {
    const profile = profileWithDecisions(sampleDecisions());
    const plan = planMigration(profile, sampleIntake(), SLUG, NOW);
    assert.equal(plan.kind, 'noop');
  });

  it('equal regardless of record key ordering', () => {
    const reordered: AuditDecisions = {
      submittedAt: '2026-04-28T00:00:00.000Z',
      scopeTier: 'rebuild',
      referenceSites: ['https://example.com', 'https://stripe.com'],
      pageWants: { about: 'Tell the founder story.', home: 'Hero feels too corporate.' },
      findingDecisions: { 'ux-003': 'discuss', 'seo-002': 'skip', 'seo-001': 'fix' },
    } as AuditDecisions;
    const plan = planMigration(profileWithDecisions(reordered), sampleIntake(), SLUG, NOW);
    assert.equal(plan.kind, 'noop');
  });

  it('conflict: a differing existing auditDecisions is queued, never overwritten', () => {
    const differing: AuditDecisions = {
      ...sampleDecisions(),
      scopeTier: 'polish',
    };
    const profile = profileWithDecisions(differing);
    const plan = planMigration(profile, sampleIntake(), SLUG, NOW);
    assert.equal(plan.kind, 'conflict');
    if (plan.kind !== 'conflict') return;
    assert.equal(plan.conflict.path, 'auditDecisions');
    assert.deepEqual(plan.conflict.existing.value, differing);
    assert.equal(plan.conflict.candidate.source, 'operator');
    assert.deepEqual(plan.conflict.candidate.value, sampleDecisions());
    assert.equal(plan.conflict.queuedAt, NOW);
  });
});

describe('readIntake (compat reader)', () => {
  let tempBase: string;
  let prevDir: string | undefined;
  let prevSource: string | undefined;
  let warnCalls: string[];
  let originalWarn: typeof console.warn;

  function writeClientFile(name: string, body: string): void {
    writeFileSync(join(tempBase, SLUG, name), body, 'utf8');
  }

  function writeProfileFile(value: AuditDecisions | null): void {
    const profile = value === null
      ? createEmptyProfile(SLUG, '2026-01-01T00:00:00.000Z')
      : profileWithDecisions(value, { updatedAt: '2026-05-01T12:34:56.000Z' });
    writeClientFile('profile.json', `${JSON.stringify(profile, null, 2)}\n`);
  }

  beforeEach(() => {
    prevDir = process.env['UPRIVER_CLIENTS_DIR'];
    prevSource = process.env['UPRIVER_DATA_SOURCE'];
    tempBase = mkdtempSync(join(tmpdir(), 'upriver-intake-test-'));
    process.env['UPRIVER_CLIENTS_DIR'] = tempBase;
    // Pin the local data source — the CLI default is env-controlled and may be
    // `supabase` (Build Spec 03); these tests exercise the local filesystem.
    process.env['UPRIVER_DATA_SOURCE'] = 'local';
    resetClientDataSource();
    mkdirSync(join(tempBase, SLUG), { recursive: true });

    warnCalls = [];
    originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args.map((a) => String(a)).join(' '));
    };
  });

  afterEach(() => {
    if (prevDir === undefined) delete process.env['UPRIVER_CLIENTS_DIR'];
    else process.env['UPRIVER_CLIENTS_DIR'] = prevDir;
    if (prevSource === undefined) delete process.env['UPRIVER_DATA_SOURCE'];
    else process.env['UPRIVER_DATA_SOURCE'] = prevSource;
    resetClientDataSource();
    rmSync(tempBase, { recursive: true, force: true });
    console.warn = originalWarn;
  });

  it('neither: returns null with no warning', async () => {
    assert.equal(await readIntake(SLUG), null);
    assert.equal(warnCalls.length, 0);
  });

  it('legacy-only: returns the parsed legacy intake unchanged', async () => {
    const intake = sampleIntake();
    writeClientFile('intake.json', JSON.stringify(intake, null, 2));
    assert.deepEqual(await readIntake(SLUG), intake);
    assert.equal(warnCalls.length, 0);
  });

  it('legacy malformed: returns null and warns', async () => {
    writeClientFile('intake.json', '{ this is not json');
    assert.equal(await readIntake(SLUG), null);
    assert.equal(warnCalls.length, 1);
    assert.match(warnCalls[0] ?? '', /failed to parse/);
  });

  it('profile-only: reconstructs the ClientIntake from auditDecisions', async () => {
    writeProfileFile(sampleDecisions());
    assert.deepEqual(await readIntake(SLUG), sampleIntake());
  });

  it('both: prefers the profile over the legacy file', async () => {
    writeProfileFile(sampleDecisions());
    const stale: ClientIntake = { ...sampleIntake(), scopeTier: 'polish' };
    writeClientFile('intake.json', JSON.stringify(stale, null, 2));
    const result = await readIntake(SLUG);
    assert.equal(result?.scopeTier, 'rebuild');
  });

  it('profile present but auditDecisions absent: falls back to legacy', async () => {
    writeProfileFile(null);
    const intake = sampleIntake();
    writeClientFile('intake.json', JSON.stringify(intake, null, 2));
    assert.deepEqual(await readIntake(SLUG), intake);
  });
});
