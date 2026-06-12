import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { escapeHtml, markdownToHtml } from '../src/lib/markdown.js';

// The markdown rendered by MarkdownDoc.astro is LLM/scrape-derived and lands
// in `set:html`, so the renderer's contract is: escape the ENTIRE source
// first, then transform — the only tags in the output are renderer-generated.
describe('markdownToHtml — stored-XSS hardening', () => {
  it('neutralizes a raw <script> tag (escaped text, no script element)', () => {
    const out = markdownToHtml('hello\n\n<script>alert(1)</script>\n\nbye');
    assert.ok(!out.includes('<script'), 'no <script tag may survive');
    assert.ok(out.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'renders as escaped text');
  });

  it('neutralizes an <img onerror=…> payload', () => {
    const out = markdownToHtml('before <img src=x onerror=alert(1)> after');
    assert.ok(!out.includes('<img'), 'no <img tag may survive');
    assert.ok(out.includes('&lt;img src=x onerror=alert(1)&gt;'), 'renders as escaped text');
  });

  it('neutralizes attribute-breakout characters (quotes) and event handlers', () => {
    const out = markdownToHtml(`"><svg onload='alert(1)'>`);
    assert.ok(!out.includes('<svg'), 'no <svg tag may survive');
    assert.ok(!out.includes(`'alert`), 'single quotes are escaped');
    assert.ok(!out.includes('">'), 'double quotes are escaped');
  });

  it('a payload smuggled inside markdown structures stays escaped', () => {
    const out = markdownToHtml('### <script>x</script>\n\n- <img src=x onerror=y>\n\n> <iframe>');
    assert.ok(!out.includes('<script'));
    assert.ok(!out.includes('<img'));
    assert.ok(!out.includes('<iframe'));
    // The structural transforms still fire around the escaped payloads.
    assert.ok(out.includes('<h3>&lt;script&gt;x&lt;/script&gt;</h3>'));
    assert.ok(out.includes('<li>&lt;img src=x onerror=y&gt;</li>'));
    assert.ok(out.includes('<blockquote>&lt;iframe&gt;</blockquote>'));
  });

  it('still renders normal markdown: headings, bold, code, lists, hr', () => {
    const out = markdownToHtml(
      '# Title\n\n### Sub\n\nSome **bold** and `code`.\n\n- one\n- two\n\n1. first\n\n---',
    );
    assert.ok(out.includes('<h1>Title</h1>'));
    assert.ok(out.includes('<h3>Sub</h3>'));
    assert.ok(out.includes('<strong>bold</strong>'));
    assert.ok(out.includes('<code>code</code>'));
    assert.ok(out.includes('<ul><li>one</li>'));
    assert.ok(out.includes('<li>two</li>'));
    assert.ok(out.includes('<li>first</li></ul>'));
    assert.ok(out.includes('<hr>'));
  });

  it('still renders blockquotes (the > is escaped before the transform runs)', () => {
    const out = markdownToHtml('> A quoted line');
    assert.ok(out.includes('<blockquote>A quoted line</blockquote>'));
  });

  it('keeps fenced-code contents escaped (backticks themselves are unaffected by escaping)', () => {
    const out = markdownToHtml('```js\nconst a = "<b>" && 1;\n```');
    assert.ok(out.includes('<code>'), 'fence contents still land in a code element');
    assert.ok(out.includes('&lt;b&gt;'), 'tags inside fences are escaped');
    assert.ok(!out.includes('<b>'), 'no raw tag leaks out of a fence');
  });

  it('does not emit a javascript: href for a markdown link', () => {
    const out = markdownToHtml("[x](javascript:alert(1)) and [y](javascript:alert('p'))");
    assert.ok(!/href\s*=\s*["']?javascript:/i.test(out), 'no javascript: href');
    assert.ok(!out.includes('<a '), 'no anchor is generated from untrusted markdown');
    assert.ok(out.includes('[x](javascript:alert(1))'), 'link syntax renders as inert text');
  });

  it('literal entities in the source are not double-decoded into markup', () => {
    const out = markdownToHtml('&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.ok(!out.includes('<script'));
    assert.ok(out.includes('&amp;lt;script&amp;gt;'), 'source entities stay inert text');
  });
});

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  });

  it('escapes & first so entities are not double-escaped', () => {
    assert.equal(escapeHtml('&amp;'), '&amp;amp;');
  });
});
