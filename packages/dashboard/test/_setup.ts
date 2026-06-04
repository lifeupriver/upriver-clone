import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createEmptyProfile,
  type AuditDecisions,
  type AuditDecisionsSection,
  type ClientProfile,
} from '@upriver/schemas';

import { resetClientDataSource } from '../src/lib/data-source.js';

/**
 * A throwaway `clients/` tree on a temp dir, wired to the local data source via
 * `UPRIVER_CLIENTS_DIR`. The data-source resolver is memoized, so we reset it on
 * both setup and teardown.
 */
export interface TempClients {
  base: string;
  seedClient(slug: string): void;
  writeFile(slug: string, name: string, body: string): void;
  readFile(slug: string, name: string): string | null;
  /** Write a profile.json carrying an auditDecisions section. */
  writeProfile(slug: string, value: AuditDecisions, envelopeUpdatedAt: string): void;
  cleanup(): void;
}

export function setupTempClients(): TempClients {
  const prevDir = process.env['UPRIVER_CLIENTS_DIR'];
  const prevSource = process.env['UPRIVER_DATA_SOURCE'];
  const base = mkdtempSync(join(tmpdir(), 'upriver-dash-test-'));
  process.env['UPRIVER_CLIENTS_DIR'] = base;
  // Pin the local data source explicitly (the default is env-controlled).
  process.env['UPRIVER_DATA_SOURCE'] = 'local';
  resetClientDataSource();

  return {
    base,
    seedClient(slug: string): void {
      mkdirSync(join(base, slug), { recursive: true });
      writeFileSync(join(base, slug, 'client-config.yaml'), `slug: ${slug}\nname: Test ${slug}\n`, 'utf8');
    },
    writeFile(slug: string, name: string, body: string): void {
      mkdirSync(join(base, slug), { recursive: true });
      writeFileSync(join(base, slug, name), body, 'utf8');
    },
    readFile(slug: string, name: string): string | null {
      const p = join(base, slug, name);
      return existsSync(p) ? readFileSync(p, 'utf8') : null;
    },
    writeProfile(slug: string, value: AuditDecisions, envelopeUpdatedAt: string): void {
      const profile: ClientProfile = createEmptyProfile(slug, '2026-01-01T00:00:00.000Z');
      profile._meta.revision = 1;
      const section: AuditDecisionsSection = {
        value,
        source: 'operator',
        confidence: 'high',
        verified: false,
        updatedAt: envelopeUpdatedAt,
      };
      mkdirSync(join(base, slug), { recursive: true });
      writeFileSync(
        join(base, slug, 'profile.json'),
        `${JSON.stringify({ ...profile, auditDecisions: section }, null, 2)}\n`,
        'utf8',
      );
    },
    cleanup(): void {
      if (prevDir === undefined) delete process.env['UPRIVER_CLIENTS_DIR'];
      else process.env['UPRIVER_CLIENTS_DIR'] = prevDir;
      if (prevSource === undefined) delete process.env['UPRIVER_DATA_SOURCE'];
      else process.env['UPRIVER_DATA_SOURCE'] = prevSource;
      resetClientDataSource();
      rmSync(base, { recursive: true, force: true });
    },
  };
}

/** A representative populated intake used across the route/compat tests. */
export function sampleIntake() {
  return {
    version: 1 as const,
    findingDecisions: { 'seo-001': 'fix' as const, 'seo-002': 'skip' as const },
    pageWants: { home: 'Warmer hero.' },
    referenceSites: ['https://example.com'],
    scopeTier: 'rebuild' as const,
    submittedAt: '2026-04-28T00:00:00.000Z',
    updatedAt: '2026-05-01T12:34:56.000Z',
  };
}

export function sampleDecisions(): AuditDecisions {
  return {
    findingDecisions: { 'seo-001': 'fix', 'seo-002': 'skip' },
    pageWants: { home: 'Warmer hero.' },
    referenceSites: ['https://example.com'],
    scopeTier: 'rebuild',
    submittedAt: '2026-04-28T00:00:00.000Z',
  };
}
