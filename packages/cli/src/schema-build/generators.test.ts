import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  parseAddress,
  parseHours,
  buildLocalBusiness,
  buildFaqPage,
  buildBreadcrumb,
  localBusinessType,
} from './generators.js';

describe('schema generators', () => {
  it('parses a US address into PostalAddress fields', () => {
    const a = parseAddress('290 North St., NEWBURGH, New York 12550');
    assert.equal(a?.streetAddress, '290 North St.');
    assert.equal(a?.addressLocality, 'NEWBURGH');
    assert.equal(a?.addressRegion, 'NY');
    assert.equal(a?.postalCode, '12550');
    assert.equal(a?.addressCountry, 'US');
  });

  it('parses opening hours strings', () => {
    const h = parseHours('Monday - Friday: 9:00 am - 3:00 pm; Saturday: Closed; Sunday: Closed');
    assert.equal(h.length, 1);
    assert.equal(h[0]?.dayOfWeek, 'Mo-Fr');
    assert.equal(h[0]?.opens, '09:00');
    assert.equal(h[0]?.closes, '15:00');
  });

  it('builds a LocalBusiness JSON-LD with PostalAddress and openingHoursSpecification', () => {
    const node = buildLocalBusiness(
      {
        name: 'Test',
        url: 'https://test.com',
        telephone: '+15555550000',
        address: {
          streetAddress: '1 Main St',
          addressLocality: 'Newburgh',
          addressRegion: 'NY',
          postalCode: '12550',
          addressCountry: 'US',
        },
        hours: [{ dayOfWeek: 'Mo-Fr', opens: '09:00', closes: '17:00' }],
      },
      'preschool',
    );
    assert.ok(node);
    assert.equal(node['@type'], 'Preschool');
    assert.ok(node['address']);
    assert.ok(Array.isArray(node['openingHoursSpecification']));
  });

  it('falls back to LocalBusiness for unknown verticals', () => {
    assert.equal(localBusinessType(undefined), 'LocalBusiness');
    assert.equal(localBusinessType('mystery'), 'LocalBusiness');
  });

  it('builds an FAQPage with question/answer pairs', () => {
    const node = buildFaqPage(
      [
        { question: 'Do you offer tours?', answer: 'Yes, every Friday.' },
        { question: 'What is the price?', answer: 'It varies.' },
      ],
      'https://test.com/faq',
    );
    assert.ok(node);
    assert.equal(node['@type'], 'FAQPage');
    assert.equal((node['mainEntity'] as unknown[]).length, 2);
  });

  it('returns null when no FAQs are present', () => {
    assert.equal(buildFaqPage([], 'https://test.com/faq'), null);
  });

  it('builds a BreadcrumbList with positions', () => {
    const node = buildBreadcrumb([
      { name: 'Home', url: 'https://test.com/' },
      { name: 'About', url: 'https://test.com/about' },
    ]);
    assert.ok(node);
    const items = node!['itemListElement'] as Array<{ position: number }>;
    assert.equal(items[0]?.position, 1);
    assert.equal(items[1]?.position, 2);
  });
});
