import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mintPitchShare,
  buildPitchPortalUrl,
  PITCH_SHARE_DEFAULT_DAYS,
  PITCH_SHARE_MAX_DAYS,
} from './share.js';

describe('pitch share token', () => {
  it('mints a long random token with a 14-day default expiry', () => {
    const now = new Date('2026-06-12T00:00:00.000Z');
    const share = mintPitchShare({ now });
    assert.ok(share.token.length >= 24);
    assert.equal(share.createdAt, now.toISOString());
    const days = (Date.parse(share.expiresAt) - now.getTime()) / 86400_000;
    assert.equal(days, PITCH_SHARE_DEFAULT_DAYS);
  });

  it('caps expiry at 30 days and floors it at 1', () => {
    const now = new Date('2026-06-12T00:00:00.000Z');
    const long = mintPitchShare({ now, expiresDays: 365 });
    assert.equal((Date.parse(long.expiresAt) - now.getTime()) / 86400_000, PITCH_SHARE_MAX_DAYS);
    const short = mintPitchShare({ now, expiresDays: 0 });
    assert.equal((Date.parse(short.expiresAt) - now.getTime()) / 86400_000, 1);
  });

  it('tokens are unique per mint', () => {
    assert.notEqual(mintPitchShare().token, mintPitchShare().token);
  });

  it('builds the portal URL', () => {
    assert.equal(
      buildPitchPortalUrl('https://dash.example/', 'wb', 'tok'),
      'https://dash.example/pitch/wb?t=tok',
    );
  });
});
