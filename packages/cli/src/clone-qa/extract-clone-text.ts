import { existsSync, readFileSync } from 'node:fs';

/**
 * Read an Astro page file and return a best-effort visible-text concatenation.
 *
 * Strip strategy (in order):
 *  1. Remove the leading frontmatter block (`---\n...\n---\n`).
 *  2. Remove `<style>...</style>` and `<script>...</script>` blocks (with content).
 *  3. Remove HTML tags (`/<[^>]+>/g` -> ' ').
 *  4. Strip `{...}` JSX-style expressions (twice, to handle one level of nesting).
 *  5. Collapse whitespace runs to single spaces.
 *
 * Returns the empty string if the file is missing or unreadable.
 *
 * @param astroFilePath - Absolute path to a `.astro` file.
 * @returns Best-effort visible text extracted from the page, or `''`.
 */
export function extractCloneText(astroFilePath: string): string {
  if (!existsSync(astroFilePath)) return '';
  let src: string;
  try {
    src = readFileSync(astroFilePath, 'utf-8');
  } catch {
    return '';
  }

  // 1. Strip leading frontmatter `---\n ... \n---\n`. Astro frontmatter must be
  // the first thing in the file, so anchor with a leading `---`.
  if (src.startsWith('---')) {
    const closing = src.indexOf('\n---', 3);
    if (closing >= 0) {
      // Skip past the closing `---` and the trailing newline if present.
      const after = closing + '\n---'.length;
      src = src.slice(src.charCodeAt(after) === 0x0a ? after + 1 : after);
    }
  }

  // 2. Strip <style>...</style> and <script>...</script> with their contents.
  src = src.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  src = src.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');

  // 3. Strip HTML tags.
  src = src.replace(/<[^>]+>/g, ' ');

  // 4. Strip `{...}` JSX-style expressions. Iterate twice to handle one level
  // of nested braces; deeper nesting is a TODO.
  // TODO(roadmap): handle arbitrary brace nesting; for MVP two passes suffice.
  src = src.replace(/\{[^{}]*\}/g, ' ');
  src = src.replace(/\{[^{}]*\}/g, ' ');

  // 5. Collapse whitespace.
  src = src.replace(/\s+/g, ' ').trim();

  return src;
}
