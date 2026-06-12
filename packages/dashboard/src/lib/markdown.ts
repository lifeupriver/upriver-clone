/**
 * Dependency-free markdown → HTML for the dashboard's deliverable docs.
 *
 * Extracted from `components/astro/MarkdownDoc.astro` so the pipeline is unit
 * testable. The markdown is LLM/scrape-derived — i.e. untrusted — and the
 * output is injected via `set:html`, so the security contract here is strict:
 * the ENTIRE source is HTML-escaped before any transform runs. Every `<`, `>`,
 * `&`, `"`, and `'` in the input becomes an entity, which means the only tags
 * that can appear in the output are the ones this renderer generates
 * (`h1/h3/strong/code/pre/blockquote/li/ul/hr/p`). Raw `<script>` or
 * `<img onerror=…>` in a scraped/LLM doc renders as visible text, not markup.
 */

/**
 * Escape the five HTML-significant characters. `&` must be replaced first so
 * the entities produced by the later replacements aren't double-escaped.
 *
 * @param s - Untrusted text.
 * @returns The text with `& < > " '` replaced by entities.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert a markdown chunk (no `##` headings — `MarkdownDoc.astro`'s
 * `parseDoc` strips those and renders them separately) to HTML using the same
 * regex-based pipeline the dashboard has always used, applied AFTER
 * `escapeHtml` over the whole source.
 *
 * Notes on escape interactions:
 * - Code fences and inline code use backticks, which escaping leaves alone.
 * - Blockquote lines start with `>` in the source, which is `&gt;` by the
 *   time the transform runs — the regex matches the escaped form.
 * - There is intentionally no link transform: `[text](url)` renders as
 *   literal (escaped) text, so no attacker-controlled `href` (e.g.
 *   `javascript:…`) can ever reach the output.
 *
 * @param md - Untrusted markdown chunk.
 * @returns HTML safe to inject via `set:html`.
 */
export function markdownToHtml(md: string): string {
  return escapeHtml(md)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^---+$/gm, '<hr>')
    .replace(/\n\n(?!<)/g, '</p><p>')
    .replace(/^(?!<)/, '<p>')
    .replace(/(?!>)$/, '</p>')
    .replace(/(<li>[\s\S]*?<\/li>)(?:\s*<li>[\s\S]*?<\/li>)*/g, (m) => `<ul>${m}</ul>`)
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p>(<[hb])/g, '$1')
    .replace(/(<\/h[123]>)<\/p>/g, '$1');
}
