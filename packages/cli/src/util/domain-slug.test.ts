import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { domainToSlug } from './domain-slug.js';

describe('domainToSlug', () => {
  it('derives the registrable name from a full URL', () => {
    assert.equal(domainToSlug('https://www.wildflourbakery.com/x?y=1'), 'wildflourbakery');
  });

  it('strips www. and a common public suffix', () => {
    assert.equal(domainToSlug('https://www.audreysfarmhouse.com'), 'audreysfarmhouse');
    assert.equal(domainToSlug('http://example.org/'), 'example');
    assert.equal(domainToSlug('https://thing.co.uk'), 'thing');
  });

  it('accepts a bare domain without a scheme', () => {
    assert.equal(domainToSlug('wildflourbakery.com'), 'wildflourbakery');
  });

  it('keeps non-www subdomains as slug segments', () => {
    assert.equal(domainToSlug('https://shop.wildflour.com'), 'shop-wildflour');
  });

  it('kebab-cases hostnames with dots and digits', () => {
    assert.equal(domainToSlug('https://www.2nd-street.cafe.com'), '2nd-street-cafe');
  });

  it('is deterministic', () => {
    assert.equal(
      domainToSlug('https://www.wildflourbakery.com/a'),
      domainToSlug('https://wildflourbakery.com/b?c'),
    );
  });

  it('rejects IP-literal hosts with a clean error', () => {
    assert.throws(() => domainToSlug('https://192.168.1.10/'), /IP/i);
  });

  it('rejects punycode hosts with a clean error', () => {
    assert.throws(() => domainToSlug('https://xn--bcher-kva.example/'), /punycode|non-ascii/i);
  });

  it('rejects unparseable input with a clean error', () => {
    assert.throws(() => domainToSlug('not a url at all'), /url|domain/i);
  });

  it('always returns an assertSafeSlug-valid slug', () => {
    for (const u of [
      'https://www.wildflourbakery.com',
      'https://shop.wildflour.com',
      'https://thing.co.uk',
    ]) {
      assert.match(domainToSlug(u), /^[a-z0-9][a-z0-9-]*$/);
    }
  });
});
