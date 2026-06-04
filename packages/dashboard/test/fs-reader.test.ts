import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { readIntake } from '../src/lib/fs-reader.js';
import { sampleDecisions, sampleIntake, setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'acme-co';

describe('dashboard readIntake (compat)', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    tc.seedClient(SLUG);
  });
  afterEach(() => tc.cleanup());

  it('neither: returns null', async () => {
    assert.equal(await readIntake(SLUG), null);
  });

  it('legacy-only: returns the parsed legacy intake unchanged', async () => {
    const intake = sampleIntake();
    tc.writeFile(SLUG, 'intake.json', JSON.stringify(intake, null, 2));
    assert.deepEqual(await readIntake(SLUG), intake);
  });

  it('profile-only: reconstructs the ClientIntake from auditDecisions', async () => {
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    assert.deepEqual(await readIntake(SLUG), sampleIntake());
  });

  it('both: prefers the profile over the legacy file', async () => {
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    tc.writeFile(SLUG, 'intake.json', JSON.stringify({ ...sampleIntake(), scopeTier: 'polish' }, null, 2));
    const result = await readIntake(SLUG);
    assert.equal(result?.scopeTier, 'rebuild');
  });

  it('profile without auditDecisions: falls back to legacy', async () => {
    // A profile.json with no auditDecisions section.
    tc.writeFile(
      SLUG,
      'profile.json',
      JSON.stringify(
        { _meta: { version: 1, slug: SLUG, createdAt: 'x', updatedAt: 'x', revision: 1 } },
        null,
        2,
      ),
    );
    const intake = sampleIntake();
    tc.writeFile(SLUG, 'intake.json', JSON.stringify(intake, null, 2));
    assert.deepEqual(await readIntake(SLUG), intake);
  });
});
