import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepareApproval } from './approve-core.js';
import { buildPitchEmailDraft } from './email.js';
import { createPitchState, transition, type PitchState } from './state.js';

const NOW = '2026-06-12T12:00:00.000Z';
const FUTURE = '2026-06-25T00:00:00.000Z';
const PAST = '2026-06-01T00:00:00.000Z';

const draft = buildPitchEmailDraft({
  businessName: 'Wildflour Bakery',
  previewUrl: 'https://dash.example/pitch/wb?t=abc',
  questionnaireUrl: 'https://dash.example/deliverables/wb/interview?token=def',
});

function baseOpts() {
  const state: PitchState = {
    ...createPitchState('wb', 'https://wildflour.example'),
    share: { expiresAt: FUTURE },
  };
  return {
    state,
    draft,
    to: 'owner@wildflour.example',
    from: 'reports@upriverhudsonvalley.com',
    suppressed: false,
    unsubscribeSecret: 'secret',
    dashboardBaseUrl: 'https://dash.example',
    postalAddress: '1 Main St, Kingston NY 12401',
    now: NOW,
  };
}

describe('prepareApproval refusal matrix', () => {
  it('approves a clean draft and finalizes the compliance footer', () => {
    const out = prepareApproval(baseOpts());
    assert.equal(out.kind, 'ok');
    if (out.kind !== 'ok') return;
    assert.equal(out.email.to, 'owner@wildflour.example');
    assert.match(out.email.text, /api\/unsubscribe\?token=/);
    assert.match(out.email.text, /1 Main St/);
    assert.ok(!out.email.text.includes('{{'), 'no unresolved placeholders');
  });

  it('refuses when the state is not draft/approved', () => {
    for (const status of ['sent', 'revoked', 'fidelity-fail', 'over-budget'] as const) {
      const opts = baseOpts();
      opts.state = { ...opts.state, status };
      const out = prepareApproval(opts);
      assert.equal(out.kind, 'refused', status);
      if (out.kind === 'refused') assert.match(out.reason, new RegExp(status));
    }
  });

  it('allows re-approval of an approved (not yet sent) pitch', () => {
    const opts = baseOpts();
    opts.state = transition(opts.state, 'approved');
    assert.equal(prepareApproval(opts).kind, 'ok');
  });

  it('refuses when the share token has expired', () => {
    const opts = baseOpts();
    opts.state = { ...opts.state, share: { expiresAt: PAST } };
    const out = prepareApproval(opts);
    assert.equal(out.kind, 'refused');
    if (out.kind === 'refused') assert.match(out.reason, /expired/i);
  });

  it('refuses a suppressed recipient', () => {
    const opts = { ...baseOpts(), suppressed: true };
    const out = prepareApproval(opts);
    assert.equal(out.kind, 'refused');
    if (out.kind === 'refused') assert.match(out.reason, /suppress|unsubscribed/i);
  });

  it('refuses without a recipient, secret, or postal address', () => {
    for (const patch of [{ to: '' }, { unsubscribeSecret: '' }, { postalAddress: '' }]) {
      const out = prepareApproval({ ...baseOpts(), ...patch });
      assert.equal(out.kind, 'refused', JSON.stringify(patch));
    }
  });

  it('refuses an invalid recipient address', () => {
    const out = prepareApproval({ ...baseOpts(), to: 'not-an-email' });
    assert.equal(out.kind, 'refused');
  });
});
