import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { clientProfileZ } from '@upriver/schemas';

import { writeIntake } from '../src/lib/intake-writer.js';
import { sampleDecisions, sampleIntake, setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'acme-co';

describe('dashboard writeIntake (dual-write)', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    tc.seedClient(SLUG);
  });
  afterEach(() => tc.cleanup());

  it('creates a profile when none exists and folds in auditDecisions', async () => {
    await writeIntake(SLUG, sampleIntake());
    const profileText = tc.readFile(SLUG, 'profile.json');
    assert.ok(profileText);
    const profile = clientProfileZ.parse(JSON.parse(profileText));
    assert.deepEqual(profile.auditDecisions?.value, sampleDecisions());
    assert.equal(profile.auditDecisions?.source, 'operator');
    assert.equal(profile._meta.revision, 1);
  });

  it('stamps envelope.updatedAt with the intake updatedAt (the contract invariant)', async () => {
    await writeIntake(SLUG, sampleIntake());
    const profile = clientProfileZ.parse(JSON.parse(tc.readFile(SLUG, 'profile.json') as string));
    assert.equal(profile.auditDecisions?.updatedAt, sampleIntake().updatedAt);
  });

  it('mirrors a byte-for-byte legacy intake.json', async () => {
    const intake = sampleIntake();
    await writeIntake(SLUG, intake);
    assert.equal(tc.readFile(SLUG, 'intake.json'), `${JSON.stringify(intake, null, 2)}\n`);
  });

  it('bumps revision on an existing profile, never dropping the operator write', async () => {
    await writeIntake(SLUG, sampleIntake());
    const updated = { ...sampleIntake(), scopeTier: 'polish' as const, updatedAt: '2026-05-02T00:00:00.000Z' };
    await writeIntake(SLUG, updated);
    const profile = clientProfileZ.parse(JSON.parse(tc.readFile(SLUG, 'profile.json') as string));
    assert.equal(profile._meta.revision, 2);
    assert.equal(profile.auditDecisions?.value?.scopeTier, 'polish');
    assert.equal(profile.auditDecisions?.updatedAt, '2026-05-02T00:00:00.000Z');
  });
});
