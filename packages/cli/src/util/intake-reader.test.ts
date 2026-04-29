import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ClientIntake } from '@upriver/core';

import { readIntake } from './intake-reader.js';

const SLUG = 'acme-co';

let tempBase: string;
let prevEnv: string | undefined;
let warnCalls: string[];
let originalWarn: typeof console.warn;

describe('intake-reader', () => {
  beforeEach(() => {
    prevEnv = process.env['UPRIVER_CLIENTS_DIR'];
    tempBase = mkdtempSync(join(tmpdir(), 'upriver-intake-test-'));
    process.env['UPRIVER_CLIENTS_DIR'] = tempBase;
    mkdirSync(join(tempBase, SLUG), { recursive: true });

    warnCalls = [];
    originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args.map((a) => String(a)).join(' '));
    };
  });

  afterEach(() => {
    if (prevEnv === undefined) {
      delete process.env['UPRIVER_CLIENTS_DIR'];
    } else {
      process.env['UPRIVER_CLIENTS_DIR'] = prevEnv;
    }
    rmSync(tempBase, { recursive: true, force: true });
    console.warn = originalWarn;
  });

  it('returns null when the intake file is missing', () => {
    const result = readIntake(SLUG);
    assert.equal(result, null);
    assert.equal(warnCalls.length, 0, 'should not warn when file is simply missing');
  });

  it('returns null and warns when the intake file is malformed JSON', () => {
    writeFileSync(join(tempBase, SLUG, 'intake.json'), '{ this is not json', 'utf8');
    const result = readIntake(SLUG);
    assert.equal(result, null);
    assert.equal(warnCalls.length, 1, 'expected exactly one warning');
    assert.match(warnCalls[0] ?? '', /failed to parse/);
  });

  it('returns the parsed intake when the file is valid JSON', () => {
    const intake: ClientIntake = {
      version: 1,
      findingDecisions: { 'seo-001': 'fix', 'seo-002': 'skip' },
      pageWants: { home: 'Hero feels too corporate.' },
      referenceSites: ['https://example.com'],
      scopeTier: 'rebuild',
      submittedAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:00:00.000Z',
    };
    writeFileSync(
      join(tempBase, SLUG, 'intake.json'),
      JSON.stringify(intake, null, 2),
      'utf8',
    );
    const result = readIntake(SLUG);
    assert.deepEqual(result, intake);
    assert.equal(warnCalls.length, 0);
  });
});
