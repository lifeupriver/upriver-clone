import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { VERTICALS } from '@upriver/core';

import { getVerticalPack } from './vertical-pack.js';

const NEW_VERTICALS = ['retail', 'home-services', 'medical', 'fitness', 'nonprofit'] as const;

describe('vertical packs', () => {
  it('resolves a distinct pack for every vertical in the core VERTICALS tuple', () => {
    const nouns = VERTICALS.map((v) => getVerticalPack(v).noun);
    assert.equal(new Set(nouns).size, VERTICALS.length, 'every vertical should map to its own pack');
  });

  it('falls back to generic for unknown or missing verticals', () => {
    assert.equal(getVerticalPack(undefined).noun, getVerticalPack('generic').noun);
    assert.equal(getVerticalPack('florist').noun, getVerticalPack('generic').noun);
    assert.equal(getVerticalPack('').noun, getVerticalPack('generic').noun);
  });

  it('new packs follow the existing shape and depth', () => {
    for (const v of NEW_VERTICALS) {
      const pack = getVerticalPack(v);
      assert.notEqual(pack.noun, getVerticalPack('generic').noun, `${v} must not fall through to generic`);
      assert.ok(
        pack.expectedTopics.length >= 8 && pack.expectedTopics.length <= 12,
        `${v}: expected 8-12 topics, got ${pack.expectedTopics.length}`,
      );
      assert.ok(pack.expectedPages.length >= 7, `${v}: expected pages list too thin`);
      assert.ok(pack.expectedPages.some((p) => p.priority === 'p0'), `${v}: needs at least one p0 expected page`);
      assert.ok(pack.directories.length >= 4, `${v}: needs at least 4 directories`);
      const copyFields = [
        pack.noun,
        pack.buyer,
        pack.exampleBuyerQuestion,
        pack.searchQueryExample,
        pack.rankingPhraseTemplate,
        pack.socialProofWhy,
        pack.faqWhy,
        pack.mobileWhy,
        pack.bannedWordExample,
        pack.entityDisambiguationExample,
      ];
      for (const field of copyFields) {
        assert.ok(typeof field === 'string' && field.trim().length > 0, `${v}: empty copy field`);
        assert.doesNotMatch(field, /\b(wedding|bridal|couples)\b/i, `${v}: wedding vocabulary leaked into copy`);
        assert.doesNotMatch(field, /lorem|placeholder|tbd|todo/i, `${v}: placeholder text in copy`);
      }
    }
  });

  it('new pack directories point at the expected industry profiles', () => {
    const labels = (v: string) => getVerticalPack(v).directories.map((d) => d.label).join(' ');
    assert.match(labels('retail'), /Google Shopping/);
    assert.match(labels('home-services'), /Angi/);
    assert.match(labels('home-services'), /Thumbtack/);
    assert.match(labels('medical'), /Zocdoc/);
    assert.match(labels('medical'), /Healthgrades/);
    assert.match(labels('fitness'), /ClassPass/);
    assert.match(labels('fitness'), /Mindbody/);
    assert.match(labels('nonprofit'), /GuideStar|Candid/);
    assert.match(labels('nonprofit'), /Charity Navigator/);
  });

  it('directory patterns match real profile URLs', () => {
    const matches = (v: string, url: string) =>
      getVerticalPack(v).directories.some((d) => d.pattern.test(url));
    assert.ok(matches('home-services', 'https://www.angi.com/companylist/us/tx/austin/acme.htm'));
    assert.ok(matches('home-services', 'https://www.bbb.org/us/tx/austin/profile/plumber/acme'));
    assert.ok(matches('medical', 'https://www.zocdoc.com/practice/lakeview-dental-12345'));
    assert.ok(matches('fitness', 'https://classpass.com/studios/ironworks-boise'));
    assert.ok(matches('nonprofit', 'https://www.guidestar.org/profile/12-3456789'));
    assert.ok(matches('retail', 'https://shopping.google.com/merchant/forge-filament'));
  });
});
