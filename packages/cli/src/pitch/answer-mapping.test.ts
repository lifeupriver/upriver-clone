import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';
import { ANSWER_FIELD_MAP, applyProspectAnswers } from './answer-mapping.js';

const NOW = '2026-06-12T00:00:00.000Z';

/* eslint-disable @typescript-eslint/no-explicit-any */
function envelopeAt(profile: ClientProfile, path: string): ProfileField<unknown> | undefined {
  let cur: any = profile;
  for (const seg of path.split('.')) cur = cur?.[seg];
  return cur;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('applyProspectAnswers', () => {
  it('fills empty profile fields from answers with source: interview', () => {
    const profile = createEmptyProfile('wb', NOW);
    const { profile: out, outcomes } = applyProspectAnswers(
      profile,
      {
        'about-you-q3': 'joshua@wildflour.example',
        'about-you-q4': '(555) 010-1234',
        'your-goals-q1': 'More wholesale orders',
      },
      NOW,
    );
    const email = envelopeAt(out, 'identity.email');
    assert.equal(email?.value, 'joshua@wildflour.example');
    assert.equal(email?.source, 'interview');
    assert.equal(envelopeAt(out, 'identity.phone')?.value, '(555) 010-1234');
    assert.equal(envelopeAt(out, 'goals.primaryOutcome')?.value, 'More wholesale orders');
    assert.equal(outcomes.filter((o) => o.kind === 'filled').length, 3);
  });

  it('never overwrites a verified value — queues a conflict instead', () => {
    const profile = createEmptyProfile('wb', NOW);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (profile as any).identity ??= {};
    (profile as any).identity.email = {
      value: 'verified@wildflour.example',
      source: 'operator',
      confidence: null,
      verified: true,
      updatedAt: NOW,
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const { profile: out, conflicts } = applyProspectAnswers(
      profile,
      { 'about-you-q3': 'different@wildflour.example' },
      NOW,
    );
    assert.equal(envelopeAt(out, 'identity.email')?.value, 'verified@wildflour.example');
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]?.path, 'identity.email');
  });

  it('skips unmapped ids and empty answers', () => {
    const profile = createEmptyProfile('wb', NOW);
    const { outcomes } = applyProspectAnswers(
      profile,
      { 'your-reaction-q1': 'Love it!', 'about-you-q3': '   ', 'not-a-real-id': 'x' },
      NOW,
    );
    assert.equal(outcomes.length, 0);
  });

  it('input profile is not mutated', () => {
    const profile = createEmptyProfile('wb', NOW);
    applyProspectAnswers(profile, { 'about-you-q3': 'a@b.example' }, NOW);
    assert.equal(envelopeAt(profile, 'identity.email')?.value ?? null, null);
  });

  it('every mapped path is a real string field (structural validity is enforced)', () => {
    const profile = createEmptyProfile('wb', NOW);
    const answers: Record<string, string> = {};
    for (const id of Object.keys(ANSWER_FIELD_MAP)) answers[id] = 'some plausible answer';
    const { outcomes } = applyProspectAnswers(profile, answers, NOW);
    assert.equal(outcomes.filter((o) => o.kind === 'filled').length, Object.keys(ANSWER_FIELD_MAP).length);
  });
});
